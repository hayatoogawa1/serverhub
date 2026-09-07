package com.serverhub.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.serverhub.common.error.ResourceNotFoundException;
import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageResponse;
import com.serverhub.common.page.SortDirection;
import com.serverhub.server.Environment;
import com.serverhub.server.Server;
import com.serverhub.server.ServerDao;
import com.serverhub.server.Status;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.seasar.doma.jdbc.Result;

@ExtendWith(MockitoExtension.class)
class MaintenanceHistoryServiceTest {

  @Mock private MaintenanceHistoryDao maintenanceHistoryDao;
  @Mock private ServerDao serverDao;

  @InjectMocks private MaintenanceHistoryService service;

  private static Server activeServer(long id) {
    return new Server(
        id,
        "web-01",
        "10.0.0.1",
        Environment.PRODUCTION,
        Status.ACTIVE,
        null,
        null,
        null,
        null,
        null,
        null,
        0L,
        LocalDateTime.now(),
        LocalDateTime.now(),
        null);
  }

  private static MaintenanceHistoryCreateRequest createRequest(long serverId) {
    return new MaintenanceHistoryCreateRequest(
        serverId, LocalDate.of(2026, 9, 7), MaintenanceType.PATCH, "worker", "content", null, null);
  }

  @Test
  void create_persistsHistory_whenServerIsActive() {
    when(serverDao.selectActiveById(1L)).thenReturn(Optional.of(activeServer(1L)));
    MaintenanceHistory inserted =
        new MaintenanceHistory(
            100L,
            1L,
            LocalDate.of(2026, 9, 7),
            MaintenanceType.PATCH,
            "worker",
            "content",
            null,
            null,
            LocalDateTime.now(),
            LocalDateTime.now(),
            null);
    ArgumentCaptor<MaintenanceHistory> toInsert = ArgumentCaptor.forClass(MaintenanceHistory.class);
    when(maintenanceHistoryDao.insert(toInsert.capture())).thenReturn(new Result<>(1, inserted));

    MaintenanceHistoryDetailResponse result = service.create(createRequest(1L));

    assertThat(result.id()).isEqualTo(100L);
    assertThat(result.type()).isEqualTo(MaintenanceType.PATCH);
    assertThat(toInsert.getValue().id()).isNull();
    assertThat(toInsert.getValue().serverId()).isEqualTo(1L);
  }

  @Test
  void create_throwsNotFound_whenServerMissingOrDeleted() {
    when(serverDao.selectActiveById(9L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.create(createRequest(9L)))
        .isInstanceOf(ResourceNotFoundException.class);

    verify(maintenanceHistoryDao, never()).insert(any());
  }

  @Test
  void listByServer_throwsNotFound_whenServerMissingOrDeleted() {
    when(serverDao.selectActiveById(9L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.listByServer(9L, new PageRequest(0, 20)))
        .isInstanceOf(ResourceNotFoundException.class);

    verify(maintenanceHistoryDao, never()).selectByServerId(any(), any());
  }

  @Test
  void list_mapsRows_andKeepsDeletedServerFlag() {
    when(maintenanceHistoryDao.selectList(any(), any(), any(), any()))
        .thenReturn(
            List.of(
                new MaintenanceHistoryListRow(
                    1L,
                    5L,
                    "gone-01",
                    true,
                    LocalDate.of(2026, 9, 1),
                    MaintenanceType.CONFIG,
                    "w")));
    when(maintenanceHistoryDao.selectCount(any())).thenReturn(1L);

    PageResponse<MaintenanceHistorySummaryResponse> result =
        service.list(
            null, new PageRequest(0, 20), MaintenanceSortKey.PERFORMED_DATE, SortDirection.DESC);

    assertThat(result.content()).hasSize(1);
    assertThat(result.content().get(0).serverDeleted()).isTrue();
    assertThat(result.content().get(0).serverHostname()).isEqualTo("gone-01");
  }
}
