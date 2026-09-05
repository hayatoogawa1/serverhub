package com.serverhub.common.page;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class PageResponseTest {

  @Test
  void computesTotalPages() {
    PageResponse<String> result = PageResponse.of(List.of("a", "b"), new PageRequest(0, 20), 45);

    assertThat(result.content()).containsExactly("a", "b");
    assertThat(result.page().number()).isEqualTo(0);
    assertThat(result.page().size()).isEqualTo(20);
    assertThat(result.page().totalElements()).isEqualTo(45);
    assertThat(result.page().totalPages()).isEqualTo(3);
  }

  @Test
  void zeroElementsYieldsZeroTotalPages() {
    PageResponse<String> result = PageResponse.of(List.of(), new PageRequest(0, 20), 0);

    assertThat(result.page().totalPages()).isEqualTo(0);
  }
}
