package com.serverhub.common.error;

/**
 * 対象リソースが存在しない、または論理削除済みであることを表す（詳細設計 05-cross-cutting §1.1）。
 *
 * <p>非チェック例外（{@link RuntimeException}）とし、{@code @Transactional} の既定ロールバック 挙動に乗せる（05-cross-cutting
 * D-XCUT-01）。メッセージはサーバーログにのみ出力し、ユーザーへの レスポンスには含めない（{@link GlobalExceptionHandler}）。
 */
public class ResourceNotFoundException extends RuntimeException {

  public ResourceNotFoundException(String resourceType, Object id) {
    super(resourceType + " not found: id=" + id);
  }
}
