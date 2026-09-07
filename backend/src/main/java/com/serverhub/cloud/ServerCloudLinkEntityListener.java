package com.serverhub.cloud;

import java.time.LocalDateTime;
import org.seasar.doma.jdbc.entity.EntityListener;
import org.seasar.doma.jdbc.entity.PreInsertContext;
import org.seasar.doma.jdbc.entity.PreUpdateContext;

/**
 * {@link ServerCloudLink} の監査列（{@code createdAt}/{@code updatedAt}）を自動設定する （BR-10、01-common
 * D-DETAIL-05。{@link com.serverhub.server.ServerEntityListener} と同じパターン）。
 */
public class ServerCloudLinkEntityListener implements EntityListener<ServerCloudLink> {

  @Override
  public void preInsert(ServerCloudLink entity, PreInsertContext<ServerCloudLink> context) {
    LocalDateTime now = LocalDateTime.now();
    context.setNewEntity(entity.withCreatedAt(now).withUpdatedAt(now));
  }

  @Override
  public void preUpdate(ServerCloudLink entity, PreUpdateContext<ServerCloudLink> context) {
    context.setNewEntity(entity.withUpdatedAt(LocalDateTime.now()));
  }
}
