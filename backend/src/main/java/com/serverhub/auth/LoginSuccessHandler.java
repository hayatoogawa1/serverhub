package com.serverhub.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * ログイン成功時に {@code 200} + {@link UserResponse} を返す（詳細設計 02-auth §5、 Spring Security
 * 既定のリダイレクトは使わない、D-SEC-05）。
 */
@Component
public class LoginSuccessHandler implements AuthenticationSuccessHandler {

  private static final Logger log = LoggerFactory.getLogger(LoginSuccessHandler.class);

  private final ObjectMapper objectMapper;

  public LoginSuccessHandler(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication)
      throws IOException {
    ServerHubUserPrincipal principal = (ServerHubUserPrincipal) authentication.getPrincipal();
    log.info(
        "login succeeded: email={} clientIp={}", principal.getUsername(), request.getRemoteAddr());

    response.setStatus(HttpServletResponse.SC_OK);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    objectMapper.writeValue(response.getWriter(), UserResponse.from(principal));
  }
}
