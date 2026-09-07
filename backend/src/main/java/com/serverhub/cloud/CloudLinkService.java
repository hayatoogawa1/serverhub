package com.serverhub.cloud;

/**
 * サーバー ⇔ 外部インスタンスの紐付けの操作（FR-CLOUD-01、設計 07-aws-ec2-integration §6.2）。
 *
 * <p><b>参照のみ。</b>EC2 の起動・停止などの操作は提供しない（C7）。実行状態の取得は {@link CloudStateProvider} 経由で、書き込み先は {@code
 * server_cloud_links} のみ（{@code servers} には触れない）。
 */
public interface CloudLinkService {

  /**
   * 紐付けの作成 / 置換（{@code PUT /servers/{id}/cloud-link}）。
   *
   * @throws com.serverhub.common.error.ResourceNotFoundException サーバーが存在しない / 論理削除済み
   * @throws CloudLinkConflictException 別サーバーが同じインスタンス ID を使用中
   */
  CloudLinkResponse upsert(Long serverId, CloudLinkRequest request);

  /** 紐付けの解除（{@code DELETE /servers/{id}/cloud-link}）。冪等（リンクが無くても成功）。 */
  void delete(Long serverId);

  /**
   * その 1 台だけ即時取得（{@code POST /servers/{id}/cloud-link/refresh}）。
   *
   * <p>AWS 取得に失敗しても<b>キャッシュ値を返す</b>（HTTP 200、P8）。{@code lastError} に理由が入る。 provider 自体が無効な場合のみ
   * {@link CloudProviderUnavailableException}（{@code 503}）。
   *
   * @throws com.serverhub.common.error.ResourceNotFoundException サーバー / 紐付けが無い
   */
  CloudLinkResponse refresh(Long serverId);
}
