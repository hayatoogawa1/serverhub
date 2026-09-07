package com.serverhub.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * メンテナンス履歴 API を実 DB（Testcontainers）に対して確認する（詳細設計 04-maintenance）。
 *
 * <p>種別 enum の DB 文字列変換（DomainConverter）、対象サーバーの存在確認（BR-06、D-MNT-02）、 削除済みサーバーの履歴の見え方（F4 /
 * BR-09）など、実 DB でしか検証できない箇所を対象にする。実行にはローカルの Docker が必要。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class MaintenanceHistoryApiIntegrationTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

  @Autowired private MockMvc mockMvc;

  private MockHttpSession session;
  private Cookie csrf;

  @BeforeEach
  void login() throws Exception {
    MvcResult primer = mockMvc.perform(get("/api/v1/auth/me")).andReturn();
    csrf = primer.getResponse().getCookie("XSRF-TOKEN");
    assertThat(csrf).isNotNull();

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
    assertThat(session).isNotNull();
  }

  private MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder builder) {
    return builder.session(session).cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue());
  }

  private long createServer(String hostname) throws Exception {
    String body =
        """
        {"hostname":"%s","ipAddress":"10.1.2.3","environment":"production","status":"active",\
        "description":"d","tags":[]}"""
            .formatted(hostname);
    MvcResult result =
        mockMvc
            .perform(
                authed(post("/api/v1/servers"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isCreated())
            .andReturn();
    return com.jayway.jsonpath.JsonPath.parse(result.getResponse().getContentAsString())
        .read("$.id", Long.class);
  }

  private String createHistoryBody(long serverId) {
    return """
        {"serverId":%d,"performedDate":"2030-01-15","type":"patch","worker":"ops",\
        "content":"applied security patches","impact":"5m downtime","result":"ok"}"""
        .formatted(serverId);
  }

  private long createHistory(long serverId) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                authed(post("/api/v1/maintenance-histories"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createHistoryBody(serverId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.type").value("patch"))
            .andExpect(jsonPath("$.performedDate").value("2030-01-15"))
            .andReturn();
    return com.jayway.jsonpath.JsonPath.parse(result.getResponse().getContentAsString())
        .read("$.id", Long.class);
  }

  @Test
  void create_thenReadBackViaServerSubresource() throws Exception {
    long serverId = createServer("mnt-" + UUID.randomUUID());
    long historyId = createHistory(serverId);

    mockMvc
        .perform(authed(get("/api/v1/servers/" + serverId + "/maintenance-histories")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].id").value((int) historyId))
        .andExpect(jsonPath("$.content[0].content").value("applied security patches"))
        .andExpect(jsonPath("$.content[0].type").value("patch"));
  }

  @Test
  void create_forMissingServer_returns404() throws Exception {
    mockMvc
        .perform(
            authed(post("/api/v1/maintenance-histories"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(createHistoryBody(999999L)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value(ErrorCode.RESOURCE_NOT_FOUND));
  }

  @Test
  void create_withBlankWorker_returns400() throws Exception {
    long serverId = createServer("mnt-" + UUID.randomUUID());
    String body =
        """
        {"serverId":%d,"performedDate":"2026-09-07","type":"patch","worker":"","content":"x"}"""
            .formatted(serverId);

    mockMvc
        .perform(
            authed(post("/api/v1/maintenance-histories"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_ERROR));
  }

  @Test
  void globalList_filtersByServerId_andKeepsDeletedServerHistory() throws Exception {
    long serverId = createServer("mnt-del-" + UUID.randomUUID());
    long historyId = createHistory(serverId);

    mockMvc
        .perform(authed(delete("/api/v1/servers/" + serverId)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            authed(
                get("/api/v1/maintenance-histories").param("serverId", String.valueOf(serverId))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()").value(1))
        .andExpect(jsonPath("$.content[0].id").value((int) historyId))
        .andExpect(jsonPath("$.content[0].serverDeleted").value(true));
  }

  @Test
  void serverSubresource_forMissingServer_returns404() throws Exception {
    mockMvc
        .perform(authed(get("/api/v1/servers/999999/maintenance-histories")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value(ErrorCode.RESOURCE_NOT_FOUND));
  }

  @Test
  void globalList_withUndefinedSortKey_returns400() throws Exception {
    mockMvc
        .perform(authed(get("/api/v1/maintenance-histories").param("sort", "bogus")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_ERROR));
  }

  @Test
  void maintenanceHistories_withoutAuthentication_returns401() throws Exception {
    mockMvc.perform(get("/api/v1/maintenance-histories")).andExpect(status().isUnauthorized());
  }
}
