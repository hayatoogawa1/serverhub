package com.serverhub.cloud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.serverhub.server.Environment;
import com.serverhub.server.Server;
import com.serverhub.server.ServerDao;
import com.serverhub.server.Status;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * {@code server_cloud_links}（V3）を実 DB（Testcontainers）に対して確認する（FR-CLOUD-01、07-aws-ec2-integration
 * §4）。
 *
 * <p>enum の DB 文字列往復（{@link CloudProvider} / {@link CloudInstanceState}）、一意制約、監査列の自動設定など、 実 DB
 * でしか検証できない箇所を対象にする。API・Service は未実装（9-3）なので DAO を直接叩く。 実行にはローカルの Docker が必要。
 */
@SpringBootTest
@Testcontainers
@Transactional
class ServerCloudLinkDaoIntegrationTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

  @Autowired private ServerCloudLinkDao dao;
  @Autowired private ServerDao serverDao;

  private long serverId;

  @BeforeEach
  void createServer() {
    serverId = insertServer();
  }

  private long insertServer() {
    Server server =
        new Server(
            null,
            "cloud-link-test-" + UUID.randomUUID(),
            null,
            Environment.DEVELOPMENT,
            Status.ACTIVE,
            null,
            null,
            null,
            null,
            null,
            null,
            0L,
            null,
            null,
            null);
    return serverDao.insert(server).getEntity().id();
  }

  private ServerCloudLink newLink(long forServerId, String externalId) {
    return new ServerCloudLink(
        null,
        forServerId,
        CloudProvider.AWS_EC2,
        externalId,
        "ap-northeast-1",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null);
  }

  @Test
  void insertThenSelectByServerId_roundTripsEnumsAndSetsAuditColumns() {
    dao.insert(newLink(serverId, "i-0123456789abcdef0"));

    ServerCloudLink found = dao.selectByServerId(serverId).orElseThrow();
    assertThat(found.provider()).isEqualTo(CloudProvider.AWS_EC2);
    assertThat(found.externalId()).isEqualTo("i-0123456789abcdef0");
    assertThat(found.region()).isEqualTo("ap-northeast-1");
    assertThat(found.state()).isNull();
    assertThat(found.stateFetchedAt()).isNull();
    assertThat(found.createdAt()).isNotNull();
    assertThat(found.updatedAt()).isNotNull();
  }

  @Test
  void state_roundTripsNormalizedEnum() {
    ServerCloudLink link =
        new ServerCloudLink(
            null,
            serverId,
            CloudProvider.AWS_EC2,
            "i-aaa111",
            "ap-northeast-1",
            null,
            CloudInstanceState.STOPPED,
            "stopped",
            LocalDateTime.now(),
            null,
            null,
            null,
            null);
    dao.insert(link);

    assertThat(dao.selectByServerId(serverId).orElseThrow().state())
        .isEqualTo(CloudInstanceState.STOPPED);
  }

  @Test
  void selectByServerIds_returnsOnlyMatchingLinks() {
    long serverId2 = insertServer();
    long serverId3 = insertServer();
    dao.insert(newLink(serverId, "i-batch-1"));
    dao.insert(newLink(serverId2, "i-batch-2"));
    // serverId3 は紐付けなし

    List<ServerCloudLink> links = dao.selectByServerIds(List.of(serverId, serverId2, serverId3));

    assertThat(links).extracting(ServerCloudLink::serverId).containsExactly(serverId, serverId2);
  }

  @Test
  void update_replacesLinkage() {
    dao.insert(newLink(serverId, "i-old"));
    ServerCloudLink current = dao.selectByServerId(serverId).orElseThrow();

    ServerCloudLink replaced =
        new ServerCloudLink(
            current.id(),
            current.serverId(),
            CloudProvider.AWS_EC2,
            "i-new",
            "ap-northeast-1",
            null,
            null,
            null,
            null,
            null,
            null,
            current.createdAt(),
            current.updatedAt());
    dao.update(replaced);

    assertThat(dao.selectByServerId(serverId).orElseThrow().externalId()).isEqualTo("i-new");
  }

  @Test
  void deleteByServerId_removesTheLink() {
    dao.insert(newLink(serverId, "i-to-delete"));

    int deleted = dao.deleteByServerId(serverId);

    assertThat(deleted).isEqualTo(1);
    assertThat(dao.selectByServerId(serverId)).isEmpty();
  }

  @Test
  void oneLinkPerServer_secondInsertViolatesUnique() {
    dao.insert(newLink(serverId, "i-first"));

    assertThatThrownBy(() -> dao.insert(newLink(serverId, "i-second")))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void sameInstanceOnTwoServers_violatesUnique() {
    long serverId2 = insertServer();
    dao.insert(newLink(serverId, "i-shared"));

    assertThatThrownBy(() -> dao.insert(newLink(serverId2, "i-shared")))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void selectByServerId_missing_returnsEmpty() {
    assertThat(dao.selectByServerId(serverId)).isEmpty();
  }
}
