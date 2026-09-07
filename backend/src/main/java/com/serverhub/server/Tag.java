package com.serverhub.server;

import java.time.LocalDateTime;
import org.seasar.doma.Entity;
import org.seasar.doma.GeneratedValue;
import org.seasar.doma.GenerationType;
import org.seasar.doma.Id;

/**
 * 分類ラベル（詳細設計 03-server §2）。
 *
 * <p>更新がない（{@code createdAt} のみ）ため {@link ServerEntityListener} のようなリスナーは不要。
 */
@Entity(immutable = true)
public record Tag(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    String name,
    LocalDateTime createdAt) {}
