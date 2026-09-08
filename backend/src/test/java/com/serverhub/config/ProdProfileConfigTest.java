package com.serverhub.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

/**
 * 本番プロファイル（{@code application-prod.yml}）が意図した上書きを持つことを確認する。
 *
 * <p>Spring コンテキストは起動せず、YAML を直接読んでキー / 値を検証する（高速・DB 不要）。 実際のバインドは {@link
 * com.serverhub.ServerHubApplicationTests} が既定プロファイルで担保する。
 */
class ProdProfileConfigTest {

  private static PropertySource<?> loadProdYaml() throws IOException {
    List<PropertySource<?>> sources =
        new YamlPropertySourceLoader()
            .load("application-prod.yml", new ClassPathResource("application-prod.yml"));
    assertThat(sources).isNotEmpty();
    return sources.get(0);
  }

  @Test
  void prodProfileTightensSecurityAndLogging() throws IOException {
    PropertySource<?> prod = loadProdYaml();

    // 前段プロキシの X-Forwarded-* を信頼（HTTPS 判定・Secure Cookie のため）
    assertThat(prod.getProperty("server.forward-headers-strategy")).isEqualTo("framework");

    // セッション Cookie は HTTPS のみ
    assertThat(prod.getProperty("server.servlet.session.cookie.secure")).isEqualTo(true);
    assertThat(prod.getProperty("server.servlet.session.cookie.http-only")).isEqualTo(true);

    // 本番は Swagger も認証必須（既定は permit-all=true）
    assertThat(prod.getProperty("serverhub.security.swagger-permit-all")).isEqualTo(false);

    // アプリログは INFO（既定 application.yml は DEBUG）
    assertThat(prod.getProperty("logging.level.com.serverhub")).isEqualTo("INFO");
  }
}
