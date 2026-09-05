package com.serverhub.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serverhub.common.error.ErrorCode;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

/**
 * {@link JsonLoginAuthenticationFilter} が FR-AUTH-01 の 400（未入力・形式）/401（資格情報不正）を 正しく作り分けることを確認する。
 */
class JsonLoginAuthenticationFilterTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
  private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
  private final AuthenticationSuccessHandler successHandler =
      mock(AuthenticationSuccessHandler.class);
  private final AuthenticationFailureHandler failureHandler =
      mock(AuthenticationFailureHandler.class);

  private JsonLoginAuthenticationFilter newFilter() {
    JsonLoginAuthenticationFilter filter =
        new JsonLoginAuthenticationFilter(objectMapper, validator);
    filter.setAuthenticationManager(authenticationManager);
    filter.setAuthenticationSuccessHandler(successHandler);
    filter.setAuthenticationFailureHandler(failureHandler);
    return filter;
  }

  private MockHttpServletRequest loginRequest(String body) {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
    request.setContentType(MediaType.APPLICATION_JSON_VALUE);
    request.setContent(body.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    return request;
  }

  @Test
  void validCredentialsAreDelegatedToAuthenticationManager() throws Exception {
    Authentication authenticated = mock(Authentication.class);
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);

    MockHttpServletRequest request =
        loginRequest("{\"email\":\"admin@serverhub.local\",\"password\":\"password\"}");
    MockHttpServletResponse response = new MockHttpServletResponse();

    newFilter().doFilter(request, response, new MockFilterChain());

    verify(authenticationManager)
        .authenticate(
            org.mockito.ArgumentMatchers.argThat(
                token ->
                    token instanceof UsernamePasswordAuthenticationToken t
                        && "admin@serverhub.local".equals(t.getPrincipal())
                        && "password".equals(t.getCredentials())));
    verify(successHandler).onAuthenticationSuccess(request, response, authenticated);
    verify(failureHandler, never()).onAuthenticationFailure(any(), any(), any());
  }

  @Test
  void missingPasswordShortCircuitsWith400WithoutCallingAuthenticationManager() throws Exception {
    MockHttpServletRequest request = loginRequest("{\"email\":\"admin@serverhub.local\"}");
    MockHttpServletResponse response = new MockHttpServletResponse();

    newFilter().doFilter(request, response, new MockFilterChain());

    assertThat(response.getStatus()).isEqualTo(400);
    assertThat(response.getContentAsString()).contains(ErrorCode.VALIDATION_ERROR);
    verify(authenticationManager, never()).authenticate(any());
    verify(failureHandler, never()).onAuthenticationFailure(any(), any(), any());
  }

  @Test
  void malformedJsonShortCircuitsWith400() throws Exception {
    MockHttpServletRequest request = loginRequest("not-json");
    MockHttpServletResponse response = new MockHttpServletResponse();

    newFilter().doFilter(request, response, new MockFilterChain());

    assertThat(response.getStatus()).isEqualTo(400);
    assertThat(response.getContentAsString()).contains(ErrorCode.VALIDATION_ERROR);
    verify(authenticationManager, never()).authenticate(any());
  }

  @Test
  void badCredentialsIsDelegatedToFailureHandler() throws Exception {
    when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));

    MockHttpServletRequest request =
        loginRequest("{\"email\":\"admin@serverhub.local\",\"password\":\"wrong\"}");
    MockHttpServletResponse response = new MockHttpServletResponse();

    newFilter().doFilter(request, response, new MockFilterChain());

    verify(failureHandler)
        .onAuthenticationFailure(
            org.mockito.ArgumentMatchers.eq(request),
            org.mockito.ArgumentMatchers.eq(response),
            org.mockito.ArgumentMatchers.any(BadCredentialsException.class));
  }
}
