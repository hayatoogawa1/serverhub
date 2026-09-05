package com.serverhub.common.error;

import com.serverhub.common.web.RequestLoggingFilter;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.seasar.doma.jdbc.OptimisticLockException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

/**
 * 例外を統一エラーレスポンス（{@link ApiError}）に変換する（詳細設計 05-cross-cutting §2）。
 *
 * <p>401/403 は Spring Security 層（{@code AuthenticationEntryPoint} 等）で完結するため、ここには 含まない。ホスト名重複（{@code
 * DataIntegrityViolationException}）等の機能固有のハンドラは、 該当機能のパッケージ（例: {@code server}）で追加する。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiError> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
    List<FieldError> errors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
            .toList();
    log.warn("validation error: {} field(s)", errors.size());
    return badRequest(errors);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex) {
    List<FieldError> errors =
        ex.getConstraintViolations().stream()
            .map(cv -> new FieldError(propertyName(cv), cv.getMessage()))
            .toList();
    log.warn("validation error: {} field(s)", errors.size());
    return badRequest(errors);
  }

  private static String propertyName(ConstraintViolation<?> violation) {
    String path = violation.getPropertyPath().toString();
    int lastDot = path.lastIndexOf('.');
    return lastDot >= 0 ? path.substring(lastDot + 1) : path;
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiError> handleNotReadable(HttpMessageNotReadableException ex) {
    log.warn("malformed request body: {}", ex.getClass().getSimpleName());
    return badRequest(null);
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
    // 未定義の sort/order/enum フィルタ等はここに落ちる（01-common §1.2 D-DETAIL-01）。
    log.warn("invalid query parameter: {}", ex.getName());
    return badRequest(null);
  }

  private static ResponseEntity<ApiError> badRequest(List<FieldError> errors) {
    ApiError body = ApiError.validation("入力内容を確認してください。", traceId(), errors);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ApiError> handleResourceNotFound(ResourceNotFoundException ex) {
    log.warn("resource not found: {}", ex.getMessage());
    ApiError body = ApiError.of(ErrorCode.RESOURCE_NOT_FOUND, "対象が見つかりません。", traceId());
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
  }

  @ExceptionHandler({HttpRequestMethodNotSupportedException.class, NoHandlerFoundException.class})
  public ResponseEntity<ApiError> handleRouteNotFound(Exception ex) {
    // 405 やルート不一致は 404 に丸め、CLAUDE.md §4 のステータス集合を増やさない（05-cross-cutting
    // §1.4）。NoHandlerFoundException が実際に送出されるための Spring Boot 側のプロパティ設定
    // （spring.mvc.throw-exception-if-no-handler-found 等）は SPA 静的配信と合わせて Phase 6/8 で調整する。
    log.warn("route not found: {}", ex.getMessage());
    ApiError body = ApiError.of(ErrorCode.RESOURCE_NOT_FOUND, "対象が見つかりません。", traceId());
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
  }

  @ExceptionHandler(OptimisticLockException.class)
  public ResponseEntity<ApiError> handleOptimisticLock(OptimisticLockException ex) {
    // Doma が @Version 不一致（影響行 0 件）で自動的に送出する（05-cross-cutting §1.2）。
    log.warn("optimistic lock conflict: {}", ex.getMessage());
    ApiError body =
        ApiError.of(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, "他の操作と競合しました。最新の内容を確認してください。", traceId());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
    log.error("unexpected error", ex);
    ApiError body = ApiError.of(ErrorCode.INTERNAL_ERROR, "システムエラーが発生しました。", traceId());
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
  }

  private static String traceId() {
    return MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY);
  }
}
