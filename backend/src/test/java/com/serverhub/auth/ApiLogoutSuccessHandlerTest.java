package com.serverhub.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiLogoutSuccessHandlerTest {

  private final ApiLogoutSuccessHandler handler = new ApiLogoutSuccessHandler();

  @Test
  void respondsWithNoContent() {
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.onLogoutSuccess(new MockHttpServletRequest(), response, null);

    assertThat(response.getStatus()).isEqualTo(204);
    assertThat(response.getContentAsByteArray()).isEmpty();
  }
}
