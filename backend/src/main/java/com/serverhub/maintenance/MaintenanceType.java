package com.serverhub.maintenance;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * メンテナンス作業の種別（B4、詳細設計 04-maintenance §1）。
 *
 * <p>DB・JSON のいずれも小文字の {@link #value()} で表現する（03-server D-SRV-01 と同じパターン）。
 */
public enum MaintenanceType {
  PATCH("patch"),
  CONFIG("config"),
  HARDWARE("hardware"),
  OTHER("other");

  private final String value;

  MaintenanceType(String value) {
    this.value = value;
  }

  @JsonValue
  public String value() {
    return value;
  }

  @JsonCreator
  public static MaintenanceType fromValue(String value) {
    for (MaintenanceType type : values()) {
      if (type.value.equals(value)) {
        return type;
      }
    }
    throw new IllegalArgumentException("unknown maintenance type: " + value);
  }
}
