package com.serverhub.cloud;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * サーバーに紐付く外部クラウドの種別（FR-CLOUD-01、設計 07-aws-ec2-integration §6.1）。
 *
 * <p>Phase 9 の実装対象は {@link #AWS_EC2} のみ。テーブル・enum は他 provider を後から足せる形にしてある。 DB・JSON のいずれも小文字の
 * {@link #value()} で表現する（03-server D-SRV-01 と同じパターン）。
 */
public enum CloudProvider {
  AWS_EC2("aws_ec2");

  private final String value;

  CloudProvider(String value) {
    this.value = value;
  }

  @JsonValue
  public String value() {
    return value;
  }

  /** 未知の値は {@link IllegalArgumentException}（provider は制御された入力）。 */
  @JsonCreator
  public static CloudProvider fromValue(String value) {
    for (CloudProvider provider : values()) {
      if (provider.value.equals(value)) {
        return provider;
      }
    }
    throw new IllegalArgumentException("unknown cloud provider: " + value);
  }
}
