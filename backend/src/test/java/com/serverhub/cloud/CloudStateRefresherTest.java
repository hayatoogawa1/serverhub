package com.serverhub.cloud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CloudStateRefresherTest {

  @Mock private ServerCloudLinkDao dao;
  @Mock private CloudStateProvider provider;

  private final CloudProperties properties =
      new CloudProperties(true, Duration.ofMinutes(5), Duration.ofMinutes(15), null);

  @BeforeEach
  void providerEnabledByDefault() {
    lenient().when(provider.isEnabled()).thenReturn(true);
  }

  private CloudStateRefresher refresher() {
    return new CloudStateRefresher(dao, provider, properties);
  }

  private static ServerCloudLink link(long id, String externalId, String region) {
    return new ServerCloudLink(
        id,
        id,
        CloudProvider.AWS_EC2,
        externalId,
        region,
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
  void providerDisabled_throwsUnavailable() {
    when(provider.isEnabled()).thenReturn(false);

    assertThatThrownBy(() -> refresher().refreshAll())
        .isInstanceOf(CloudProviderUnavailableException.class);
    verifyNoInteractions(dao);
  }

  @Test
  void noLinks_returnsEmptySummary() {
    when(dao.selectLinkedToActiveServers()).thenReturn(List.of());

    CloudRefreshSummary s = refresher().refreshAll();

    assertThat(s).isEqualTo(CloudRefreshSummary.EMPTY);
    verify(provider, never()).describeStates(anyString(), any());
  }

  @Test
  void mapsRawStateAndClearsError_forFoundInstances() {
    when(dao.selectLinkedToActiveServers())
        .thenReturn(
            List.of(link(1, "i-run", "ap-northeast-1"), link(2, "i-stop", "ap-northeast-1")));
    when(provider.describeStates(eq("ap-northeast-1"), any()))
        .thenReturn(Map.of("i-run", "running", "i-stop", "stopped"));

    CloudRefreshSummary s = refresher().refreshAll();

    verify(dao).updateState(eq(1L), eq(CloudInstanceState.RUNNING), eq("running"), any());
    verify(dao).updateState(eq(2L), eq(CloudInstanceState.STOPPED), eq("stopped"), any());
    verify(dao, never()).updateStateError(any(), any(), any());
    assertThat(s).isEqualTo(new CloudRefreshSummary(2, 2, 0, 0));
  }

  @Test
  void instanceMissingFromResponse_isMarkedGone() {
    when(dao.selectLinkedToActiveServers())
        .thenReturn(List.of(link(3, "i-gone", "ap-northeast-1")));
    when(provider.describeStates(anyString(), any())).thenReturn(Map.of());

    CloudRefreshSummary s = refresher().refreshAll();

    verify(dao).updateState(eq(3L), eq(CloudInstanceState.GONE), isNull(), any());
    assertThat(s).isEqualTo(new CloudRefreshSummary(1, 0, 1, 0));
  }

  @Test
  void providerFailure_keepsStateAndRecordsError() {
    when(dao.selectLinkedToActiveServers()).thenReturn(List.of(link(4, "i-x", "ap-northeast-1")));
    when(provider.describeStates(anyString(), any()))
        .thenThrow(new CloudProviderUnavailableException("boom"));

    CloudRefreshSummary s = refresher().refreshAll();

    verify(dao).updateStateError(eq(4L), anyString(), any());
    verify(dao, never()).updateState(any(), any(), any(), any());
    assertThat(s).isEqualTo(new CloudRefreshSummary(1, 0, 0, 1));
  }

  @Test
  void batchesRequestsByConfiguredSize() {
    CloudProperties small =
        new CloudProperties(
            true,
            Duration.ofMinutes(5),
            Duration.ofMinutes(15),
            new CloudProperties.Aws("ap-northeast-1", 2));
    List<ServerCloudLink> links =
        IntStream.rangeClosed(1, 5).mapToObj(i -> link(i, "i-" + i, "ap-northeast-1")).toList();
    when(dao.selectLinkedToActiveServers()).thenReturn(links);
    when(provider.describeStates(anyString(), any())).thenReturn(Map.of());

    new CloudStateRefresher(dao, provider, small).refreshAll();

    // 5 件 / batch 2 → 3 回呼ばれる
    verify(provider, times(3)).describeStates(anyString(), any());
  }
}
