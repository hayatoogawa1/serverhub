package com.serverhub.cloud;

import com.serverhub.common.error.ApiError;
import com.serverhub.common.error.ErrorCode;
import com.serverhub.common.web.RequestLoggingFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * {@code cloud} 機能固有の例外ハンドラ（FR-CLOUD-01、設計 07-aws-ec2-integration §6.6）。
 *
 * <p>{@code server} の {@link com.serverhub.server.ServerExceptionHandler} と同じ手法。汎用の {@link
 * com.serverhub.common.error.GlobalExceptionHandler} より前に選択されるよう {@link Order} を上げる。
 */
@RestControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE - 10)
public class CloudExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(CloudExceptionHandler.class);

  /**
   * 別サーバーが同じインスタンス ID を使用中。Service が事前チェックと DB 一意制約違反の両方をこの例外に 正規化してからスローする（{@link
   * CloudLinkServiceImpl}）ので、ここでは 1 種類だけ受ければよい。
   */
  @ExceptionHandler(CloudLinkConflictException.class)
  public ResponseEntity<ApiError> handleConflict(CloudLinkConflictException ex) {
    log.warn("cloud link conflict: {}", ex.getMessage());
    ApiError body =
        ApiError.of(ErrorCode.CLOUD_LINK_CONFLICT, "このインスタンスは別のサーバーに連携済みです。", traceId());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
  }

  /** provider 全体に問い合わせできない（未設定・全断）。個別インスタンスの取得失敗は含まない。 */
  @ExceptionHandler(CloudProviderUnavailableException.class)
  public ResponseEntity<ApiError> handleUnavailable(CloudProviderUnavailableException ex) {
    log.warn("cloud provider unavailable: {}", ex.getMessage());
    ApiError body =
        ApiError.of(
            ErrorCode.CLOUD_PROVIDER_UNAVAILABLE, "クラウド連携が利用できません。時間をおいて再度お試しください。", traceId());
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
  }

  private static String traceId() {
    return MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY);
  }
}
