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
 * {@code prod} プロファイルで {@code classpath:db/prod} のマイグレーション（{@code V100__update_admin_password.sql}
 * / {@code V101__update_demo_users_password.sql}）が適用され、 デモユーザーのパスワードが変わることを確認する。
 *
 * <p>既定プロファイルのテスト（{@code AuthIntegrationTest} 等）は {@code db/migration} だけを見るため {@code password}
 * のままで通る。ここだけが本番差分を検証する。
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
    assertDemoPasswordChanged("admin@serverhub.local");
  }

  @Test
  void prodProfileChangesDemoOpsUserPasswords() {
    assertDemoPasswordChanged("ops-a@serverhub.local");
    assertDemoPasswordChanged("ops-b@serverhub.local");
  }

  private void assertDemoPasswordChanged(String email) {
    Optional<User> user = userDao.selectByEmail(email);
    assertThat(user).as("%s should be seeded", email).isPresent();

    String hash = user.get().passwordHash();
    assertThat(passwordEncoder.matches("serverhub-demo-2026", hash)).isTrue();
    assertThat(passwordEncoder.matches("password", hash)).isFalse();
  }
}
