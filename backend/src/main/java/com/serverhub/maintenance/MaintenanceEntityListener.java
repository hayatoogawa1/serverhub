package com.serverhub.maintenance;

import java.time.LocalDateTime;
import org.seasar.doma.jdbc.entity.EntityListener;
import org.seasar.doma.jdbc.entity.PreInsertContext;

/**
 * {@link MaintenanceHistory} の監査列（{@code createdAt}/{@code updatedAt}）を自動設定する（BR-10、01-common
 * D-DETAIL-05）。
 *
 * <p>履歴は追記のみ（BR-06）で更新経路がないため {@code preUpdate} は実装しない。
 */
public class MaintenanceEntityListener implements EntityListener<MaintenanceHistory> {

  @Override
  public void preInsert(MaintenanceHistory entity, PreInsertContext<MaintenanceHistory> context) {
    LocalDateTime now = LocalDateTime.now();
    context.setNewEntity(entity.withCreatedAt(now).withUpdatedAt(now));
  }
}
