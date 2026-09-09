package com.serverhub.server;

import static org.assertj.core.api.Assertions.assertThat;
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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * サーバー・タグ API を実 DB（Testcontainers）に対して確認する（詳細設計 03-server）。
 *
 * <p>enum の DB 文字列変換（D-SRV-01 / DomainConverter）、楽観ロック（BR-08）、タグ AND 絞り込み（B5）、 論理削除（BR-01）など、実 DB
 * でしか検証できない箇所を対象にする。実行にはローカルの Docker が必要。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ServerApiIntegrationTest {

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

  private String createServerBody(String hostname, String environment, String... tags) {
    StringBuilder tagsJson = new StringBuilder("[");
    for (int i = 0; i < tags.length; i++) {
      tagsJson.append(i == 0 ? "" : ",").append('"').append(tags[i]).append('"');
    }
    tagsJson.append("]");
    return """
        {"hostname":"%s","ipAddress":"10.1.2.3","environment":"%s","status":"active",\
        "description":"d","os":"Ubuntu","osVersion":"22.04","virtualizationType":"virtual",\
        "location":"tokyo","owner":"team","tags":%s}"""
        .formatted(hostname, environment, tagsJson);
  }

  private long createServer(String body) throws Exception {
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

  @Test
  void createThenGet_roundTripsEnumsAndTags() throws Exception {
    String host = "web-" + UUID.randomUUID();
    long id = createServer(createServerBody(host, "production", "web", "customer-x"));

    mockMvc
        .perform(authed(get("/api/v1/servers/" + id)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hostname").value(host))
        .andExpect(jsonPath("$.environment").value("production"))
        .andExpect(jsonPath("$.status").value("active"))
        .andExpect(jsonPath("$.virtualizationType").value("virtual"))
        .andExpect(jsonPath("$.version").value(0))
        // 日時はオフセット付き ISO 8601（D-API-05）。UTC なら Z、JST なら +09:00 等
        .andExpect(
            jsonPath("$.createdAt", org.hamcrest.Matchers.matchesRegex(".*(Z|[+-]\\d{2}:\\d{2})$")))
        .andExpect(
            jsonPath("$.updatedAt", org.hamcrest.Matchers.matchesRegex(".*(Z|[+-]\\d{2}:\\d{2})$")))
        // クラウド連携なしのサーバーは cloudLink / cloudState を出さない（FR-CLOUD-01、加算的変更）
        .andExpect(jsonPath("$.cloudLink").doesNotExist())
        .andExpect(
            jsonPath("$.tags", org.hamcrest.Matchers.containsInAnyOrder("web", "customer-x")));

    mockMvc
        .perform(authed(get("/api/v1/servers")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].cloudState").doesNotExist());
  }

  @Test
  void createWithDuplicateActiveHostname_returns409() throws Exception {
    String host = "dup-" + UUID.randomUUID();
    createServer(createServerBody(host, "staging"));

    mockMvc
        .perform(
            authed(post("/api/v1/servers"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(createServerBody(host, "staging")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value(ErrorCode.DUPLICATE_HOSTNAME));
  }

  @Test
  void list_filtersByTagAnd_andHonorsPagingShape() throws Exception {
    String tagA = "t" + UUID.randomUUID().toString().substring(0, 8);
    String tagB = "t" + UUID.randomUUID().toString().substring(0, 8);
    long both = createServer(createServerBody("h1-" + UUID.randomUUID(), "production", tagA, tagB));
    createServer(createServerBody("h2-" + UUID.randomUUID(), "production", tagA));

    mockMvc
        .perform(authed(get("/api/v1/servers").param("tags", tagA).param("tags", tagB)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.number").value(0))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andExpect(jsonPath("$.content[0].id").value((int) both));
  }

  @Test
  void list_withUnknownTag_returnsEmpty() throws Exception {
    mockMvc
        .perform(authed(get("/api/v1/servers").param("tags", "no-such-tag-" + UUID.randomUUID())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()").value(0))
        .andExpect(jsonPath("$.page.totalElements").value(0));
  }

  @Test
  void update_withStaleVersion_returns409() throws Exception {
    long id = createServer(createServerBody("stale-" + UUID.randomUUID(), "development"));
    String updateBody =
        """
        {"hostname":"stale-renamed-%s","ipAddress":"10.1.2.3","environment":"development",\
        "status":"maintenance","description":"d","os":"Ubuntu","osVersion":"22.04",\
        "virtualizationType":"virtual","location":"tokyo","owner":"team","tags":[],"version":99}"""
            .formatted(UUID.randomUUID());

    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + id))
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value(ErrorCode.OPTIMISTIC_LOCK_CONFLICT));
  }

  @Test
  void update_replacesTagsAndBumpsVersion() throws Exception {
    String host = "upd-" + UUID.randomUUID();
    long id = createServer(createServerBody(host, "staging", "old1", "old2"));
    String body =
        """
        {"hostname":"%s","ipAddress":"10.1.2.3","environment":"staging","status":"active",\
        "description":"d","os":"Ubuntu","osVersion":"22.04","virtualizationType":"virtual",\
        "location":"tokyo","owner":"team","tags":["new1"],"version":0}"""
            .formatted(host);

    mockMvc
        .perform(
            authed(put("/api/v1/servers/" + id))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.version").value(1))
        .andExpect(jsonPath("$.tags", org.hamcrest.Matchers.contains("new1")));
  }

  @Test
  void delete_softDeletes_thenGetIs404() throws Exception {
    long id = createServer(createServerBody("del-" + UUID.randomUUID(), "production"));

    mockMvc.perform(authed(delete("/api/v1/servers/" + id))).andExpect(status().isNoContent());
    mockMvc.perform(authed(get("/api/v1/servers/" + id))).andExpect(status().isNotFound());
    mockMvc.perform(authed(delete("/api/v1/servers/" + id))).andExpect(status().isNotFound());
  }

  @Test
  void get_unknownId_returns404() throws Exception {
    mockMvc
        .perform(authed(get("/api/v1/servers/999999")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value(ErrorCode.RESOURCE_NOT_FOUND));
  }

  @Test
  void list_withUndefinedSortKey_returns400() throws Exception {
    mockMvc
        .perform(authed(get("/api/v1/servers").param("sort", "bogus")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_ERROR));
  }

  @Test
  void servers_withoutAuthentication_returns401() throws Exception {
    mockMvc.perform(get("/api/v1/servers")).andExpect(status().isUnauthorized());
  }

  @Test
  void tagSuggest_returnsPrefixMatches() throws Exception {
    createServer(createServerBody("sug-" + UUID.randomUUID(), "production", "suggestme-alpha"));

    mockMvc
        .perform(authed(get("/api/v1/tags/suggest").param("prefix", "suggestme-")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", org.hamcrest.Matchers.hasItem("suggestme-alpha")));
  }
}
