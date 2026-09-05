package com.serverhub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * アプリ全体で共有する {@link ObjectMapper}（Jackson 3、{@code tools.jackson.*}）を明示的に定義する。
 *
 * <p>Spring Boot 4.1 は内部で Jackson 3（{@code tools.jackson.databind.ObjectMapper}）を 自動構成する一方、{@code
 * springdoc-openapi} 等の一部依存が Jackson 2（{@code
 * com.fasterxml.jackson.databind.ObjectMapper}）を推移的に持ち込むため、両方がクラスパス上に 共存する。Jackson 2
 * の型でコンストラクタ注入しようとすると、Spring は Jackson 3 の Bean しか 持っていないため {@code NoSuchBeanDefinitionException}
 * になる（実装時に判明）。 アプリのコードは本クラスに合わせて Jackson 3（{@code tools.jackson.*}）の型で統一する。
 */
@Configuration
public class JacksonConfig {

  @Bean
  ObjectMapper objectMapper() {
    return JsonMapper.builder().findAndAddModules().build();
  }
}
