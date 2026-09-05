package com.serverhub.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.serverhub.user.User;
import com.serverhub.user.UserDao;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

class ServerHubUserDetailsServiceTest {

  private final UserDao userDao = mock(UserDao.class);
  private final ServerHubUserDetailsService service = new ServerHubUserDetailsService(userDao);

  @Test
  void loadsExistingUserAsPrincipal() {
    User user =
        new User(
            1L, "admin@serverhub.local", "hash", "デモ管理者", LocalDateTime.now(), LocalDateTime.now());
    when(userDao.selectByEmail("admin@serverhub.local")).thenReturn(Optional.of(user));

    UserDetails result = service.loadUserByUsername("admin@serverhub.local");

    assertThat(result).isInstanceOf(ServerHubUserPrincipal.class);
    assertThat(result.getUsername()).isEqualTo("admin@serverhub.local");
    assertThat(result.getPassword()).isEqualTo("hash");
    assertThat(result.getAuthorities()).extracting(Object::toString).containsExactly("ROLE_USER");
  }

  @Test
  void throwsWhenUserNotFound() {
    when(userDao.selectByEmail("missing@serverhub.local")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.loadUserByUsername("missing@serverhub.local"))
        .isInstanceOf(UsernameNotFoundException.class);
  }
}
