package com.serverhub.common.time;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class TimestampsTest {

  @Test
  void nullReturnsNull() {
    assertThat(Timestamps.toOffset(null)).isNull();
  }

  @Test
  void attachesSystemZoneOffsetWithoutShiftingWallClock() {
    LocalDateTime wall = LocalDateTime.of(2026, 9, 9, 21, 25, 6, 123_000_000);

    OffsetDateTime result = Timestamps.toOffset(wall);

    assertThat(result).isNotNull();
    // 壁時計はそのまま（保存された LocalDateTime = JVM ゾーンの壁時計、という前提）
    assertThat(result.toLocalDateTime()).isEqualTo(wall);
    // オフセットは JVM 既定ゾーンのもの
    assertThat(result.getOffset()).isEqualTo(ZoneId.systemDefault().getRules().getOffset(wall));
  }
}
