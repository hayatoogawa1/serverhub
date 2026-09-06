package com.serverhub.server;

import org.seasar.doma.Entity;

/**
 * 一覧表示用にサーバー ID とタグ名をまとめて取得する射影（詳細設計 03-server §3.3）。
 *
 * <p>{@code server_tags} と {@code tags} を JOIN した結果の 1 行。N+1 を避けるため複数サーバー分を 1 クエリで取得し、Service 側で
 * {@code serverId} ごとにまとめる。
 */
@Entity(immutable = true)
public record ServerTagNameRow(Long serverId, String tagName) {}
