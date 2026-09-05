package com.serverhub.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.serverhub.common.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import tools.jackson.databind.ObjectMapper;

class ApiAuthenticationEntryPointTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final ApiAuthenticationEntryPoint entryPoint =
      new ApiAuthenticationEntryPoint(objectMapper);

  @Test
  void writesAuthRequiredError() throws Exception {
    HttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    entryPoint.commence(
        request, response, new InsufficientAuthenticationException("auth required"));

    assertThat(response.getStatus()).isEqualTo(401);
    assertThat(response.getContentAsString())
        .contains(ErrorCode.AUTH_REQUIRED)
        .contains("認証が必要です。");
  }
}
