package com.serverhub.server;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * サーバーの稼働状態（B2、詳細設計 03-server §1）。
 *
 * <p>DB・JSON・クエリパラメータのいずれも小文字の {@link #value()} で表現する（D-SRV-01）。
 */
public enum Status {
  ACTIVE("active"),
  MAINTENANCE("maintenance"),
  RETIRED("retired");

  private final String value;

  Status(String value) {
    this.value = value;
  }

  @JsonValue
  public String value() {
    return value;
  }

  @JsonCreator
  public static Status fromValue(String value) {
    for (Status status : values()) {
      if (status.value.equals(value)) {
        return status;
      }
    }
    throw new IllegalArgumentException("unknown status: " + value);
  }
}
