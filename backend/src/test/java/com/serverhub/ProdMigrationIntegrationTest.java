package com.serverhub;

import static org.assertj.core.api.Assertions.assertThat;

import com.serverhub.user.User;
import com.serverhub.user.UserDao;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * {@code prod} プロファイルで {@code classpath:db/prod} のマイグレーション（{@code
 * V100__update_admin_password.sql}）が適用され、デモ管理者パスワードが変わることを確認する。
 *
 * <p>既定プロファイルのテスト（{@code AuthIntegrationTest} 等）は {@code db/migration} だけを見るため {@code
 * admin@serverhub.local / password} のままで通る。ここだけが本番差分を検証する。
 */
@SpringBootTest
@ActiveProfiles("prod")
@Testcontainers
class ProdMigrationIntegrationTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

  @Autowired UserDao userDao;
  @Autowired PasswordEncoder passwordEncoder;

  @Test
  void prodProfileChangesDemoAdminPassword() {
    Optional<User> admin = userDao.selectByEmail("admin@serverhub.local");
    assertThat(admin).isPresent();

    String hash = admin.get().passwordHash();
    assertThat(passwordEncoder.matches("serverhub-demo-2026", hash)).isTrue();
    assertThat(passwordEncoder.matches("password", hash)).isFalse();
  }
}
