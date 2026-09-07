package com.serverhub.cloud;

import java.util.Collection;
import java.util.Map;

/**
 * 外部クラウドから「観測された実行状態の生値」を取得する（FR-CLOUD-01、設計 07-aws-ec2-integration §6.2）。
 *
 * <p><b>参照のみ。</b>起動・停止・終了などの書き込み操作は絶対に持たない（オーナー指示 C7）。
 *
 * <p>実装:
 *
 * <ul>
 *   <li>{@link DisabledCloudStateProviderImpl} — 既定。{@code serverhub.cloud.enabled=false} のとき。常に
 *       {@link CloudProviderUnavailableException}。ローカル・CI はこれ。
 *   <li>{@link Ec2CloudStateProviderImpl} — {@code serverhub.cloud.enabled=true} のとき。AWS SDK v2。
 * </ul>
 */
public interface CloudStateProvider {

  /** provider が実際に問い合わせ可能か（無効・未設定なら false）。 */
  boolean isEnabled();

  /**
   * 指定リージョンのインスタンス群の実行状態の生値を取得する。
   *
   * @param region 例 {@code ap-northeast-1}
   * @param externalIds インスタンス ID（例 {@code i-0abc...}）。0 件なら空 Map を返す
   * @return {@code externalId -> 生の状態文字列}（例 {@code "stopped"}）。<b>応答に無い ID は Map に含めない</b>
   *     （呼び出し側はそれを "見つからない = GONE" とみなす）
   * @throws CloudProviderUnavailableException provider 全体に問い合わせできない（無効・認証・全断）
   */
  Map<String, String> describeStates(String region, Collection<String> externalIds);
}
