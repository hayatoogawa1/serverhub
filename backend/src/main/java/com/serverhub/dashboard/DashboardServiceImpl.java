package com.serverhub.dashboard;

import com.serverhub.dashboard.DashboardSummaryResponse.RecentMaintenanceItem;
import com.serverhub.server.Environment;
import com.serverhub.server.Status;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link DashboardService} の実装（詳細設計 05-dashboard §2・§5、FR-DASH-01）。
 *
 * <p>読み取り専用。各セクションを 1 クエリで取得し（requirements §10.2.2、N+1 回避）、DAO は「値のある区分」 しか返さないため Service が enum
 * 定義を「全区分」の唯一の情報源として 0 件補完し（D-DASH-01）、タグは 上位 10 件＋その他に分割する（F5）。SQL 側で {@code UNION}/{@code LIMIT}
 * を使って同じことをしない （enum 定義とクエリ文字列の二重管理を避ける）。
 */
@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

  /** 「最近のメンテナンス」の表示件数（Q4）。クエリパラメータ化しない。 */
  static final int RECENT_MAINTENANCE_LIMIT = 10;

  /** タグ別集計で個別表示する上限。これを超える分は「その他」に合算する（F5）。 */
  static final int TOP_TAG_LIMIT = 10;

  private final DashboardDao dashboardDao;

  public DashboardServiceImpl(DashboardDao dashboardDao) {
    this.dashboardDao = dashboardDao;
  }

  @Override
  public DashboardSummaryResponse getSummary() {
    long totalServers = dashboardDao.selectTotalServers();

    List<EnvironmentCount> serversByEnvironment = fillMissingEnvironments();
    List<StatusCount> serversByStatus = fillMissingStatuses();

    // 件数降順で全件返る。上位 N 件とその他への分割は Java 側の単純なリスト操作にする（§2、F5）。
    List<TagCount> tagCounts = dashboardDao.selectServerCountByTag();
    List<TagCount> topTags = tagCounts.stream().limit(TOP_TAG_LIMIT).toList();
    long otherTagsCount = tagCounts.stream().skip(TOP_TAG_LIMIT).mapToLong(TagCount::count).sum();

    List<RecentMaintenanceItem> recentMaintenanceHistories =
        dashboardDao.selectRecentMaintenance(RECENT_MAINTENANCE_LIMIT).stream()
            .map(RecentMaintenanceItem::from)
            .toList();

    return new DashboardSummaryResponse(
        totalServers,
        serversByEnvironment,
        serversByStatus,
        topTags,
        otherTagsCount,
        recentMaintenanceHistories);
  }

  /** 3 区分すべてを宣言順で返す（欠けている区分は 0 件補完、D-DASH-01 / FR-DASH-01）。 */
  private List<EnvironmentCount> fillMissingEnvironments() {
    Map<Environment, Long> counts = new EnumMap<>(Environment.class);
    dashboardDao
        .selectServerCountByEnvironment()
        .forEach(row -> counts.put(row.environment(), row.count()));
    return Arrays.stream(Environment.values())
        .map(env -> new EnvironmentCount(env, counts.getOrDefault(env, 0L)))
        .toList();
  }

  /** 3 区分すべてを宣言順で返す（欠けている区分は 0 件補完、D-DASH-01 / FR-DASH-01）。 */
  private List<StatusCount> fillMissingStatuses() {
    Map<Status, Long> counts = new EnumMap<>(Status.class);
    dashboardDao.selectServerCountByStatus().forEach(row -> counts.put(row.status(), row.count()));
    return Arrays.stream(Status.values())
        .map(status -> new StatusCount(status, counts.getOrDefault(status, 0L)))
        .toList();
  }
}
