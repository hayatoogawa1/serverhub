package com.serverhub.cloud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class DisabledCloudStateProviderImplTest {

  private final DisabledCloudStateProviderImpl provider = new DisabledCloudStateProviderImpl();

  @Test
  void isEnabled_false() {
    assertThat(provider.isEnabled()).isFalse();
  }

  @Test
  void describeStates_alwaysThrowsUnavailable() {
    assertThatThrownBy(() -> provider.describeStates("ap-northeast-1", List.of("i-abc")))
        .isInstanceOf(CloudProviderUnavailableException.class);
  }
}
