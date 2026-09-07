package com.serverhub.cloud;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * サーバーのレスポンスにクラウド連携情報を埋めるための<b>読み取り専用</b>ヘルパー （設計 07-aws-ec2-integration §6.2）。
 *
 * <p>{@code server} 層はこれ 1 つだけに依存する（{@code cloud} 層の書き込み系や {@code ServerDao} には依存しない）。 依存は {@link
 * ServerCloudLinkDao} と {@link CloudProperties} のみ。
 */
@Component
public class CloudLinkReader {

  private final ServerCloudLinkDao linkDao;
  private final CloudProperties properties;

  public CloudLinkReader(ServerCloudLinkDao linkDao, CloudProperties properties) {
    this.linkDao = linkDao;
    this.properties = properties;
  }

  /** サーバー詳細用（1 件）。紐付けが無ければ {@link Optional#empty()}。 */
  public Optional<CloudLinkResponse> findForDetail(Long serverId) {
    return linkDao
        .selectByServerId(serverId)
        .map(
            link ->
                CloudLinkResponse.from(link, properties.stalenessThreshold(), LocalDateTime.now()));
  }

  /** サーバー一覧用。{@code serverId -> link}（N+1 回避のため一括取得）。 */
  public Map<Long, ServerCloudLink> findByServerIds(List<Long> serverIds) {
    if (serverIds.isEmpty()) {
      return Map.of();
    }
    return linkDao.selectByServerIds(serverIds).stream()
        .collect(Collectors.toMap(ServerCloudLink::serverId, Function.identity()));
  }
}
