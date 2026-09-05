package com.serverhub.server;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * サーバーの仮想化区分（B2、詳細設計 03-server §1）。
 *
 * <p>DB・JSON・クエリパラメータのいずれも小文字の {@link #value()} で表現する（D-SRV-01）。
 */
public enum VirtualizationType {
  PHYSICAL("physical"),
  VIRTUAL("virtual");

  private final String value;

  VirtualizationType(String value) {
    this.value = value;
  }

  @JsonValue
  public String value() {
    return value;
  }

  @JsonCreator
  public static VirtualizationType fromValue(String value) {
    for (VirtualizationType type : values()) {
      if (type.value.equals(value)) {
        return type;
      }
    }
    throw new IllegalArgumentException("unknown virtualizationType: " + value);
  }
}
