package com.serverhub.common.validation;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

class IpAddressValidatorTest {

  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  record Target(@IpAddress String ip) {}

  @Test
  void acceptsIpv4() {
    assertThat(validator.validate(new Target("192.168.0.1"))).isEmpty();
  }

  @Test
  void acceptsIpv6() {
    assertThat(validator.validate(new Target("::1"))).isEmpty();
  }

  @Test
  void acceptsNull() {
    assertThat(validator.validate(new Target(null))).isEmpty();
  }

  @Test
  void rejectsInvalidFormat() {
    assertThat(validator.validate(new Target("not-an-ip"))).hasSize(1);
  }
}
