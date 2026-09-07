package com.serverhub.common.error;

/**
 * エラーコードの一覧（Q3、詳細設計 01-common §3 で確定）。
 *
 * <p>単一のフラットな名前空間で管理する。新しいコードが必要になった場合は、まず既存コードで表現 できないか確認したうえでここに追加する（01-common §3.2）。値の変更・削除は API
 * の破壊的変更に あたるため慎重に行う。
 */
public final class ErrorCode {

  public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
  public static final String RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND";
  public static final String DUPLICATE_HOSTNAME = "DUPLICATE_HOSTNAME";
  public static final String OPTIMISTIC_LOCK_CONFLICT = "OPTIMISTIC_LOCK_CONFLICT";
  public static final String AUTH_REQUIRED = "AUTH_REQUIRED";
  public static final String AUTH_BAD_CREDENTIALS = "AUTH_BAD_CREDENTIALS";
  public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

  /** クラウド連携: 別サーバーが同じインスタンス ID を使用中（FR-CLOUD-01、07-aws-ec2-integration §6.6）。 */
  public static final String CLOUD_LINK_CONFLICT = "CLOUD_LINK_CONFLICT";

  /** クラウド連携: provider 全体に問い合わせできない（未設定・全断）。個別取得失敗は含まない。 */
  public static final String CLOUD_PROVIDER_UNAVAILABLE = "CLOUD_PROVIDER_UNAVAILABLE";

  private ErrorCode() {}
}
