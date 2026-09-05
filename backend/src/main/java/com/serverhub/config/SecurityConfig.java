package com.serverhub.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serverhub.auth.ApiAuthenticationEntryPoint;
import com.serverhub.auth.ApiLogoutSuccessHandler;
import com.serverhub.auth.CsrfCookieFilter;
import com.serverhub.auth.JsonLoginAuthenticationFilter;
import com.serverhub.auth.LoginFailureHandler;
import com.serverhub.auth.LoginSuccessHandler;
import com.serverhub.auth.ServerHubUserDetailsService;
import jakarta.validation.Validator;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;

/**
 * 認証・認可・セキュリティヘッダーの設定（詳細設計 04-security）。
 *
 * <p>{@code health}（chain①）/ {@code swagger}（chain②）/ {@code app}（chain③、既定）の 3 系統に分離する（04-security
 * §6.2 D-SEC-04）。パスごとに CSP・認可要件が異なるため。
 */
@Configuration
public class SecurityConfig {

  private static final String APP_CSP =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
          + "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; "
          + "base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

  private static final String SWAGGER_CSP =
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
          + "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; "
          + "base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

  @Value("${serverhub.security.swagger-permit-all:true}")
  private boolean swaggerPermitAll;

  @Bean
  PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
  }

  @Bean
  AuthenticationManager authenticationManager(
      ServerHubUserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
    provider.setPasswordEncoder(passwordEncoder);
    return new ProviderManager(List.of(provider));
  }

  /** chain①: ヘルスチェック。未認証許可、CSRF 対象外（requirements §10.3）。 */
  @Bean
  @Order(1)
  SecurityFilterChain healthFilterChain(HttpSecurity http) throws Exception {
    http.securityMatcher("/actuator/health", "/actuator/health/**")
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
        .csrf(AbstractHttpConfigurer::disable);
    return http.build();
  }

  /** chain②: API ドキュメント。公開範囲は環境依存（開発=未認証可・本番=認証必須、D-SEC-02）。 */
  @Bean
  @Order(2)
  SecurityFilterChain swaggerFilterChain(HttpSecurity http) throws Exception {
    http.securityMatcher("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**")
        .authorizeHttpRequests(
            auth -> {
              if (swaggerPermitAll) {
                auth.anyRequest().permitAll();
              } else {
                auth.anyRequest().authenticated();
              }
            })
        .csrf(AbstractHttpConfigurer::disable)
        .headers(
            headers -> headers.contentSecurityPolicy(csp -> csp.policyDirectives(SWAGGER_CSP)));
    return http.build();
  }

  /** chain③（既定）: 業務 API・SPA 静的アセット。 */
  @Bean
  @Order(3)
  SecurityFilterChain appFilterChain(
      HttpSecurity http,
      AuthenticationManager authenticationManager,
      ObjectMapper objectMapper,
      Validator validator,
      LoginSuccessHandler loginSuccessHandler,
      LoginFailureHandler loginFailureHandler,
      ApiAuthenticationEntryPoint apiAuthenticationEntryPoint,
      ApiLogoutSuccessHandler apiLogoutSuccessHandler)
      throws Exception {

    JsonLoginAuthenticationFilter loginFilter =
        new JsonLoginAuthenticationFilter(objectMapper, validator);
    loginFilter.setAuthenticationManager(authenticationManager);
    loginFilter.setAuthenticationSuccessHandler(loginSuccessHandler);
    loginFilter.setAuthenticationFailureHandler(loginFailureHandler);

    http.authorizeHttpRequests(
            auth ->
                auth.requestMatchers(HttpMethod.POST, "/api/v1/auth/login")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
        .addFilterAt(loginFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
        .logout(
            logout ->
                logout
                    .logoutUrl("/api/v1/auth/logout")
                    .logoutSuccessHandler(apiLogoutSuccessHandler)
                    .invalidateHttpSession(true)
                    .deleteCookies("JSESSIONID"))
        .exceptionHandling(ex -> ex.authenticationEntryPoint(apiAuthenticationEntryPoint))
        .headers(headers -> headers.contentSecurityPolicy(csp -> csp.policyDirectives(APP_CSP)));
    return http.build();
  }
}
