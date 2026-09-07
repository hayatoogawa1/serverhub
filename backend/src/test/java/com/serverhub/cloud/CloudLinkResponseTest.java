package com.serverhub.cloud;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class CloudLinkResponseTest {

  private static ServerCloudLink link(
      CloudInstanceState state, LocalDateTime fetchedAt, String err) {
    return new ServerCloudLink(
        1L,
        1L,
        CloudProvider.AWS_EC2,
        "i-abc",
        "ap-northeast-1",
        null,
        state,
        state == null ? null : state.value(),
        fetchedAt,
        err,
        err == null ? null : LocalDateTime.now(),
        null,
        null);
  }

  @Test
  void notStale_whenFetchedRecently() {
    LocalDateTime now = LocalDateTime.of(2026, 9, 8, 12, 0);
    CloudLinkResponse r =
        CloudLinkResponse.from(
            link(CloudInstanceState.RUNNING, now.minusMinutes(5), null),
            Duration.ofMinutes(15),
            now);
    assertThat(r.stale()).isFalse();
    assertThat(r.state()).isEqualTo("running");
    assertThat(r.lastError()).isNull();
  }

  @Test
  void stale_whenFetchedBeyondThreshold() {
    LocalDateTime now = LocalDateTime.of(2026, 9, 8, 12, 0);
    CloudLinkResponse r =
        CloudLinkResponse.from(
            link(CloudInstanceState.STOPPED, now.minusMinutes(20), null),
            Duration.ofMinutes(15),
            now);
    assertThat(r.stale()).isTrue();
  }

  @Test
  void notStale_whenNeverFetched() {
    LocalDateTime now = LocalDateTime.of(2026, 9, 8, 12, 0);
    CloudLinkResponse r =
        CloudLinkResponse.from(link(null, null, null), Duration.ofMinutes(15), now);
    assertThat(r.stale()).isFalse();
    assertThat(r.state()).isNull();
  }

  @Test
  void keepsCachedStateAndSurfacesLastError() {
    LocalDateTime now = LocalDateTime.of(2026, 9, 8, 12, 0);
    CloudLinkResponse r =
        CloudLinkResponse.from(
            link(CloudInstanceState.RUNNING, now.minusMinutes(3), "throttled"),
            Duration.ofMinutes(15),
            now);
    assertThat(r.state()).isEqualTo("running");
    assertThat(r.lastError()).isEqualTo("throttled");
  }
}
