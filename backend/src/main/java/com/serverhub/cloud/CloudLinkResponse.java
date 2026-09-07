package com.serverhub.cloud;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * クラウド連携の状態（{@code ServerDetailResponse.cloudLink}、{@code PUT/POST /servers/{id}/cloud-link} の戻り）。
 *
 * <p><b>管理ステータス（{@code servers.status}）とは別物。</b>これは「観測された実行状態」。
 *
 * @param state provider 横断の正規化値（{@code running} 等）。未取得は {@code null}
 * @param stateRaw provider の生値
 * @param stateFetchedAt 最後に取得に成功した時刻。UI は「最終取得 HH:MM」を出す
 * @param stale {@code stateFetchedAt} が鮮度閾値を超えている（情報が古い可能性）
 * @param lastError 直近の取得失敗理由（成功していれば {@code null}）。値があっても {@code state} は最後の成功値
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CloudLinkResponse(
    String provider,
    String externalId,
    String region,
    String state,
    String stateRaw,
    LocalDateTime stateFetchedAt,
    boolean stale,
    String lastError) {

  public static CloudLinkResponse from(
      ServerCloudLink link, Duration stalenessThreshold, LocalDateTime now) {
    boolean stale =
        link.stateFetchedAt() != null
            && Duration.between(link.stateFetchedAt(), now).compareTo(stalenessThreshold) > 0;
    return new CloudLinkResponse(
        link.provider().value(),
        link.externalId(),
        link.region(),
        link.state() == null ? null : link.state().value(),
        link.stateRaw(),
        link.stateFetchedAt(),
        stale,
        link.lastError());
  }
}
