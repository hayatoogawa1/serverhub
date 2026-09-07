package com.serverhub.maintenance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * メンテナンス履歴の登録リクエスト（詳細設計 04-maintenance §3.1、FR-MNT-02 / B4）。
 *
 * <p>{@code performedDate} は未来日も許容するため日付範囲バリデーション（{@code @Future}/{@code @Past}）を付けない （F5 /
 * BR-10）。対象サーバーの存在確認は Service（§4）。
 */
public record MaintenanceHistoryCreateRequest(
    @NotNull Long serverId,
    @NotNull LocalDate performedDate,
    @NotNull MaintenanceType type,
    @NotBlank @Size(max = 255) String worker,
    @NotBlank @Size(max = 2000) String content,
    @Size(max = 1000) String impact,
    @Size(max = 1000) String result) {}
