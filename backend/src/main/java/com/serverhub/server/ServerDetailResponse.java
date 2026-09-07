package com.serverhub.server;

import java.time.LocalDateTime;
import java.util.List;

/**
 * サーバー詳細（詳細設計 03-server §4.2、D-SRV-04）。
 *
 * <p>メンテナンス履歴は埋め込まない（D-SRV-04）。Frontend は履歴一覧 API を小さい {@code size} で別途呼ぶ。
 */
public record ServerDetailResponse(
    Long id,
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
    List<String> tags,
    Long version,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {}
