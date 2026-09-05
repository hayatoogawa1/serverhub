package com.serverhub.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.ObjectMapper;

/**
 * {@link JacksonConfig} が {@link ObjectMapper} を正しく1つだけ登録し、{@code JavaTimeModule} （ISO 8601
 * 日付フォーマット）が有効になっていることを確認する（軽量な {@link ApplicationContextRunner} を使い、Testcontainers 不要）。
 */
class JacksonConfigTest {

  private final ApplicationContextRunner contextRunner =
      new ApplicationContextRunner().withUserConfiguration(JacksonConfig.class);

  @Test
  void registersSingleObjectMapperBeanWithJavaTimeModule() {
    contextRunner.run(
        context -> {
          assertThat(context).hasSingleBean(ObjectMapper.class);
          ObjectMapper objectMapper = context.getBean(ObjectMapper.class);
          assertThat(objectMapper.writeValueAsString(LocalDate.of(2026, 1, 1)))
              .isEqualTo("\"2026-01-01\"");
        });
  }
}
