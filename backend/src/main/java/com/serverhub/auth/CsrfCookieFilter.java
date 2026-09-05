package com.serverhub.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.web.csrf.CsrfToken;

/**
 * Spring Security 6 系の CSRF トークンは遅延読み込み（BREACH 対策）のため、何かが実際に {@link CsrfToken#getToken()} を参照するまで
 * {@code XSRF-TOKEN} Cookie が発行されない。 SPA はどのリクエストでもこの Cookie を必要とするため、毎リクエストで強制的に読み込ませて Cookie
 * 発行を確定させる（詳細設計 04-security §5.2 / 02-auth §3.3 で指摘された既知の落とし穴への対応）。
 *
 * <p>{@code CsrfFilter} の後段に登録する（{@link com.serverhub.config.SecurityConfig}）。
 */
public class CsrfCookieFilter extends HttpFilter {

  @Override
  protected void doFilter(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
    if (csrfToken != null) {
      csrfToken.getToken();
    }
    chain.doFilter(request, response);
  }
}
