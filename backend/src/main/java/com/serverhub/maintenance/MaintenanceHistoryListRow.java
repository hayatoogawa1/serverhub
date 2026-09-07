package com.serverhub.maintenance;

import java.time.LocalDate;
import org.seasar.doma.Entity;

/**
 * 全サーバー横断の履歴一覧（FR-MNT-01）用の射影（詳細設計 04-maintenance §2）。
 *
 * <p>{@code maintenance_histories} と {@code servers} を JOIN した結果の 1 行。{@code serverDeleted} は
 * 対象サーバーが論理削除済みか（{@code s.deleted_at IS NOT NULL}、F4）。Entity ではなく {@link MaintenanceHistoryDao}
 * 専用の集計行（03-server §3.3 の {@code ServerTagNameRow} と同じ考え方）。
 */
@Entity(immutable = true)
public record MaintenanceHistoryListRow(
    Long id,
    Long serverId,
    String serverHostname,
    boolean serverDeleted,
    LocalDate performedDate,
    MaintenanceType type,
    String worker) {}
