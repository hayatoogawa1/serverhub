package com.serverhub.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * ダッシュボード集計 API を実 DB（Testcontainers）に対して確認する（詳細設計 05-dashboard）。
 *
 * <p>集計は全サーバー横断（グローバル）のため、各テストが対象データセット全体を支配できるよう {@link Transactional} でテストごとにロールバックして分離する。0
 * 件補完（D-DASH-01）、削除済みサーバーの除外（D-DASH-03 / BR-01 / BR-09）、enum の DB 文字列往復など、実 DB
 * でしか検証できない箇所を対象にする。実行にはローカルの Docker が必要。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Transactional
class DashboardApiIntegrationTest {

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

  private long createServer(String environment, String status, String... tags) throws Exception {
    StringBuilder tagsJson = new StringBuilder("[");
    for (int i = 0; i < tags.length; i++) {
      tagsJson.append(i == 0 ? "" : ",").append('"').append(tags[i]).append('"');
    }
    tagsJson.append("]");
    String body =
        """
        {"hostname":"%s","ipAddress":"10.1.2.3","environment":"%s","status":"%s",\
        "description":"d","tags":%s}"""
            .formatted("dash-" + UUID.randomUUID(), environment, status, tagsJson);
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

  private void addMaintenance(long serverId, String performedDate) throws Exception {
    String body =
        """
        {"serverId":%d,"performedDate":"%s","type":"patch","worker":"ops","content":"c"}"""
            .formatted(serverId, performedDate);
    mockMvc
        .perform(
            authed(post("/api/v1/maintenance-histories"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isCreated());
  }

  private void deleteServer(long serverId) throws Exception {
    mockMvc
        .perform(authed(delete("/api/v1/servers/" + serverId)))
        .andExpect(status().isNoContent());
  }

  @Test
  void summary_withNoData_returnsZeroFilledBuckets() throws Exception {
    mockMvc
        .perform(authed(get("/api/v1/dashboard/summary")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalServers").value(0))
        .andExpect(jsonPath("$.serversByEnvironment.length()").value(3))
        .andExpect(jsonPath("$.serversByEnvironment[0].environment").value("production"))
        .andExpect(jsonPath("$.serversByEnvironment[0].count").value(0))
        .andExpect(jsonPath("$.serversByEnvironment[1].environment").value("staging"))
        .andExpect(jsonPath("$.serversByEnvironment[2].environment").value("development"))
        .andExpect(jsonPath("$.serversByStatus.length()").value(3))
        .andExpect(jsonPath("$.serversByStatus[0].status").value("active"))
        .andExpect(jsonPath("$.serversByStatus[1].status").value("maintenance"))
        .andExpect(jsonPath("$.serversByStatus[2].status").value("retired"))
        .andExpect(jsonPath("$.topTags.length()").value(0))
        .andExpect(jsonPath("$.otherTagsCount").value(0))
        .andExpect(jsonPath("$.recentMaintenanceHistories.length()").value(0));
  }

  @Test
  void summary_aggregatesServersTagsAndRecentMaintenance() throws Exception {
    long prodActive = createServer("production", "active", "web", "db");
    createServer("production", "maintenance", "web");
    createServer("staging", "active");
    addMaintenance(prodActive, "2030-02-01");

    mockMvc
        .perform(authed(get("/api/v1/dashboard/summary")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalServers").value(3))
        .andExpect(jsonPath("$.serversByEnvironment[0].count").value(2)) // production
        .andExpect(jsonPath("$.serversByEnvironment[1].count").value(1)) // staging
        .andExpect(jsonPath("$.serversByEnvironment[2].count").value(0)) // development
        .andExpect(jsonPath("$.serversByStatus[0].count").value(2)) // active
        .andExpect(jsonPath("$.serversByStatus[1].count").value(1)) // maintenance
        .andExpect(jsonPath("$.serversByStatus[2].count").value(0)) // retired
        .andExpect(jsonPath("$.topTags.length()").value(2))
        .andExpect(jsonPath("$.topTags[0].tagName").value("web")) // 件数降順
        .andExpect(jsonPath("$.topTags[0].count").value(2))
        .andExpect(jsonPath("$.topTags[1].tagName").value("db"))
        .andExpect(jsonPath("$.topTags[1].count").value(1))
        .andExpect(jsonPath("$.otherTagsCount").value(0))
        .andExpect(jsonPath("$.recentMaintenanceHistories.length()").value(1))
        .andExpect(jsonPath("$.recentMaintenanceHistories[0].serverId").value((int) prodActive))
        .andExpect(jsonPath("$.recentMaintenanceHistories[0].performedDate").value("2030-02-01"))
        .andExpect(jsonPath("$.recentMaintenanceHistories[0].type").value("patch"));
  }

  @Test
  void summary_excludesDeletedServersAndTheirMaintenance() throws Exception {
    long kept = createServer("production", "active");
    long removed = createServer("production", "active");
    addMaintenance(kept, "2030-03-01");
    addMaintenance(removed, "2030-03-02");
    deleteServer(removed);

    mockMvc
        .perform(authed(get("/api/v1/dashboard/summary")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalServers").value(1))
        .andExpect(jsonPath("$.serversByEnvironment[0].count").value(1))
        .andExpect(jsonPath("$.recentMaintenanceHistories.length()").value(1))
        .andExpect(jsonPath("$.recentMaintenanceHistories[0].serverId").value((int) kept));
  }

  @Test
  void summary_splitsTagsIntoTop10PlusOther() throws Exception {
    // 11 タグ、各 1 サーバー（件数はすべて 1、タグ名昇順で並ぶ）
    for (int i = 1; i <= 11; i++) {
      createServer("production", "active", String.format("tag-%02d", i));
    }

    mockMvc
        .perform(authed(get("/api/v1/dashboard/summary")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.topTags.length()").value(10))
        .andExpect(jsonPath("$.topTags[0].tagName").value("tag-01"))
        .andExpect(jsonPath("$.topTags[9].tagName").value("tag-10"))
        .andExpect(jsonPath("$.otherTagsCount").value(1)); // tag-11
  }

  @Test
  void summary_withoutAuthentication_returns401() throws Exception {
    mockMvc.perform(get("/api/v1/dashboard/summary")).andExpect(status().isUnauthorized());
  }
}
