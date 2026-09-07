package com.serverhub.maintenance;

import java.time.LocalDate;

/**
 * 全サーバー横断の履歴一覧（GET /maintenance-histories、FR-MNT-01）の 1 行（詳細設計 04-maintenance §3.2、D-MNT-01）。
 *
 * <p>複数サーバーを跨ぐため「どのサーバーか」の識別情報を含む。作業内容（{@code content}）は含めない。 {@code serverDeleted} が {@code true}
 * の場合、対象サーバーは論理削除済み（Frontend がバッジ等で表示、F4）。
 */
public record MaintenanceHistorySummaryResponse(
    Long id,
    Long serverId,
    String serverHostname,
    boolean serverDeleted,
    LocalDate performedDate,
    MaintenanceType type,
    String worker) {}
