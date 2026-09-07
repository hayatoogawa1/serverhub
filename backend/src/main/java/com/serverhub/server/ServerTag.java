package com.serverhub.server;

import org.seasar.doma.Entity;
import org.seasar.doma.Id;
import org.seasar.doma.Table;

/**
 * {@code server_tags} 中間テーブルの 1 行（詳細設計 03-server §3.3）。
 *
 * <p>複合主キー {@code (server_id, tag_id)} のみを持つ最小の Doma entity。ドメインモデルとしては扱わず、 {@link ServerTagDao}
 * の行操作（付け外し）専用。Service / Controller には公開しない。
 */
@Entity(immutable = true)
@Table(name = "server_tags")
public record ServerTag(@Id Long serverId, @Id Long tagId) {}
