package com.serverhub.server;

import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageResponse;
import com.serverhub.common.page.SortDirection;
import java.util.List;

/** サーバー・タグの業務ロジック（詳細設計 03-server §5、BR-01〜BR-10）。実装は {@link ServerServiceImpl}。 */
public interface ServerService {

  /** 一覧・検索・絞り込み・ソート・ページング（FR-SRV-01/02、BR-01）。 */
  PageResponse<ServerSummaryResponse> list(
      String keyword,
      Environment environment,
      Status status,
      List<String> tagNames,
      PageRequest page,
      ServerSortKey sort,
      SortDirection order);

  /** 詳細（FR-SRV-03、BR-01）。不存在・削除済みは 404。 */
  ServerDetailResponse get(Long id);

  /** 登録（FR-SRV-04 / FR-TAG-01、BR-02/BR-07/BR-10）。 */
  ServerDetailResponse create(ServerCreateRequest request);

  /** 編集（FR-SRV-05 / FR-TAG-01、BR-02/BR-08）。version 不一致は Doma が例外送出 → 409。 */
  ServerDetailResponse update(Long id, ServerUpdateRequest request);

  /** 論理削除（FR-SRV-06）。{@code server_tags} は物理削除。不存在・既削除は 404。 */
  void delete(Long id);
}
