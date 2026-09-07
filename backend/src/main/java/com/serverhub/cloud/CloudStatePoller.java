package com.serverhub.cloud;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 紐付け済みインスタンスの実行状態を定期取得して {@code server_cloud_links} にキャッシュする （FR-CLOUD-01、設計
 * 07-aws-ec2-integration §6.3）。
 *
 * <p>{@code serverhub.cloud.enabled=true} のときだけ Bean 化・スケジュール登録される（ローカル・CI は無効）。
 *
 * <p><b>厳守:</b> 更新先は {@code server_cloud_links} のみ。{@code servers} / {@code servers.status} には触れない。
 * AWS 呼び出しが失敗しても状態は据え置き、{@code last_error} を書くだけ（管理ステータスは変えない、C2/C6）。
 */
@Component
@ConditionalOnProperty(prefix = "serverhub.cloud", name = "enabled", havingValue = "true")
public class CloudStatePoller {

  private static final Logger log = LoggerFactory.getLogger(CloudStatePoller.class);

  private final ServerCloudLinkDao dao;
  private final CloudStateProvider provider;
  private final CloudProperties properties;

  public CloudStatePoller(
      ServerCloudLinkDao dao, CloudStateProvider provider, CloudProperties properties) {
    this.dao = dao;
    this.provider = provider;
    this.properties = properties;
  }

  /** 間隔は {@code serverhub.cloud.poll-interval}（ISO-8601 Duration、既定 PT5M）。前回完了から測る。 */
  @Scheduled(fixedDelayString = "${serverhub.cloud.poll-interval:PT5M}")
  public void poll() {
    List<ServerCloudLink> links = dao.selectLinkedToActiveServers();
    if (links.isEmpty()) {
      return;
    }
    int batchSize = properties.aws().batchSize();
    // provider は当面 aws_ec2 のみ。リージョンごとにまとめて問い合わせる。
    Map<String, List<ServerCloudLink>> byRegion = new LinkedHashMap<>();
    for (ServerCloudLink link : links) {
      if (link.provider() == CloudProvider.AWS_EC2) {
        byRegion.computeIfAbsent(regionOf(link), r -> new ArrayList<>()).add(link);
      }
    }

    int ok = 0;
    int gone = 0;
    int failed = 0;
    for (Map.Entry<String, List<ServerCloudLink>> entry : byRegion.entrySet()) {
      String region = entry.getKey();
      List<ServerCloudLink> regionLinks = entry.getValue();
      for (int i = 0; i < regionLinks.size(); i += batchSize) {
        List<ServerCloudLink> batch =
            regionLinks.subList(i, Math.min(i + batchSize, regionLinks.size()));
        List<String> ids = batch.stream().map(ServerCloudLink::externalId).toList();
        LocalDateTime now = LocalDateTime.now();
        try {
          Map<String, String> raw = provider.describeStates(region, ids);
          for (ServerCloudLink link : batch) {
            String rawState = raw.get(link.externalId());
            if (rawState == null) {
              dao.updateState(link.id(), CloudInstanceState.GONE, null, now);
              gone++;
            } else {
              dao.updateState(link.id(), CloudStateMapper.fromEc2(rawState), rawState, now);
              ok++;
            }
          }
        } catch (RuntimeException e) {
          // provider 全体の失敗: 状態は据え置き、last_error のみ記録（C5/C6）
          String message = truncate(e.getMessage());
          for (ServerCloudLink link : batch) {
            dao.updateStateError(link.id(), message, now);
          }
          failed += batch.size();
          log.warn(
              "cloud state poll failed for region {} ({} links): {}",
              region,
              batch.size(),
              message);
        }
      }
    }
    log.info("cloud state poll done: ok={}, gone={}, failed={}", ok, gone, failed);
  }

  private String regionOf(ServerCloudLink link) {
    return (link.region() == null || link.region().isBlank())
        ? properties.aws().region()
        : link.region();
  }

  private static String truncate(String s) {
    if (s == null) {
      return "unknown error";
    }
    return s.length() <= 500 ? s : s.substring(0, 497) + "...";
  }
}
