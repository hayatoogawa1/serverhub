package com.serverhub.common.validation;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

class HostnameValidationTest {

  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  record Target(@Hostname String hostname) {}

  @Test
  void acceptsSimpleHostname() {
    assertThat(validator.validate(new Target("web-prod-01"))).isEmpty();
  }

  @Test
  void acceptsFqdn() {
    assertThat(validator.validate(new Target("web-prod-01.example.com"))).isEmpty();
  }

  @Test
  void rejectsInvalidCharacters() {
    assertThat(validator.validate(new Target("invalid_host!"))).hasSize(1);
  }

  @Test
  void acceptsNull() {
    assertThat(validator.validate(new Target(null))).isEmpty();
  }
}
