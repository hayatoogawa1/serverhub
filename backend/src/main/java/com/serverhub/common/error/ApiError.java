package com.serverhub.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * 統一エラーレスポンス（基本設計 02-api §2.4、requirements §10.1.12）。
 *
 * <p>{@code errors} はバリデーションエラーのときのみ設定し、それ以外は JSON に出さない。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(String code, String message, String traceId, List<FieldError> errors) {

  public static ApiError of(String code, String message, String traceId) {
    return new ApiError(code, message, traceId, null);
  }

  public static ApiError validation(String message, String traceId, List<FieldError> errors) {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, traceId, errors);
  }
}
