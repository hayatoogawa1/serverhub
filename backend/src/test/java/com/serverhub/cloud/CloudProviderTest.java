package com.serverhub.cloud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class CloudProviderTest {

  @Test
  void value_andFromValue_roundTrip() {
    assertThat(CloudProvider.AWS_EC2.value()).isEqualTo("aws_ec2");
    assertThat(CloudProvider.fromValue("aws_ec2")).isEqualTo(CloudProvider.AWS_EC2);
  }

  @Test
  void fromValue_unknown_throws() {
    assertThatThrownBy(() -> CloudProvider.fromValue("gcp_gce"))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
