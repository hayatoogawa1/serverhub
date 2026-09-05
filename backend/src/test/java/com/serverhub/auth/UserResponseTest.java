package com.serverhub.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.serverhub.user.User;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class UserResponseTest {

  @Test
  void mapsPrincipalFields() {
    User user =
        new User(
            1L, "admin@serverhub.local", "hash", "デモ管理者", LocalDateTime.now(), LocalDateTime.now());
    ServerHubUserPrincipal principal = new ServerHubUserPrincipal(user);

    UserResponse response = UserResponse.from(principal);

    assertThat(response.id()).isEqualTo(1L);
    assertThat(response.email()).isEqualTo("admin@serverhub.local");
    assertThat(response.displayName()).isEqualTo("デモ管理者");
  }
}
