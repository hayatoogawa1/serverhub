package com.serverhub.cloud;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.serverhub.common.error.ErrorCode;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * クラウド連携サブリソース API を実 DB（Testcontainers）に対して確認する（FR-CLOUD-01、07-aws-ec2-integration §5.2）。
 *
 * <p>既定設定（{@code serverhub.cloud.enabled=false}）なので provider は {@link
 * DisabledCloudStateProviderImpl}。 AWS へは一切アクセスしない。{@code refresh} は {@code 503
 * CLOUD_PROVIDER_UNAVAILABLE} になる。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Transactional
class CloudLinkApiIntegrationTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

  @Autowired private MockMvc mockMvc;

  private MockHttpSession session;
  private Cookie csrf;

  @BeforeEach
  void login() throws Exception {
    MvcResult primer = mockMvc.perform(get("/api/v1/auth/me")).andReturn();
    csrf = primer.getResponse().getCookie("XSRF-TOKEN");
    MvcResult loginResult =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"admin@serverhub.local\",\"password\":\"password\"}")
                    .cookie(csrf)
                    .header("X-XSRF-TOKEN", csrf.getValue()))
            .andExpect(status().isOk())
            .andReturn();
    session = (MockHttpSession) loginResult.getRequest().getSession(false);
  }

  private MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder b) {
    return b.session(session).cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue());
  }

  private long createServer() throws Exception {
    String body =
        """
        {"hostname":"cloud-api-%s","environment":"development","status":"active","tags":[]}"""
            .formatted(UUID.randomUUID());
    MvcResult r =
        mockMvc
            .perform(
                authed(post("/api/v1/servers"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isCreated())
            .andReturn();
    return com.jayway.jsonpath.JsonPath.parse(r.getResponse().getContentAsString())
        .read("$.id", Long.class);
  }

  private String linkBody(String instanceId) {
    return "{\"provider\":\"aws_ec2\",\"externalId\":\"" + instanceId + "\"}";
  }

  @Test
  void putThenGetServer_showsCloudLink_withoutBumpingVersion() throws Exception {
    long id = createServer();

    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + id + "/cloud-link"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody("i-0123456789abcdef0")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.provider").value("aws_ec2"))
        .andExpect(jsonPath("$.externalId").value("i-0123456789abcdef0"))
        .andExpect(jsonPath("$.region").value("ap-northeast-1"))
        .andExpect(jsonPath("$.state").doesNotExist())
        .andExpect(jsonPath("$.stale").value(false));

    mockMvc
        .perform(authed(get("/api/v1/servers/" + id)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.cloudLink.externalId").value("i-0123456789abcdef0"))
        .andExpect(jsonPath("$.version").value(0)) // 紐付けで servers.version はバンプしない（P7）
        .andExpect(jsonPath("$.status").value("active")); // 管理ステータスは不変
  }

  @Test
  void getServer_withoutLink_hasNoCloudLinkField() throws Exception {
    long id = createServer();
    mockMvc
        .perform(authed(get("/api/v1/servers/" + id)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.cloudLink").doesNotExist());
  }

  @Test
  void put_invalidInstanceId_returns400() throws Exception {
    long id = createServer();
    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + id + "/cloud-link"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody("not-an-instance-id")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_ERROR));
  }

  @Test
  void put_sameInstanceOnAnotherServer_returns409() throws Exception {
    long a = createServer();
    long b = createServer();
    String instance = "i-aaaaaaaaaaaaaaaaa";
    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + a + "/cloud-link"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody(instance)))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + b + "/cloud-link"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody(instance)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value(ErrorCode.CLOUD_LINK_CONFLICT));
  }

  @Test
  void put_unknownServer_returns404() throws Exception {
    mockMvc
        .perform(
            authed(put("/api/v1/servers/999999/cloud-link"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody("i-0123456789abcdef0")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value(ErrorCode.RESOURCE_NOT_FOUND));
  }

  @Test
  void delete_isIdempotent_returns204() throws Exception {
    long id = createServer();
    mockMvc
        .perform(authed(delete("/api/v1/servers/" + id + "/cloud-link")))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + id + "/cloud-link"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody("i-0123456789abcdef0")))
        .andExpect(status().isOk());
    mockMvc
        .perform(authed(delete("/api/v1/servers/" + id + "/cloud-link")))
        .andExpect(status().isNoContent());
    mockMvc
        .perform(authed(delete("/api/v1/servers/" + id + "/cloud-link")))
        .andExpect(status().isNoContent());
  }

  @Test
  void refresh_whenProviderDisabled_returns503() throws Exception {
    long id = createServer();
    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + id + "/cloud-link"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody("i-0123456789abcdef0")))
        .andExpect(status().isOk());

    mockMvc
        .perform(authed(post("/api/v1/servers/" + id + "/cloud-link/refresh")))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.code").value(ErrorCode.CLOUD_PROVIDER_UNAVAILABLE));
  }

  @Test
  void cloudLink_withoutAuthentication_returns401() throws Exception {
    // CSRF トークンは付けて（＝ CSRF で弾かれない）認証だけ欠いた状態
    mockMvc
        .perform(
            put("/api/v1/servers/1/cloud-link")
                .cookie(csrf)
                .header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody("i-0123456789abcdef0")))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void deletedServer_cloudLinkRemains_butServerGetIs404() throws Exception {
    long id = createServer();
    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + id + "/cloud-link"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(linkBody("i-0123456789abcdef0")))
        .andExpect(status().isOk());

    mockMvc.perform(authed(delete("/api/v1/servers/" + id))).andExpect(status().isNoContent());

    // サーバー詳細は 404、cloud-link 操作も 404（サーバーが消えているため）
    mockMvc.perform(authed(get("/api/v1/servers/" + id))).andExpect(status().isNotFound());
    mockMvc
        .perform(authed(post("/api/v1/servers/" + id + "/cloud-link/refresh")))
        .andExpect(status().isNotFound());
  }
}
