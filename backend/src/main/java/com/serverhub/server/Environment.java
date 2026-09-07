package com.serverhub.server;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * サーバーの環境区分（B2、詳細設計 03-server §1）。
 *
 * <p>DB・JSON・クエリパラメータのいずれも小文字の {@link #value()} で表現する（D-SRV-01）。
 */
public enum Environment {
  PRODUCTION("production"),
  STAGING("staging"),
  DEVELOPMENT("development");

  private final String value;

  Environment(String value) {
    this.value = value;
  }

  @JsonValue
  public String value() {
    return value;
  }

  @JsonCreator
  public static Environment fromValue(String value) {
    for (Environment environment : values()) {
      if (environment.value.equals(value)) {
        return environment;
      }
    }
    throw new IllegalArgumentException("unknown environment: " + value);
  }
}
