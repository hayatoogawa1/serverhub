package com.serverhub.common.page;

import java.util.List;

/**
 * ページング一覧のレスポンス形式。
 *
 * <p>基本設計 02-api §2.3 の {@code { content, page }} 契約に対応する。
 */
public record PageResponse<T>(List<T> content, PageMeta page) {

  /** ページング情報。{@code number} は 0 始まり。 */
  public record PageMeta(int number, int size, long totalElements, int totalPages) {}

  public static <T> PageResponse<T> of(List<T> content, PageRequest request, long totalElements) {
    int totalPages =
        request.size() == 0 ? 0 : (int) Math.ceil((double) totalElements / request.size());
    return new PageResponse<>(
        content, new PageMeta(request.page(), request.size(), totalElements, totalPages));
  }
}
