package com.serverhub.server;

import com.serverhub.common.validation.Hostname;
import com.serverhub.common.validation.IpAddress;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * サーバー編集リクエスト（詳細設計 03-server §4.1、FR-SRV-05）。
 *
 * <p>{@link ServerCreateRequest} と同じ項目に加え、楽観ロック用の {@code version} を必須で受け取る（BR-08）。
 */
public record ServerUpdateRequest(
    @NotBlank @Size(max = 255) @Hostname String hostname,
    @IpAddress String ipAddress,
    @NotNull Environment environment,
    @NotNull Status status,
    @Size(max = 1000) String description,
    @Size(max = 100) String os,
    @Size(max = 100) String osVersion,
    VirtualizationType virtualizationType,
    @Size(max = 255) String location,
    @Size(max = 255) String owner,
    @Size(max = 50) List<@NotBlank @Size(max = 50) String> tags,
    @NotNull Long version) {}
