package com.serverhub.user;

import java.time.LocalDateTime;
import org.seasar.doma.Entity;
import org.seasar.doma.GeneratedValue;
import org.seasar.doma.GenerationType;
import org.seasar.doma.Id;

/**
 * ログインアカウント（詳細設計 02-auth §1）。
 *
 * <p>MVP は登録・更新 API を持たない（B1）。Flyway シードのみで作成される。
 */
@Entity(immutable = true)
public record User(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    String email,
    String passwordHash,
    String displayName,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {}
