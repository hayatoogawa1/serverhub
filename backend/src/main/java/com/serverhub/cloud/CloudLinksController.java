package com.serverhub.cloud;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * クラウド連携（cloud-link）のコレクションレベル操作（FR-CLOUD-01）。
 *
 * <p>個別サーバーの操作は {@link CloudLinkController}（{@code /servers/{id}/cloud-link}）。 こちらは横断的な一括操作のみ。
 * <b>参照のみ。</b>EC2 の起動・停止などの操作は提供しない（C7）。
 */
@RestController
@RequestMapping("/api/v1/servers/cloud-links")
public class CloudLinksController {

  private final CloudStateRefresher refresher;

  public CloudLinksController(CloudStateRefresher refresher) {
    this.refresher = refresher;
  }

  /**
   * 紐付け済み（かつアクティブなサーバーの）全インスタンスの実行状態をまとめて即時取得する （{@code POST /servers/cloud-links/refresh}）。
   *
   * <p>個別インスタンスの取得失敗（AWS 断など）は {@code failed} に計上して {@code 200} を返す（P8 と同じ）。 provider 自体が無効な場合のみ
   * {@code 503 CLOUD_PROVIDER_UNAVAILABLE}（{@link CloudExceptionHandler}）。
   */
  @PostMapping("/refresh")
  public CloudRefreshSummary refreshAll() {
    return refresher.refreshAll();
  }
}
