package com.serverhub.maintenance;

import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageResponse;
import com.serverhub.common.page.SortDirection;

/**
 * メンテナンス履歴の業務ロジック（詳細設計 04-maintenance §4・§5、FR-MNT-01〜03）。 実装は {@link
 * MaintenanceHistoryServiceImpl}。登録・参照のみ（BR-06）。
 */
public interface MaintenanceHistoryService {

  /** 全サーバー横断の履歴一覧（FR-MNT-01）。{@code serverId} 指定時はそのサーバーで絞り込む（削除済みサーバーの履歴も返す、BR-09/F4）。 */
  PageResponse<MaintenanceHistorySummaryResponse> list(
      Long serverId, PageRequest page, MaintenanceSortKey sort, SortDirection order);

  /** 特定サーバーの履歴（FR-MNT-03、実施日降順）。対象サーバーが不存在・削除済みなら {@code 404}（D-MNT-02）。 */
  PageResponse<MaintenanceHistoryDetailResponse> listByServer(Long serverId, PageRequest page);

  /** 登録（FR-MNT-02）。対象サーバーが不存在・削除済みなら {@code 404}（BR-06）。 */
  MaintenanceHistoryDetailResponse create(MaintenanceHistoryCreateRequest request);
}
