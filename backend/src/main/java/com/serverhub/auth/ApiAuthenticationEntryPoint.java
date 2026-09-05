package com.serverhub.auth;

import com.serverhub.common.error.ApiError;
import com.serverhub.common.error.ErrorCode;
import com.serverhub.common.web.RequestLoggingFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** 未認証で保護 API にアクセスした場合に {@code 401} を返す（詳細設計 02-auth §5）。HTML ログイン ページへのリダイレクトはしない（API のため）。 */
@Component
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {

  private final ObjectMapper objectMapper;

  public ApiAuthenticationEntryPoint(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public void commence(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException authException)
      throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    ApiError body =
        ApiError.of(
            ErrorCode.AUTH_REQUIRED, "認証が必要です。", MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY));
    objectMapper.writeValue(response.getWriter(), body);
  }
}
