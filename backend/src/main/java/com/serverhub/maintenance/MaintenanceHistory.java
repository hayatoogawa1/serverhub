package com.serverhub.maintenance;

import java.time.LocalDate;
import java.time.LocalDateTime;
import org.seasar.doma.Entity;
import org.seasar.doma.GeneratedValue;
import org.seasar.doma.GenerationType;
import org.seasar.doma.Id;
import org.seasar.doma.Table;

/**
 * サーバーに対して実施した保守作業の記録 1 件（詳細設計 04-maintenance §1）。
 *
 * <p>追記のみ（BR-06）。更新 API を持たないため {@code @Version} は不要。{@code createdAt}/{@code updatedAt} は {@link
 * MaintenanceEntityListener} が自動設定する（BR-10）。{@code deletedAt} はスキーマ上のみで、MVP では 常に {@code
 * NULL}（03-data-model §2.1）。
 */
@Entity(immutable = true, listener = MaintenanceEntityListener.class)
@Table(name = "maintenance_histories")
public record MaintenanceHistory(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    Long serverId,
    LocalDate performedDate,
    MaintenanceType type,
    String worker,
    String content,
    String impact,
    String result,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime deletedAt) {

  MaintenanceHistory withCreatedAt(LocalDateTime createdAt) {
    return new MaintenanceHistory(
        id,
        serverId,
        performedDate,
        type,
        worker,
        content,
        impact,
        result,
        createdAt,
        updatedAt,
        deletedAt);
  }

  MaintenanceHistory withUpdatedAt(LocalDateTime updatedAt) {
    return new MaintenanceHistory(
        id,
        serverId,
        performedDate,
        type,
        worker,
        content,
        impact,
        result,
        createdAt,
        updatedAt,
        deletedAt);
  }
}
