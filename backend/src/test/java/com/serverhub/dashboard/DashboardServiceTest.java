package com.serverhub.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.serverhub.dashboard.DashboardSummaryResponse.RecentMaintenanceItem;
import com.serverhub.maintenance.MaintenanceType;
import com.serverhub.server.Environment;
import com.serverhub.server.Status;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

  @Mock private DashboardDao dashboardDao;

  @InjectMocks private DashboardServiceImpl service;

  /** {@code getSummary()} は 5 つの DAO メソッドすべてを呼ぶため、各テストで一括スタブする。 */
  private void stub(
      long totalServers,
      List<EnvironmentCount> byEnvironment,
      List<StatusCount> byStatus,
      List<TagCount> byTag,
      List<RecentMaintenanceRow> recent) {
    when(dashboardDao.selectTotalServers()).thenReturn(totalServers);
    when(dashboardDao.selectServerCountByEnvironment()).thenReturn(byEnvironment);
    when(dashboardDao.selectServerCountByStatus()).thenReturn(byStatus);
    when(dashboardDao.selectServerCountByTag()).thenReturn(byTag);
    when(dashboardDao.selectRecentMaintenance(DashboardServiceImpl.RECENT_MAINTENANCE_LIMIT))
        .thenReturn(recent);
  }

  @Test
  void getSummary_fillsMissingEnvironmentAndStatusBucketsWithZero_inDeclaredOrder() {
    stub(
        6L,
        List.of(new EnvironmentCount(Environment.PRODUCTION, 4L)),
        List.of(new StatusCount(Status.RETIRED, 2L)),
        List.of(),
        List.of());

    DashboardSummaryResponse summary = service.getSummary();

    assertThat(summary.serversByEnvironment())
        .containsExactly(
            new EnvironmentCount(Environment.PRODUCTION, 4L),
            new EnvironmentCount(Environment.STAGING, 0L),
            new EnvironmentCount(Environment.DEVELOPMENT, 0L));
    assertThat(summary.serversByStatus())
        .containsExactly(
            new StatusCount(Status.ACTIVE, 0L),
            new StatusCount(Status.MAINTENANCE, 0L),
            new StatusCount(Status.RETIRED, 2L));
  }

  @Test
  void getSummary_splitsTagsIntoTop10AndOther() {
    // 12 タグ、件数降順（DAO の契約）
    List<TagCount> tags =
        IntStream.rangeClosed(1, 12).mapToObj(i -> new TagCount("tag-" + i, 13L - i)).toList();
    stub(0L, List.of(), List.of(), tags, List.of());

    DashboardSummaryResponse summary = service.getSummary();

    assertThat(summary.topTags()).hasSize(10).isEqualTo(tags.subList(0, 10));
    // 11 位 (count=2) + 12 位 (count=1)
    assertThat(summary.otherTagsCount()).isEqualTo(3L);
  }

  @Test
  void getSummary_otherTagsCountIsZero_whenTenOrFewerTags() {
    stub(
        0L, List.of(), List.of(), List.of(new TagCount("a", 3L), new TagCount("b", 1L)), List.of());

    DashboardSummaryResponse summary = service.getSummary();

    assertThat(summary.topTags()).hasSize(2);
    assertThat(summary.otherTagsCount()).isZero();
  }

  @Test
  void getSummary_mapsRecentMaintenanceRowsToItems_andPassesTotal() {
    stub(
        7L,
        List.of(),
        List.of(),
        List.of(),
        List.of(
            new RecentMaintenanceRow(
                9L, 3L, "web-01", LocalDate.of(2026, 9, 1), MaintenanceType.PATCH)));

    DashboardSummaryResponse summary = service.getSummary();

    assertThat(summary.totalServers()).isEqualTo(7L);
    assertThat(summary.recentMaintenanceHistories())
        .containsExactly(
            new RecentMaintenanceItem(
                9L, 3L, "web-01", LocalDate.of(2026, 9, 1), MaintenanceType.PATCH));
  }

  @Test
  void getSummary_returnsZeroFilledResponse_whenNoData() {
    stub(0L, List.of(), List.of(), List.of(), List.of());

    DashboardSummaryResponse summary = service.getSummary();

    assertThat(summary.totalServers()).isZero();
    assertThat(summary.serversByEnvironment()).extracting(EnvironmentCount::count).containsOnly(0L);
    assertThat(summary.serversByStatus()).extracting(StatusCount::count).containsOnly(0L);
    assertThat(summary.topTags()).isEmpty();
    assertThat(summary.otherTagsCount()).isZero();
    assertThat(summary.recentMaintenanceHistories()).isEmpty();
  }
}
