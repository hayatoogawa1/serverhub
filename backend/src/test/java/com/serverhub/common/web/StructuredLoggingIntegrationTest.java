package com.serverhub.common.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * アプリケーションのコンテキスト起動後、コンソールログが構造化（ECS JSON）で出力され、MDC の {@code traceId} が 各行に載ることを確認する（基本設計
 * 05-cross-cutting §4.2、requirements §10.1.11 / §12.6）。
 *
 * <p>構造化ログの設定（{@code logging.structured.format.console}）は Spring Boot がコンテキスト初期化時に適用する
 * ため、実際にコンテキストを起動して検証する。実行にはローカルの Docker が必要。
 */
@SpringBootTest
@Testcontainers
@ExtendWith(OutputCaptureExtension.class)
class StructuredLoggingIntegrationTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

  private static final Logger log = LoggerFactory.getLogger(StructuredLoggingIntegrationTest.class);

  @Test
  void consoleOutputIsEcsJson_andCarriesTraceIdFromMdc(CapturedOutput output) {
    MDC.put(RequestLoggingFilter.TRACE_ID_MDC_KEY, "test-trace-0001");
    try {
      log.info("structured logging probe");
    } finally {
      MDC.remove(RequestLoggingFilter.TRACE_ID_MDC_KEY);
    }

    // ECS フォーマット（Spring Boot 標準）の目印と、同じ行に MDC の traceId が載ること
    assertThat(output.getOut())
        .contains("\"@timestamp\"")
        .contains("\"ecs\":{\"version\"")
        .contains("\"service\":{\"name\":\"serverhub\"")
        .contains("\"message\":\"structured logging probe\",\"traceId\":\"test-trace-0001\"");
  }
}
