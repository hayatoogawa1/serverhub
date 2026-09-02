package com.serverhub;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * アプリケーションコンテキストが起動し、実 PostgreSQL に対して Flyway・Doma の
 * 自動構成まで含めて配線が成立することを確認する。
 *
 * <p>Testcontainers で PostgreSQL を起動するため、実行にはローカルの Docker が必要
 * （Docker Desktop の WSL 統合 or CI の Docker）。
 */
@SpringBootTest
@Testcontainers
class ServerHubApplicationTests {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Test
    void contextLoads() {
        // コンテキストが起動すれば成功。
    }
}
