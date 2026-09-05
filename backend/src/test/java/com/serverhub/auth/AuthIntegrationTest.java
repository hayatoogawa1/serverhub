package com.serverhub.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.serverhub.common.error.ErrorCode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * ログイン〜認証状態確認〜ログアウトの一連の流れを実 DB（Testcontainers）に対して確認する （詳細設計 02-auth / 04-security、Flyway
 * V2__seed_admin_user.sql のシードユーザーを使用）。
 *
 * <p>実行にはローカルの Docker が必要（{@link com.serverhub.ServerHubApplicationTests} と同様）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthIntegrationTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

  @Autowired private MockMvc mockMvc;

  private Cookie fetchCsrfCookie() throws Exception {
    MvcResult result = mockMvc.perform(get("/api/v1/auth/me")).andReturn();
    Cookie csrfCookie = result.getResponse().getCookie("XSRF-TOKEN");
    assertThat(csrfCookie)
        .as("XSRF-TOKEN cookie should be issued eagerly (CsrfCookieFilter)")
        .isNotNull();
    return csrfCookie;
  }

  @Test
  void unauthenticatedMeReturns401() throws Exception {
    mockMvc
        .perform(get("/api/v1/auth/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value(ErrorCode.AUTH_REQUIRED));
  }

  @Test
  void loginWithValidCredentialsThenMeSucceeds() throws Exception {
    Cookie csrfCookie = fetchCsrfCookie();

    MvcResult loginResult =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"admin@serverhub.local\",\"password\":\"password\"}")
                    .cookie(csrfCookie)
                    .header("X-XSRF-TOKEN", csrfCookie.getValue()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("admin@serverhub.local"))
            .andExpect(jsonPath("$.displayName").value("デモ管理者"))
            .andReturn();

    Cookie sessionCookie = loginResult.getResponse().getCookie("JSESSIONID");
    assertThat(sessionCookie).isNotNull();

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("admin@serverhub.local"));
  }

  @Test
  void loginWithWrongPasswordReturns401WithoutRevealingReason() throws Exception {
    Cookie csrfCookie = fetchCsrfCookie();

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@serverhub.local\",\"password\":\"wrong-password\"}")
                .cookie(csrfCookie)
                .header("X-XSRF-TOKEN", csrfCookie.getValue()))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value(ErrorCode.AUTH_BAD_CREDENTIALS));
  }

  @Test
  void loginWithUnknownEmailReturns401WithSameMessageAsWrongPassword() throws Exception {
    Cookie csrfCookie = fetchCsrfCookie();

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nobody@serverhub.local\",\"password\":\"password\"}")
                .cookie(csrfCookie)
                .header("X-XSRF-TOKEN", csrfCookie.getValue()))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value(ErrorCode.AUTH_BAD_CREDENTIALS));
  }

  @Test
  void loginWithMissingPasswordReturns400() throws Exception {
    Cookie csrfCookie = fetchCsrfCookie();

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@serverhub.local\"}")
                .cookie(csrfCookie)
                .header("X-XSRF-TOKEN", csrfCookie.getValue()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_ERROR));
  }

  @Test
  void loginWithoutCsrfTokenIsForbidden() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@serverhub.local\",\"password\":\"password\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void logoutInvalidatesSession() throws Exception {
    Cookie csrfCookie = fetchCsrfCookie();
    MvcResult loginResult =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"admin@serverhub.local\",\"password\":\"password\"}")
                    .cookie(csrfCookie)
                    .header("X-XSRF-TOKEN", csrfCookie.getValue()))
            .andExpect(status().isOk())
            .andReturn();
    Cookie sessionCookie = loginResult.getResponse().getCookie("JSESSIONID");

    mockMvc
        .perform(
            post("/api/v1/auth/logout")
                .cookie(sessionCookie, csrfCookie)
                .header("X-XSRF-TOKEN", csrfCookie.getValue()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(sessionCookie))
        .andExpect(status().isUnauthorized());
  }
}
