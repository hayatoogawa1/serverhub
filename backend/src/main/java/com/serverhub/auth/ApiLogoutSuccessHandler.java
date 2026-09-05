package com.serverhub.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.stereotype.Component;

/** ログアウト成功時に {@code 204}（ボディなし）を返す（詳細設計 02-auth §5）。 */
@Component
public class ApiLogoutSuccessHandler implements LogoutSuccessHandler {

  @Override
  public void onLogoutSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
    response.setStatus(HttpServletResponse.SC_NO_CONTENT);
  }
}
