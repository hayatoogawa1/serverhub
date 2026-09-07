package com.serverhub.cloud;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AWS EC2 実行状態参照の設定（FR-CLOUD-01、設計 07-aws-ec2-integration §6.4）。
 *
 * <p>既定は<b>無効</b>。ローカル・CI では {@code enabled=false} のまま（AWS を一切呼ばない）。
 *
 * @param enabled provider を有効化するか（{@code false} なら {@link DisabledCloudStateProviderImpl} + ポーラー停止）
 * @param pollInterval ポーリング間隔（ISO-8601 Duration、例 {@code PT5M}）
 * @param stalenessThreshold この時間を超えて未取得なら UI で「情報が古い可能性」を表示（レスポンスの {@code stale}）
 * @param aws AWS 固有設定
 */
@ConfigurationProperties(prefix = "serverhub.cloud")
public record CloudProperties(
    boolean enabled, Duration pollInterval, Duration stalenessThreshold, Aws aws) {

  public CloudProperties {
    if (pollInterval == null) {
      pollInterval = Duration.ofMinutes(5);
    }
    if (stalenessThreshold == null) {
      stalenessThreshold = Duration.ofMinutes(15);
    }
    if (aws == null) {
      aws = new Aws(null, 0);
    }
  }

  /**
   * @param region 単一リージョン（当面 {@code ap-northeast-1} 固定、P12）
   * @param batchSize 1 回の DescribeInstances で問い合わせるインスタンス数（AWS 上限 100）
   */
  public record Aws(String region, int batchSize) {
    public Aws {
      if (region == null || region.isBlank()) {
        region = "ap-northeast-1";
      }
      if (batchSize <= 0 || batchSize > 100) {
        batchSize = 100;
      }
    }
  }
}
