package com.serverhub.common.page;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PageRequestFactoryTest {

  @Test
  void allowedSizeIsUsedAsIs() {
    PageRequest result = PageRequestFactory.create(2, 50);

    assertThat(result.page()).isEqualTo(2);
    assertThat(result.size()).isEqualTo(50);
  }

  @Test
  void disallowedSizeFallsBackToDefault() {
    PageRequest result = PageRequestFactory.create(0, 999);

    assertThat(result.size()).isEqualTo(20);
  }

  @Test
  void nullSizeFallsBackToDefault() {
    PageRequest result = PageRequestFactory.create(0, null);

    assertThat(result.size()).isEqualTo(20);
  }
}
