package com.serverhub.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serverhub.user.User;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

class LoginSuccessHandlerTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final LoginSuccessHandler handler = new LoginSuccessHandler(objectMapper);

  @Test
  void writesUserResponseAsJson() throws Exception {
    User user =
        new User(
            1L, "admin@serverhub.local", "hash", "デモ管理者", LocalDateTime.now(), LocalDateTime.now());
    ServerHubUserPrincipal principal = new ServerHubUserPrincipal(user);
    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.onAuthenticationSuccess(request, response, authentication);

    assertThat(response.getStatus()).isEqualTo(200);
    assertThat(response.getContentAsString()).contains("admin@serverhub.local").contains("デモ管理者");
  }
}
