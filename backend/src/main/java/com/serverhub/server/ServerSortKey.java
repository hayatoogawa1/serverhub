package com.serverhub.server;

/**
 * サーバー一覧のソート項目ホワイトリスト（F1、詳細設計 03-server §1）。
 *
 * <p>値は API のクエリ表記に合わせ camelCase。専用の {@code Converter<String, ServerSortKey>} で クエリパラメータから変換し、実際の
 * {@code ORDER BY} 列への解決は SQL 側（{@code selectList.sql}）で行う。
 */
public enum ServerSortKey {
  HOSTNAME("hostname"),
  ENVIRONMENT("environment"),
  STATUS("status"),
  UPDATED_AT("updatedAt"),
  CREATED_AT("createdAt");

  private final String value;

  ServerSortKey(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static ServerSortKey fromValue(String value) {
    for (ServerSortKey key : values()) {
      if (key.value.equals(value)) {
        return key;
      }
    }
    throw new IllegalArgumentException("unknown sort key: " + value);
  }
}
