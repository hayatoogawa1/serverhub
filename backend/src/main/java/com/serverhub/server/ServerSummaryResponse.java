package com.serverhub.server;

import java.time.LocalDateTime;
import java.util.List;

/** サーバー一覧の 1 行（詳細設計 03-server §4.2）。 */
public record ServerSummaryResponse(
    Long id,
    String hostname,
    Environment environment,
    Status status,
    List<String> tags,
    LocalDateTime updatedAt) {}
