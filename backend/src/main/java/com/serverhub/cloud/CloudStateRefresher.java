package com.serverhub.cloud;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 紐付け済みインスタンスの実行状態を一括取得して {@code server_cloud_links} にキャッシュする （FR-CLOUD-01、設計
 * 07-aws-ec2-integration §6.3）。
 *
 * <p>{@link CloudStatePoller}（定期実行）と {@link CloudLinksController}（一覧からの手動一括更新） の共通処理。トランザクションは張らない
 * — AWS 呼び出しを含む長い処理を 1 つの Tx に閉じ込めない。 各 {@code dao.updateState/updateStateError} が個別にコミットされる。
 *
 * <p><b>厳守:</b> 更新先は {@code server_cloud_links} のみ。{@code servers} / {@code servers.status} には触れない
 * （C2/C6）。AWS 呼び出しが失敗しても状態は据え置き、{@code last_error} を書くだけ（C5）。
 */
@Component
public class CloudStateRefresher {

  private static final Logger log = LoggerFactory.getLogger(CloudStateRefresher.class);

  private final ServerCloudLinkDao dao;
  private final CloudStateProvider provider;
  private final CloudProperties properties;

  public CloudStateRefresher(
      ServerCloudLinkDao dao, CloudStateProvider provider, CloudProperties properties) {
    this.dao = dao;
    this.provider = provider;
    this.properties = properties;
  }

  /**
   * アクティブなサーバーに紐付く全インスタンスの実行状態を取得してキャッシュ更新する。
   *
   * <p>個別インスタンスの取得失敗（AWS 断など）は握って {@code failed} に計上し、処理は続行する（P8 と同じ思想）。
   *
   * @throws CloudProviderUnavailableException provider 自体が無効（未設定）。呼び出し側は {@code 503} に変換する
   */
  public CloudRefreshSummary refreshAll() {
    if (!provider.isEnabled()) {
      throw new CloudProviderUnavailableException("cloud state provider is not configured");
    }

    List<ServerCloudLink> links = dao.selectLinkedToActiveServers();
    if (links.isEmpty()) {
      return CloudRefreshSummary.EMPTY;
    }

    int batchSize = properties.aws().batchSize();
    // provider は当面 aws_ec2 のみ。リージョンごとにまとめて問い合わせる。
    Map<String, List<ServerCloudLink>> byRegion = new LinkedHashMap<>();
    for (ServerCloudLink link : links) {
      if (link.provider() == CloudProvider.AWS_EC2) {
        byRegion.computeIfAbsent(regionOf(link), r -> new ArrayList<>()).add(link);
      }
    }

    int updated = 0;
    int notFound = 0;
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
              notFound++;
            } else {
              dao.updateState(link.id(), CloudStateMapper.fromEc2(rawState), rawState, now);
              updated++;
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
              "cloud state refresh failed for region {} ({} links): {}",
              region,
              batch.size(),
              message);
        }
      }
    }
    return new CloudRefreshSummary(links.size(), updated, notFound, failed);
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
