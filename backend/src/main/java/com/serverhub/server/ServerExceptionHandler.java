package com.serverhub.server;

import com.serverhub.common.error.ApiError;
import com.serverhub.common.error.ErrorCode;
import com.serverhub.common.web.RequestLoggingFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * {@code server} 機能固有の例外ハンドラ（03-server §6）。
 *
 * <p>ホスト名重複を {@code 409 DUPLICATE_HOSTNAME} にする。Service の事前チェック（{@link
 * DuplicateHostnameException}）と、DB 部分ユニークインデックスによる安全網（{@link DuplicateKeyException}、
 * doma-spring-boot が変換）の両方を受ける（05-cross-cutting §1.3）。
 */
@RestControllerAdvice
public class ServerExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ServerExceptionHandler.class);

  @ExceptionHandler({DuplicateHostnameException.class, DuplicateKeyException.class})
  public ResponseEntity<ApiError> handleDuplicateHostname(Exception ex) {
    log.warn("duplicate hostname: {}", ex.getMessage());
    ApiError body = ApiError.of(ErrorCode.DUPLICATE_HOSTNAME, "同じホスト名のサーバーが既に存在します。", traceId());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
  }

  private static String traceId() {
    return MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY);
  }
}
