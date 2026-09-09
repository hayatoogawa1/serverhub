package com.serverhub.cloud;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 紐付け済みインスタンスの実行状態を定期取得して {@code server_cloud_links} にキャッシュする （FR-CLOUD-01、設計
 * 07-aws-ec2-integration §6.3）。
 *
 * <p>{@code serverhub.cloud.enabled=true} のときだけ Bean 化・スケジュール登録される（ローカル・CI は無効）。 実処理は {@link
 * CloudStateRefresher}（手動一括更新と共用）。
 */
@Component
@ConditionalOnProperty(prefix = "serverhub.cloud", name = "enabled", havingValue = "true")
public class CloudStatePoller {

  private static final Logger log = LoggerFactory.getLogger(CloudStatePoller.class);

  private final CloudStateRefresher refresher;

  public CloudStatePoller(CloudStateRefresher refresher) {
    this.refresher = refresher;
  }

  /** 間隔は {@code serverhub.cloud.poll-interval}（ISO-8601 Duration、既定 PT5M）。前回完了から測る。 */
  @Scheduled(fixedDelayString = "${serverhub.cloud.poll-interval:PT5M}")
  public void poll() {
    try {
      CloudRefreshSummary s = refresher.refreshAll();
      log.info(
          "cloud state poll done: total={}, updated={}, gone={}, failed={}",
          s.total(),
          s.updated(),
          s.notFound(),
          s.failed());
    } catch (CloudProviderUnavailableException e) {
      // enabled=true でこの Bean が生きているのに provider 無効は通常起きないが、防御的に握る
      log.warn("cloud state poll skipped: provider unavailable ({})", e.getMessage());
    }
  }
}
