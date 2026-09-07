package com.serverhub.server;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.serverhub.common.error.ResourceNotFoundException;
import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageResponse;
import com.serverhub.common.page.SortDirection;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.seasar.doma.jdbc.BatchResult;
import org.seasar.doma.jdbc.Result;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class ServerServiceTest {

  @Mock private ServerDao serverDao;
  @Mock private TagDao tagDao;
  @Mock private ServerTagDao serverTagDao;

  @InjectMocks private ServerService service;

  private static Server sampleServer(Long id, String hostname) {
    return new Server(
        id,
        hostname,
        "10.0.0.1",
        Environment.PRODUCTION,
        Status.ACTIVE,
        "desc",
        "Ubuntu",
        "22.04",
        VirtualizationType.VIRTUAL,
        "tokyo",
        "team",
        0L,
        LocalDateTime.now(),
        LocalDateTime.now(),
        null);
  }

  private static ServerCreateRequest createRequest(String hostname, List<String> tags) {
    return new ServerCreateRequest(
        hostname,
        "10.0.0.1",
        Environment.PRODUCTION,
        Status.ACTIVE,
        "desc",
        "Ubuntu",
        "22.04",
        VirtualizationType.VIRTUAL,
        "tokyo",
        "team",
        tags);
  }

  @Test
  void create_persistsServer_normalizesAndUpsertsTags() {
    when(serverDao.selectIdByActiveHostname("web-01")).thenReturn(Optional.empty());
    Server inserted = sampleServer(1L, "web-01");
    when(serverDao.insert(any(Server.class))).thenReturn(new Result<>(1, inserted));
    when(tagDao.selectByNames(anyList()))
        .thenReturn(List.of(new Tag(10L, "web", null), new Tag(11L, "db", null)));
    when(serverTagDao.batchInsert(anyList()))
        .thenReturn(new BatchResult<>(new int[] {1, 1}, List.of()));
    when(serverDao.selectActiveById(1L)).thenReturn(Optional.of(inserted));
    when(serverTagDao.selectTagNamesByServerId(1L)).thenReturn(List.of("db", "web"));

    ServerDetailResponse result =
        service.create(createRequest("web-01", List.of(" web ", "web", "", "  ", "db")));

    assertThat(result.id()).isEqualTo(1L);
    ArgumentCaptor<String> tagName = ArgumentCaptor.forClass(String.class);
    verify(tagDao, org.mockito.Mockito.times(2)).insertIgnoreConflict(tagName.capture());
    assertThat(tagName.getAllValues()).containsExactly("web", "db");
  }

  @Test
  void create_emitsBusinessEventInfoLog_withIdOnly(CapturedOutput output) {
    when(serverDao.selectIdByActiveHostname("secret-host-01")).thenReturn(Optional.empty());
    Server inserted = sampleServer(1L, "secret-host-01");
    when(serverDao.insert(any(Server.class))).thenReturn(new Result<>(1, inserted));
    when(serverDao.selectActiveById(1L)).thenReturn(Optional.of(inserted));
    when(serverTagDao.selectTagNamesByServerId(1L)).thenReturn(List.of());

    service.create(createRequest("secret-host-01", List.of()));

    // 05-cross-cutting §4.3: 業務イベントは 1 行の INFO。ID のみでホスト名（機密）は載せない
    assertThat(output.getOut()).contains("server created: id=1");
    assertThat(output.getOut()).doesNotContain("secret-host-01");
  }

  @Test
  void delete_emitsBusinessEventInfoLog(CapturedOutput output) {
    when(serverDao.updateDeletedAt(eq(5L), any())).thenReturn(1);

    service.delete(5L);

    assertThat(output.getOut()).contains("server deleted (logical): id=5");
  }

  @Test
  void create_rejectsDuplicateHostname_withoutInsert() {
    when(serverDao.selectIdByActiveHostname("dup")).thenReturn(Optional.of(99L));

    assertThatThrownBy(() -> service.create(createRequest("dup", List.of())))
        .isInstanceOf(DuplicateHostnameException.class);

    verify(serverDao, never()).insert(any());
  }

  @Test
  void list_returnsEmptyImmediately_whenAnyRequestedTagNameDoesNotExist() {
    when(tagDao.selectByNames(List.of("web", "ghost")))
        .thenReturn(List.of(new Tag(10L, "web", null)));

    PageResponse<ServerSummaryResponse> result =
        service.list(
            null,
            null,
            null,
            List.of("web", "ghost"),
            new PageRequest(0, 20),
            ServerSortKey.UPDATED_AT,
            SortDirection.DESC);

    assertThat(result.content()).isEmpty();
    assertThat(result.page().totalElements()).isZero();
    verify(serverDao, never()).selectList(any(), any(), any(), any());
    verify(serverDao, never()).selectCount(any());
  }

  @Test
  void list_mapsServersAndGroupsTags() {
    Server s1 = sampleServer(1L, "web-01");
    when(serverDao.selectList(any(), any(), any(), any())).thenReturn(List.of(s1));
    when(serverDao.selectCount(any())).thenReturn(1L);
    when(serverTagDao.selectByServerIds(List.of(1L)))
        .thenReturn(List.of(new ServerTagNameRow(1L, "web"), new ServerTagNameRow(1L, "prod")));

    PageResponse<ServerSummaryResponse> result =
        service.list(
            null,
            null,
            null,
            null,
            new PageRequest(0, 20),
            ServerSortKey.UPDATED_AT,
            SortDirection.DESC);

    assertThat(result.content()).hasSize(1);
    assertThat(result.content().get(0).tags()).containsExactly("web", "prod");
  }

  @Test
  void get_throwsNotFound_whenMissing() {
    when(serverDao.selectActiveById(404L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(404L)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void update_rejectsHostnameOwnedByAnotherServer() {
    when(serverDao.selectActiveById(1L)).thenReturn(Optional.of(sampleServer(1L, "web-01")));
    when(serverDao.selectIdByActiveHostname("taken")).thenReturn(Optional.of(2L));

    ServerUpdateRequest request =
        new ServerUpdateRequest(
            "taken",
            "10.0.0.1",
            Environment.PRODUCTION,
            Status.ACTIVE,
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(),
            0L);

    assertThatThrownBy(() -> service.update(1L, request))
        .isInstanceOf(DuplicateHostnameException.class);
    verify(serverDao, never()).update(any());
  }

  @Test
  void delete_throwsNotFound_whenNothingUpdated() {
    when(serverDao.updateDeletedAt(eq(5L), any())).thenReturn(0);

    assertThatThrownBy(() -> service.delete(5L)).isInstanceOf(ResourceNotFoundException.class);
    verify(serverTagDao, never()).deleteByServerId(any());
  }

  @Test
  void delete_alsoRemovesServerTags_whenSoftDeleted() {
    when(serverDao.updateDeletedAt(eq(5L), any())).thenReturn(1);

    service.delete(5L);

    verify(serverTagDao).deleteByServerId(5L);
  }
}
