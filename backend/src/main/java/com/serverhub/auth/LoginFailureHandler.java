package com.serverhub.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serverhub.common.error.ApiError;
import com.serverhub.common.error.ErrorCode;
import com.serverhub.common.web.RequestLoggingFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

/**
 * ログイン失敗（資格情報不正）時に {@code 401} を返す（詳細設計 02-auth §5）。
 *
 * <p>ユーザーの存在を示さない共通メッセージにする（requirements §10.1.2）。パスワードは記録しない。
 */
@Component
public class LoginFailureHandler implements AuthenticationFailureHandler {

  private static final Logger log = LoggerFactory.getLogger(LoginFailureHandler.class);

  private final ObjectMapper objectMapper;

  public LoginFailureHandler(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public void onAuthenticationFailure(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
      throws IOException {
    log.warn(
        "login failed: email={} clientIp={}",
        request.getAttribute(JsonLoginAuthenticationFilter.ATTEMPTED_EMAIL_ATTRIBUTE),
        request.getRemoteAddr());

    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    ApiError body =
        ApiError.of(
            ErrorCode.AUTH_BAD_CREDENTIALS,
            "メールアドレスまたはパスワードが正しくありません。",
            MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY));
    objectMapper.writeValue(response.getWriter(), body);
  }
}
