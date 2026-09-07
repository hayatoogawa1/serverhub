package com.serverhub.cloud;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 外部インスタンスの実行状態を provider 横断で正規化した値（FR-CLOUD-01、設計 07-aws-ec2-integration §5 P5）。
 *
 * <p><b>servers.status（管理ライフサイクル）とは別概念。</b>これは「観測された実行状態」であり、 AWS からの取得でのみ設定される。provider の生値は
 * {@code server_cloud_links.state_raw} に別途保持する。
 *
 * <ul>
 *   <li>{@link #RUNNING} / {@link #STOPPED} — 安定状態
 *   <li>{@link #PENDING} / {@link #STOPPING} — 遷移中
 *   <li>{@link #TERMINATED} — 終了済み（AWS 側にはまだ見える）
 *   <li>{@link #GONE} — 取得したが該当インスタンスが見つからない（削除済みの可能性）
 *   <li>{@link #UNKNOWN} — provider から未知の状態文字列が返った
 * </ul>
 *
 * <p>DB・JSON のいずれも小文字の {@link #value()}。DB 側は {@code CHECK} 制約で同じ集合に固定（V3）。
 */
public enum CloudInstanceState {
  RUNNING("running"),
  STOPPED("stopped"),
  PENDING("pending"),
  STOPPING("stopping"),
  TERMINATED("terminated"),
  UNKNOWN("unknown"),
  GONE("gone");

  private final String value;

  CloudInstanceState(String value) {
    this.value = value;
  }

  @JsonValue
  public String value() {
    return value;
  }

  /**
   * 未知の値は {@link #UNKNOWN}（例外を投げない）。実行状態は本質的にベストエフォートの観測値で、 provider が新しい状態文字列を返しても機能を止めない方針。DB は
   * {@code CHECK} で保護済み。
   */
  @JsonCreator
  public static CloudInstanceState fromValue(String value) {
    if (value == null) {
      return UNKNOWN;
    }
    for (CloudInstanceState state : values()) {
      if (state.value.equals(value)) {
        return state;
      }
    }
    return UNKNOWN;
  }
}
