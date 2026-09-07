package com.serverhub.server;

import com.serverhub.common.error.ResourceNotFoundException;
import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageResponse;
import com.serverhub.common.page.SortDirection;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link ServerService} の実装（詳細設計 03-server §5、BR-01〜BR-10）。
 *
 * <p>読み取りは {@code readOnly}、登録・編集・削除は個別に {@link Transactional} を付与する（05-cross-cutting）。
 * 登録・編集・削除は「重要な業務イベント」として 1 行の {@code INFO} ログを出す。対象 ID のみで、ホスト名など 機密情報は含めない（05-cross-cutting
 * §4.3、requirements §10.1.11「値そのものより ID を優先」）。
 */
@Service
@Transactional(readOnly = true)
public class ServerServiceImpl implements ServerService {

  private static final Logger log = LoggerFactory.getLogger(ServerServiceImpl.class);

  private final ServerDao serverDao;
  private final TagDao tagDao;
  private final ServerTagDao serverTagDao;

  public ServerServiceImpl(ServerDao serverDao, TagDao tagDao, ServerTagDao serverTagDao) {
    this.serverDao = serverDao;
    this.tagDao = tagDao;
    this.serverTagDao = serverTagDao;
  }

  @Override
  public PageResponse<ServerSummaryResponse> list(
      String keyword,
      Environment environment,
      Status status,
      List<String> tagNames,
      PageRequest page,
      ServerSortKey sort,
      SortDirection order) {

    List<Long> tagIds = null;
    List<String> normalizedTagNames = normalizeTags(tagNames);
    if (!normalizedTagNames.isEmpty()) {
      List<Tag> found = tagDao.selectByNames(normalizedTagNames);
      // D-SRV-05: 存在しないタグ名が 1 つでもあれば AND 条件を満たすサーバーは無いので即空返し
      if (found.size() < normalizedTagNames.size()) {
        return PageResponse.of(List.of(), page, 0);
      }
      tagIds = found.stream().map(Tag::id).toList();
    }

    ServerSearchCriteria criteria =
        new ServerSearchCriteria(blankToNull(keyword), environment, status, tagIds);

    List<Server> servers = serverDao.selectList(criteria, page, sort, order);
    long total = serverDao.selectCount(criteria);

    Map<Long, List<String>> tagsByServer =
        tagNamesByServerId(servers.stream().map(Server::id).toList());

    List<ServerSummaryResponse> content =
        servers.stream()
            .map(
                s ->
                    new ServerSummaryResponse(
                        s.id(),
                        s.hostname(),
                        s.environment(),
                        s.status(),
                        tagsByServer.getOrDefault(s.id(), List.of()),
                        s.updatedAt()))
            .toList();

    return PageResponse.of(content, page, total);
  }

  @Override
  public ServerDetailResponse get(Long id) {
    Server server = requireActive(id);
    return toDetail(server, serverTagDao.selectTagNamesByServerId(id));
  }

  @Override
  @Transactional
  public ServerDetailResponse create(ServerCreateRequest request) {
    List<String> tagNames = normalizeTags(request.tags());
    if (serverDao.selectIdByActiveHostname(request.hostname()).isPresent()) {
      throw new DuplicateHostnameException(request.hostname());
    }

    Server toInsert =
        new Server(
            null,
            request.hostname(),
            request.ipAddress(),
            request.environment(),
            request.status(),
            request.description(),
            request.os(),
            request.osVersion(),
            request.virtualizationType(),
            request.location(),
            request.owner(),
            0L,
            null,
            null,
            null);
    Server inserted = serverDao.insert(toInsert).getEntity();

    replaceTags(inserted.id(), tagNames);
    log.info("server created: id={}", inserted.id());
    return get(inserted.id());
  }

  @Override
  @Transactional
  public ServerDetailResponse update(Long id, ServerUpdateRequest request) {
    Server existing = requireActive(id);
    serverDao
        .selectIdByActiveHostname(request.hostname())
        .filter(ownerId -> !ownerId.equals(id))
        .ifPresent(
            ownerId -> {
              throw new DuplicateHostnameException(request.hostname());
            });

    Server toUpdate =
        new Server(
            id,
            request.hostname(),
            request.ipAddress(),
            request.environment(),
            request.status(),
            request.description(),
            request.os(),
            request.osVersion(),
            request.virtualizationType(),
            request.location(),
            request.owner(),
            request.version(),
            existing.createdAt(),
            existing.updatedAt(),
            null);
    serverDao.update(toUpdate);

    serverTagDao.deleteByServerId(id);
    replaceTags(id, normalizeTags(request.tags()));
    log.info("server updated: id={}", id);
    return get(id);
  }

  @Override
  @Transactional
  public void delete(Long id) {
    int affected = serverDao.updateDeletedAt(id, LocalDateTime.now());
    if (affected == 0) {
      throw new ResourceNotFoundException("Server", id);
    }
    serverTagDao.deleteByServerId(id);
    log.info("server deleted (logical): id={}", id);
  }

  private Server requireActive(Long id) {
    return serverDao
        .selectActiveById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Server", id));
  }

  /**
   * タグの再登録（D-SRV-03：全削除は呼び出し側の責務、ここは登録のみ）。
   *
   * <p>タグは「なければ作る」upsert（D-SRV-02）してから ID を解決し、{@code server_tags} に一括登録する。
   */
  private void replaceTags(Long serverId, List<String> tagNames) {
    if (tagNames.isEmpty()) {
      return;
    }
    tagNames.forEach(tagDao::insertIgnoreConflict);
    List<ServerTag> rows =
        tagDao.selectByNames(tagNames).stream()
            .map(tag -> new ServerTag(serverId, tag.id()))
            .toList();
    serverTagDao.batchInsert(rows);
  }

  private Map<Long, List<String>> tagNamesByServerId(List<Long> serverIds) {
    if (serverIds.isEmpty()) {
      return Map.of();
    }
    return serverTagDao.selectByServerIds(serverIds).stream()
        .collect(
            Collectors.groupingBy(
                ServerTagNameRow::serverId,
                Collectors.mapping(ServerTagNameRow::tagName, Collectors.toList())));
  }

  /** 前後空白除去・空文字除外・重複集約。大文字小文字は区別する（BR-07）。 */
  private static List<String> normalizeTags(List<String> raw) {
    if (raw == null) {
      return List.of();
    }
    LinkedHashSet<String> normalized = new LinkedHashSet<>();
    for (String tag : raw) {
      if (tag == null) {
        continue;
      }
      String trimmed = tag.trim();
      if (!trimmed.isEmpty()) {
        normalized.add(trimmed);
      }
    }
    return List.copyOf(normalized);
  }

  private static String blankToNull(String value) {
    return (value == null || value.isBlank()) ? null : value;
  }

  private static ServerDetailResponse toDetail(Server s, List<String> tags) {
    return new ServerDetailResponse(
        s.id(),
        s.hostname(),
        s.ipAddress(),
        s.environment(),
        s.status(),
        s.description(),
        s.os(),
        s.osVersion(),
        s.virtualizationType(),
        s.location(),
        s.owner(),
        tags,
        s.version(),
        s.createdAt(),
        s.updatedAt());
  }
}
