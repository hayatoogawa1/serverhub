package com.serverhub.cloud;

/**
 * クラウド provider 全体に問い合わせできない状態（設定で無効・認証構成なし・全断など）を表す （FR-CLOUD-01、設計 07-aws-ec2-integration §5
 * P15）。
 *
 * <p>個々のインスタンスの取得失敗はこの例外ではなく {@code server_cloud_links.last_error} で表現する。 この例外は「今すぐ更新（refresh）」で
 * provider 自体が使えないときに {@code 503 CLOUD_PROVIDER_UNAVAILABLE} へマッピングされる（9-3）。ポーラーはこの例外を握り、次周期まで待つ。
 */
public class CloudProviderUnavailableException extends RuntimeException {

  public CloudProviderUnavailableException(String message) {
    super(message);
  }

  public CloudProviderUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }
}
