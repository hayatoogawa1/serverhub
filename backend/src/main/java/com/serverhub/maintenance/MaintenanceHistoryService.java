package com.serverhub.maintenance;

import com.serverhub.common.error.ResourceNotFoundException;
import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageResponse;
import com.serverhub.common.page.SortDirection;
import com.serverhub.server.ServerDao;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * メンテナンス履歴の業務ロジック（詳細設計 04-maintenance §4・§5、FR-MNT-01〜03）。
 *
 * <p>対象サーバーの存在確認のため {@code server} パッケージの {@link ServerDao} に依存する（D-MNT-03：BR-06
 * そのものであり避けられない必須の依存）。読み取りは {@code readOnly}、登録のみ個別に {@link Transactional} を付与する。 登録は「重要な業務イベント」として
 * ID のみの {@code INFO} ログを出す（05-cross-cutting §4.3）。
 */
@Service
@Transactional(readOnly = true)
public class MaintenanceHistoryService {

  private static final Logger log = LoggerFactory.getLogger(MaintenanceHistoryService.class);

  private final MaintenanceHistoryDao maintenanceHistoryDao;
  private final ServerDao serverDao;

  public MaintenanceHistoryService(
      MaintenanceHistoryDao maintenanceHistoryDao, ServerDao serverDao) {
    this.maintenanceHistoryDao = maintenanceHistoryDao;
    this.serverDao = serverDao;
  }

  /**
   * 全サーバー横断の履歴一覧（FR-MNT-01）。{@code serverId} 指定時はそのサーバーで絞り込む。
   *
   * <p>削除済みサーバーの履歴も返す（BR-09、F4）。{@code serverId} の存在確認はしない（絞り込み条件に過ぎず、 該当なしは空リストで表現する）。
   */
  public PageResponse<MaintenanceHistorySummaryResponse> list(
      Long serverId, PageRequest page, MaintenanceSortKey sort, SortDirection order) {

    MaintenanceHistorySearchCriteria criteria = new MaintenanceHistorySearchCriteria(serverId);
    List<MaintenanceHistoryListRow> rows =
        maintenanceHistoryDao.selectList(criteria, page, sort, order);
    long total = maintenanceHistoryDao.selectCount(criteria);

    List<MaintenanceHistorySummaryResponse> content =
        rows.stream()
            .map(
                r ->
                    new MaintenanceHistorySummaryResponse(
                        r.id(),
                        r.serverId(),
                        r.serverHostname(),
                        r.serverDeleted(),
                        r.performedDate(),
                        r.type(),
                        r.worker()))
            .toList();

    return PageResponse.of(content, page, total);
  }

  /** 特定サーバーの履歴（FR-MNT-03、実施日降順）。対象サーバーが不存在・削除済みなら {@code 404}（D-MNT-02）。 */
  public PageResponse<MaintenanceHistoryDetailResponse> listByServer(
      Long serverId, PageRequest page) {
    requireActiveServer(serverId);

    List<MaintenanceHistoryDetailResponse> content =
        maintenanceHistoryDao.selectByServerId(serverId, page).stream()
            .map(MaintenanceHistoryDetailResponse::from)
            .toList();
    long total = maintenanceHistoryDao.selectCountByServerId(serverId);

    return PageResponse.of(content, page, total);
  }

  /** 登録（FR-MNT-02）。対象サーバーが不存在・削除済みなら {@code 404}（BR-06）。 */
  @Transactional
  public MaintenanceHistoryDetailResponse create(MaintenanceHistoryCreateRequest request) {
    requireActiveServer(request.serverId());

    MaintenanceHistory toInsert =
        new MaintenanceHistory(
            null,
            request.serverId(),
            request.performedDate(),
            request.type(),
            request.worker(),
            request.content(),
            request.impact(),
            request.result(),
            null,
            null,
            null);
    MaintenanceHistory inserted = maintenanceHistoryDao.insert(toInsert).getEntity();
    log.info("maintenance history created: id={} serverId={}", inserted.id(), request.serverId());
    return MaintenanceHistoryDetailResponse.from(inserted);
  }

  private void requireActiveServer(Long serverId) {
    if (serverDao.selectActiveById(serverId).isEmpty()) {
      throw new ResourceNotFoundException("Server", serverId);
    }
  }
}
