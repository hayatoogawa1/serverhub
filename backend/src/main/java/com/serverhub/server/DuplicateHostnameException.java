package com.serverhub.server;

/**
 * 有効な（{@code deleted_at IS NULL}）サーバーの中でホスト名が重複していることを表す（BR-02）。
 *
 * <p>非チェック例外。Service の事前チェックで送出し、{@link ServerExceptionHandler} が {@code 409 DUPLICATE_HOSTNAME}
 * にする。
 */
public class DuplicateHostnameException extends RuntimeException {

  public DuplicateHostnameException(String hostname) {
    super("duplicate active hostname: " + hostname);
  }
}
