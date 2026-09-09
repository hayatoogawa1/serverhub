package com.serverhub.server;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.serverhub.cloud.CloudLinkResponse;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * サーバー詳細（詳細設計 03-server §4.2、D-SRV-04）。
 *
 * <p>メンテナンス履歴は埋め込まない（D-SRV-04）。Frontend は履歴一覧 API を小さい {@code size} で別途呼ぶ。
 *
 * <p>{@code cloudLink} は AWS EC2 等との紐付けと観測実行状態（FR-CLOUD-01）。<b>管理ステータス（{@code status}）
 * とは別物。</b>紐付けが無ければ {@code null}（JSON に出さない）。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
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
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    CloudLinkResponse cloudLink) {}
