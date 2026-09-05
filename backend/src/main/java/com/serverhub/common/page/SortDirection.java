package com.serverhub.common.page;

/**
 * ソート方向。
 *
 * <p>Controller の {@code @RequestParam} に直接バインドする。未定義の値は Spring の型変換エラー （{@code
 * MethodArgumentTypeMismatchException}）として自動的に {@code 400} になる（詳細設計 01-common §1.2 D-DETAIL-01）。
 */
public enum SortDirection {
  ASC,
  DESC
}
