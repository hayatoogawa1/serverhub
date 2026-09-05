package com.serverhub.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.serverhub.common.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import tools.jackson.databind.ObjectMapper;

class LoginFailureHandlerTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final LoginFailureHandler handler = new LoginFailureHandler(objectMapper);

  @Test
  void writesGenericBadCredentialsError() throws Exception {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    when(request.getAttribute(JsonLoginAuthenticationFilter.ATTEMPTED_EMAIL_ATTRIBUTE))
        .thenReturn("admin@serverhub.local");
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.onAuthenticationFailure(
        request, response, new BadCredentialsException("bad credentials"));

    assertThat(response.getStatus()).isEqualTo(401);
    assertThat(response.getContentAsString())
        .contains(ErrorCode.AUTH_BAD_CREDENTIALS)
        .contains("メールアドレスまたはパスワードが正しくありません。")
        .doesNotContain("bad credentials");
  }
}
