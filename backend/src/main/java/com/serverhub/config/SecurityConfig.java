package com.serverhub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * MVP の認証設計の骨子。
 *
 * <ul>
 *   <li>セッション + Cookie ベース（Spring Security フォームログイン）。JWT は採用しない。
 *   <li>CSRF 対策は有効のまま（SPA はバックエンドと同一ドメイン配信前提）。
 *   <li>ヘルスチェックと API ドキュメントのみ未認証で許可し、それ以外は認証必須。
 * </ul>
 *
 * <p>ログインユーザーは Flyway シードで投入する（Phase 4〜5 で実装）。それまでは Spring Boot が生成する開発用ユーザーのみが存在する。認可（ロール）は MVP
 * 対象外だが、 将来の追加に備えてこのフィルタチェーンを拡張ポイントとする。
 */
@Configuration
public class SecurityConfig {

  /** 未認証で許可するパス。 */
  private static final String[] PUBLIC_PATHS = {
    "/actuator/health",
    "/actuator/health/**",
    "/v3/api-docs/**",
    "/swagger-ui/**",
    "/swagger-ui.html"
  };

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(
            auth -> auth.requestMatchers(PUBLIC_PATHS).permitAll().anyRequest().authenticated())
        .formLogin(form -> form.permitAll())
        .logout(logout -> logout.permitAll());
    return http.build();
  }
}
