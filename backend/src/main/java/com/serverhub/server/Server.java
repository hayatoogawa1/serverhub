package com.serverhub.server;

import java.time.LocalDateTime;
import org.seasar.doma.Entity;
import org.seasar.doma.GeneratedValue;
import org.seasar.doma.GenerationType;
import org.seasar.doma.Id;
import org.seasar.doma.Table;
import org.seasar.doma.Version;

/**
 * 管理対象サーバー（詳細設計 03-server §2）。
 *
 * <p>論理削除（{@code deletedAt}）・楽観ロック（{@code version}）を持つ。{@code createdAt}/{@code updatedAt} は {@link
 * ServerEntityListener} が自動設定する（BR-10）。
 */
@Entity(immutable = true, listener = ServerEntityListener.class)
@Table(name = "servers")
public record Server(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    String hostname,
    String ipAddress,
    Environment environment,
    Status status,
    String description,
    String os,
    String osVersion,
    VirtualizationType virtualizationType,
    String location,
    String owner,
    @Version Long version,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime deletedAt) {

  Server withCreatedAt(LocalDateTime createdAt) {
    return new Server(
        id,
        hostname,
        ipAddress,
        environment,
        status,
        description,
        os,
        osVersion,
        virtualizationType,
        location,
        owner,
        version,
        createdAt,
        updatedAt,
        deletedAt);
  }

  Server withUpdatedAt(LocalDateTime updatedAt) {
    return new Server(
        id,
        hostname,
        ipAddress,
        environment,
        status,
        description,
        os,
        osVersion,
        virtualizationType,
        location,
        owner,
        version,
        createdAt,
        updatedAt,
        deletedAt);
  }
}
