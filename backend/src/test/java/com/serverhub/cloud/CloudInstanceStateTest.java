package com.serverhub.cloud;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CloudInstanceStateTest {

  @Test
  void value_isLowerCase() {
    assertThat(CloudInstanceState.RUNNING.value()).isEqualTo("running");
    assertThat(CloudInstanceState.GONE.value()).isEqualTo("gone");
  }

  @Test
  void fromValue_knownValue_maps() {
    assertThat(CloudInstanceState.fromValue("stopped")).isEqualTo(CloudInstanceState.STOPPED);
  }

  @Test
  void fromValue_unknownOrNull_returnsUnknownWithoutThrowing() {
    assertThat(CloudInstanceState.fromValue("shutting-down")).isEqualTo(CloudInstanceState.UNKNOWN);
    assertThat(CloudInstanceState.fromValue("brand-new-state"))
        .isEqualTo(CloudInstanceState.UNKNOWN);
    assertThat(CloudInstanceState.fromValue(null)).isEqualTo(CloudInstanceState.UNKNOWN);
  }
}
