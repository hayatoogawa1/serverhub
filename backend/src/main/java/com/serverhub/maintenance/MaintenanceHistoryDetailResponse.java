package com.serverhub.maintenance;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * サーバー詳細内の履歴・登録直後（POST の 201 応答）のレスポンス（詳細設計 04-maintenance §3.2、D-MNT-01）。
 *
 * <p>単一サーバーに閉じるため {@code serverId}/{@code serverHostname} は持たない代わりに、作業内容など 詳細項目を含む（FR-MNT-03）。
 */
public record MaintenanceHistoryDetailResponse(
    Long id,
    LocalDate performedDate,
    MaintenanceType type,
    String worker,
    String content,
    String impact,
    String result,
    LocalDateTime createdAt) {

  static MaintenanceHistoryDetailResponse from(MaintenanceHistory history) {
    return new MaintenanceHistoryDetailResponse(
        history.id(),
        history.performedDate(),
        history.type(),
        history.worker(),
        history.content(),
        history.impact(),
        history.result(),
        history.createdAt());
  }
}
