package com.serverhub.server;

/**
 * {@code server_tags} 中間テーブルの 1 行（詳細設計 03-server §3.3）。
 *
 * <p>中間テーブルには Doma {@code @Entity} を作らず、DAO 専用の素の record として扱う。
 */
public record ServerTagRow(Long serverId, Long tagId) {}
