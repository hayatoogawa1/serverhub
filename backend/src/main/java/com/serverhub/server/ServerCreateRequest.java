package com.serverhub.server;

import com.serverhub.common.validation.Hostname;
import com.serverhub.common.validation.IpAddress;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * サーバー登録リクエスト（詳細設計 03-server §4.1、FR-SRV-03）。
 *
 * <p>{@code tags} は未指定可。正規化（前後空白除去・空文字除外・重複集約、BR-07）は Service で行う。
 */
public record ServerCreateRequest(
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
    @Size(max = 50) List<@NotBlank @Size(max = 50) String> tags) {}
