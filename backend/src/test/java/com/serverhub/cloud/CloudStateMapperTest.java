package com.serverhub.cloud;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CloudStateMapperTest {

  @Test
  void mapsAllEc2States() {
    assertThat(CloudStateMapper.fromEc2("running")).isEqualTo(CloudInstanceState.RUNNING);
    assertThat(CloudStateMapper.fromEc2("stopped")).isEqualTo(CloudInstanceState.STOPPED);
    assertThat(CloudStateMapper.fromEc2("pending")).isEqualTo(CloudInstanceState.PENDING);
    assertThat(CloudStateMapper.fromEc2("stopping")).isEqualTo(CloudInstanceState.STOPPING);
    assertThat(CloudStateMapper.fromEc2("shutting-down")).isEqualTo(CloudInstanceState.STOPPING);
    assertThat(CloudStateMapper.fromEc2("terminated")).isEqualTo(CloudInstanceState.TERMINATED);
  }

  @Test
  void unknownOrNull_mapsToUnknown() {
    assertThat(CloudStateMapper.fromEc2("hibernating")).isEqualTo(CloudInstanceState.UNKNOWN);
    assertThat(CloudStateMapper.fromEc2(null)).isEqualTo(CloudInstanceState.UNKNOWN);
  }
}
