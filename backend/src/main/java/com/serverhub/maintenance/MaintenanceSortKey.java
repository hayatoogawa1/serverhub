package com.serverhub.maintenance;

/**
 * 全サーバー横断の履歴一覧のソート項目ホワイトリスト（詳細設計 04-maintenance §2、02-api §2.5）。
 *
 * <p>値は API のクエリ表記に合わせ camelCase。既定は {@link #PERFORMED_DATE} 降順。実際の {@code ORDER BY} 列への解決は SQL
 * 側（{@code selectList.sql}）で行う。
 */
public enum MaintenanceSortKey {
  PERFORMED_DATE("performedDate"),
  CREATED_AT("createdAt");

  private final String value;

  MaintenanceSortKey(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static MaintenanceSortKey fromValue(String value) {
    for (MaintenanceSortKey key : values()) {
      if (key.value.equals(value)) {
        return key;
      }
    }
    throw new IllegalArgumentException("unknown sort key: " + value);
  }
}
