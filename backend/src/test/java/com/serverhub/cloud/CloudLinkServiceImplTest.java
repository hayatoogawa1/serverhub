package com.serverhub.cloud;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.serverhub.common.error.ResourceNotFoundException;
import com.serverhub.server.Environment;
import com.serverhub.server.Server;
import com.serverhub.server.ServerDao;
import com.serverhub.server.Status;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CloudLinkServiceImplTest {

  @Mock private ServerCloudLinkDao linkDao;
  @Mock private ServerDao serverDao;
  @Mock private CloudStateProvider stateProvider;

  private final CloudProperties properties =
      new CloudProperties(true, Duration.ofMinutes(5), Duration.ofMinutes(15), null);

  private CloudLinkServiceImpl service() {
    return new CloudLinkServiceImpl(linkDao, serverDao, stateProvider, properties);
  }

  private void serverExists(long id) {
    when(serverDao.selectActiveById(id))
        .thenReturn(
            Optional.of(
                new Server(
                    id,
                    "h",
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
                    null)));
  }

  private static ServerCloudLink link(long id, long serverId, String externalId) {
    return new ServerCloudLink(
        id,
        serverId,
        CloudProvider.AWS_EC2,
        externalId,
        "ap-northeast-1",
        null,
        null,
        null,
        null,
        null,
        null,
        LocalDateTime.now(),
        LocalDateTime.now());
  }

  @Test
  void upsert_serverMissing_throwsNotFound() {
    when(serverDao.selectActiveById(9L)).thenReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                service()
                    .upsert(9L, new CloudLinkRequest(CloudProvider.AWS_EC2, "i-0abc1234", null)))
        .isInstanceOf(ResourceNotFoundException.class);
    verify(linkDao, never()).insert(any());
  }

  @Test
  void upsert_creates_whenNoExistingLink_andDefaultsRegion() {
    serverExists(1L);
    when(linkDao.selectByProviderAndExternalId(CloudProvider.AWS_EC2, "i-0abc1234"))
        .thenReturn(Optional.empty());
    when(linkDao.selectByServerId(1L))
        .thenReturn(Optional.empty(), Optional.of(link(5L, 1L, "i-0abc1234")));

    service().upsert(1L, new CloudLinkRequest(CloudProvider.AWS_EC2, "i-0abc1234", null));

    verify(linkDao)
        .insert(
            org.mockito.ArgumentMatchers.argThat(
                l ->
                    l.serverId().equals(1L)
                        && l.externalId().equals("i-0abc1234")
                        && "ap-northeast-1".equals(l.region())));
  }

  @Test
  void upsert_replaces_andResetsObservedState() {
    serverExists(1L);
    when(linkDao.selectByProviderAndExternalId(CloudProvider.AWS_EC2, "i-new99999"))
        .thenReturn(Optional.empty());
    ServerCloudLink current = link(5L, 1L, "i-old00000");
    when(linkDao.selectByServerId(1L))
        .thenReturn(Optional.of(current), Optional.of(link(5L, 1L, "i-new99999")));

    service().upsert(1L, new CloudLinkRequest(CloudProvider.AWS_EC2, "i-new99999", "us-east-1"));

    verify(linkDao)
        .update(
            org.mockito.ArgumentMatchers.argThat(
                l ->
                    l.id().equals(5L)
                        && l.externalId().equals("i-new99999")
                        && "us-east-1".equals(l.region())
                        && l.state() == null
                        && l.stateFetchedAt() == null));
    verify(linkDao, never()).insert(any());
  }

  @Test
  void upsert_conflict_whenInstanceLinkedToAnotherServer() {
    serverExists(1L);
    when(linkDao.selectByProviderAndExternalId(CloudProvider.AWS_EC2, "i-shared00"))
        .thenReturn(Optional.of(link(9L, 2L, "i-shared00")));

    assertThatThrownBy(
            () ->
                service()
                    .upsert(1L, new CloudLinkRequest(CloudProvider.AWS_EC2, "i-shared00", null)))
        .isInstanceOf(CloudLinkConflictException.class);
    verify(linkDao, never()).insert(any());
    verify(linkDao, never()).update(any());
  }

  @Test
  void delete_isIdempotent() {
    serverExists(1L);
    when(linkDao.deleteByServerId(1L)).thenReturn(0);

    service().delete(1L); // no throw
  }

  @Test
  void refresh_providerDisabled_throwsUnavailable() {
    serverExists(1L);
    when(linkDao.selectByServerId(1L)).thenReturn(Optional.of(link(5L, 1L, "i-0abc1234")));
    when(stateProvider.isEnabled()).thenReturn(false);

    assertThatThrownBy(() -> service().refresh(1L))
        .isInstanceOf(CloudProviderUnavailableException.class);
    verify(linkDao, never()).updateState(any(), any(), any(), any());
  }

  @Test
  void refresh_success_updatesState() {
    serverExists(1L);
    when(linkDao.selectByServerId(1L))
        .thenReturn(
            Optional.of(link(5L, 1L, "i-0abc1234")), Optional.of(link(5L, 1L, "i-0abc1234")));
    when(stateProvider.isEnabled()).thenReturn(true);
    when(stateProvider.describeStates(eq("ap-northeast-1"), any()))
        .thenReturn(Map.of("i-0abc1234", "stopped"));

    service().refresh(1L);

    verify(linkDao).updateState(eq(5L), eq(CloudInstanceState.STOPPED), eq("stopped"), any());
  }

  @Test
  void refresh_instanceGone_marksGone() {
    serverExists(1L);
    when(linkDao.selectByServerId(1L))
        .thenReturn(
            Optional.of(link(5L, 1L, "i-0abc1234")), Optional.of(link(5L, 1L, "i-0abc1234")));
    when(stateProvider.isEnabled()).thenReturn(true);
    when(stateProvider.describeStates(anyString(), any())).thenReturn(Map.of());

    service().refresh(1L);

    verify(linkDao).updateState(eq(5L), eq(CloudInstanceState.GONE), isNull(), any());
  }

  @Test
  void refresh_awsFailure_keepsStateRecordsErrorNoThrow() {
    serverExists(1L);
    when(linkDao.selectByServerId(1L))
        .thenReturn(
            Optional.of(link(5L, 1L, "i-0abc1234")), Optional.of(link(5L, 1L, "i-0abc1234")));
    when(stateProvider.isEnabled()).thenReturn(true);
    when(stateProvider.describeStates(anyString(), any()))
        .thenThrow(new CloudProviderUnavailableException("throttled"));

    service().refresh(1L); // must not throw (P8)

    verify(linkDao).updateStateError(eq(5L), anyString(), any());
    verify(linkDao, never()).updateState(any(), any(), any(), any());
  }

  @Test
  void refresh_noLink_throwsNotFound() {
    serverExists(1L);
    when(linkDao.selectByServerId(1L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service().refresh(1L)).isInstanceOf(ResourceNotFoundException.class);
  }
}
