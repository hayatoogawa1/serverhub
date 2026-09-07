package com.serverhub.server;

import java.time.LocalDateTime;
import org.seasar.doma.jdbc.entity.EntityListener;
import org.seasar.doma.jdbc.entity.PreInsertContext;
import org.seasar.doma.jdbc.entity.PreUpdateContext;

/**
 * {@link Server} の監査列（{@code createdAt}/{@code updatedAt}）を自動設定する（BR-10、01-common D-DETAIL-05）。
 *
 * <p>Service 層に日時設定の重複コードを書かないための共通化。
 */
public class ServerEntityListener implements EntityListener<Server> {

  @Override
  public void preInsert(Server entity, PreInsertContext<Server> context) {
    LocalDateTime now = LocalDateTime.now();
    context.setNewEntity(entity.withCreatedAt(now).withUpdatedAt(now));
  }

  @Override
  public void preUpdate(Server entity, PreUpdateContext<Server> context) {
    context.setNewEntity(entity.withUpdatedAt(LocalDateTime.now()));
  }
}
