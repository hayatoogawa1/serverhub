package com.serverhub.server;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;
import java.util.List;

/**
 * サーバー一覧の 1 行（詳細設計 03-server §4.2）。
 *
 * <p>{@code cloudState} / {@code cloudStateFetchedAt} は AWS 実行状態のバッジ表示用（FR-CLOUD-01）。 紐付けなし・未取得は
 * {@code null}。<b>管理ステータス（{@code status}）とは別。</b>詳細は詳細画面の {@code cloudLink}。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ServerSummaryResponse(
    Long id,
    String hostname,
    Environment environment,
    Status status,
    List<String> tags,
    LocalDateTime updatedAt,
    String cloudState,
    LocalDateTime cloudStateFetchedAt) {}
