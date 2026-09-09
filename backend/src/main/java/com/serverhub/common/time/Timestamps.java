package com.serverhub.common.time;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * DB 由来の {@link LocalDateTime}（JVM 既定タイムゾーンの壁時計）を、API レスポンス用の オフセット付き {@link OffsetDateTime}
 * に変換する（[02-api](../../../../docs/design/basic/02-api.md) D-API-05）。
 *
 * <p>Doma 3 は {@code OffsetDateTime} を永続型として扱えない（{@code DOMA4096}）ため、エンティティ / DAO は {@code
 * LocalDateTime} のまま保持し、オフセットの付与はレスポンス組み立ての 1 箇所（このユーティリティ）に集約する。
 *
 * <p>{@code atZone(systemDefault())} で「保存時の壁時計 + JVM のゾーン」から正しいインスタントを復元する。 JVM のゾーンはプロセス内で不変なので
 * 書き込み時と読み出し時で一致する。本番 EC2 は systemd unit で {@code TZ=Asia/Tokyo} を明示している（ログの可読性のため。表示の正しさには非依存）。
 */
public final class Timestamps {

  private Timestamps() {}

  /** {@code null} はそのまま {@code null}。 */
  public static OffsetDateTime toOffset(LocalDateTime value) {
    return value == null ? null : value.atZone(ZoneId.systemDefault()).toOffsetDateTime();
  }
}
