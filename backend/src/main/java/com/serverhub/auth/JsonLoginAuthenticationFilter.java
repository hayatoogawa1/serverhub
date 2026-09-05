package com.serverhub.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serverhub.common.error.ApiError;
import com.serverhub.common.error.FieldError;
import com.serverhub.common.web.RequestLoggingFilter;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * ログインを JSON ボディ（{@code { "email": "...", "password": "..." }}）で受け付ける（詳細設計 02-auth §3.3
 * D-AUTH-03）。他の全 API が JSON のため、ログインだけフォーム形式にして一貫性を 崩さない。
 *
 * <p>入力形式エラー（未入力・形式）は {@code authenticate()} を呼ぶ前にここで検出し、 {@link #unsuccessfulAuthentication} 内で直接
 * {@code 400} を書いて短絡させる。資格情報不正 （{@code authenticate()} が投げる {@code AuthenticationException}）は既定どおり
 * {@link LoginFailureHandler} に委譲し {@code 401} になる（FR-AUTH-01 の 400/401 の区別）。
 */
public class JsonLoginAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

  public static final String ATTEMPTED_EMAIL_ATTRIBUTE = "attemptedEmail";

  private final ObjectMapper objectMapper;
  private final Validator validator;

  public JsonLoginAuthenticationFilter(ObjectMapper objectMapper, Validator validator) {
    this.objectMapper = objectMapper;
    this.validator = validator;
    setFilterProcessesUrl("/api/v1/auth/login");
  }

  @Override
  public Authentication attemptAuthentication(
      HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
    LoginRequest loginRequest = parse(request);
    request.setAttribute(ATTEMPTED_EMAIL_ATTRIBUTE, loginRequest.email());

    Set<ConstraintViolation<LoginRequest>> violations = validator.validate(loginRequest);
    if (!violations.isEmpty()) {
      throw new LoginValidationException(toFieldErrors(violations));
    }

    UsernamePasswordAuthenticationToken authRequest =
        new UsernamePasswordAuthenticationToken(loginRequest.email(), loginRequest.password());
    setDetails(request, authRequest);
    return getAuthenticationManager().authenticate(authRequest);
  }

  @Override
  protected void unsuccessfulAuthentication(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException failed)
      throws IOException, ServletException {
    if (failed instanceof LoginValidationException validationException) {
      respondValidationError(response, validationException.getFieldErrors());
      return;
    }
    super.unsuccessfulAuthentication(request, response, failed);
  }

  private LoginRequest parse(HttpServletRequest request) {
    try {
      LoginRequest parsed = objectMapper.readValue(request.getInputStream(), LoginRequest.class);
      return parsed != null ? parsed : new LoginRequest(null, null);
    } catch (IOException e) {
      // 不正な JSON は空のリクエストとして扱い、後続の Bean Validation で 400 にする
      // （資格情報の失敗と区別するため、ここでは AuthenticationException を投げない）。
      return new LoginRequest(null, null);
    }
  }

  private static List<FieldError> toFieldErrors(Set<ConstraintViolation<LoginRequest>> violations) {
    return violations.stream()
        .map(v -> new FieldError(v.getPropertyPath().toString(), v.getMessage()))
        .toList();
  }

  private void respondValidationError(HttpServletResponse response, List<FieldError> errors)
      throws IOException {
    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    ApiError body =
        ApiError.validation(
            "入力内容を確認してください。", MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY), errors);
    objectMapper.writeValue(response.getWriter(), body);
  }

  private static final class LoginValidationException extends AuthenticationException {

    private final transient List<FieldError> fieldErrors;

    LoginValidationException(List<FieldError> fieldErrors) {
      super("invalid login request");
      this.fieldErrors = fieldErrors;
    }

    List<FieldError> getFieldErrors() {
      return fieldErrors;
    }
  }
}
