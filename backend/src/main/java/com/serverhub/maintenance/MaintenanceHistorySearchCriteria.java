package com.serverhub.maintenance;

/**
 * 全サーバー横断の履歴一覧・件数の絞り込み条件（Service 内部専用、詳細設計 04-maintenance §2）。
 *
 * <p>現状は対象サーバーの任意絞り込み（{@code serverId}）のみ。{@code null} は「全サーバー」を意味する。
 */
public record MaintenanceHistorySearchCriteria(Long serverId) {}
