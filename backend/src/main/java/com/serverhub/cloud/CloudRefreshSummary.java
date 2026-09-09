package com.serverhub.cloud;

/**
 * 実行状態の一括取得の結果サマリ（{@code POST /servers/cloud-links/refresh} / ポーリング）。
 *
 * @param total 対象となった紐付け数（アクティブなサーバーに紐付くもの）
 * @param updated 生の状態を取得してキャッシュ更新した数
 * @param notFound AWS 応答に存在せず {@code gone} にした数
 * @param failed provider 呼び出しに失敗し {@code last_error} だけ記録した数（状態は据え置き）
 */
public record CloudRefreshSummary(int total, int updated, int notFound, int failed) {

  public static final CloudRefreshSummary EMPTY = new CloudRefreshSummary(0, 0, 0, 0);
}
