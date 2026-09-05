package com.serverhub.common.page;

import java.util.Set;

/**
 * クエリパラメータの {@code page}/{@code size} を正規化する。
 *
 * <p>{@code size} が許可値（10/20/50/100）以外のときは既定値 20 に丸める（{@code 400} にはしない、 基本設計 02-api §2.5
 * D-API-06）。{@code page} の負数チェックは Controller の Bean Validation
 * （{@code @PositiveOrZero}）が担うため、ここでは扱わない。
 */
public final class PageRequestFactory {

  private static final Set<Integer> ALLOWED_SIZES = Set.of(10, 20, 50, 100);
  private static final int DEFAULT_SIZE = 20;

  private PageRequestFactory() {}

  public static PageRequest create(int page, Integer size) {
    int normalizedSize = (size != null && ALLOWED_SIZES.contains(size)) ? size : DEFAULT_SIZE;
    return new PageRequest(page, normalizedSize);
  }
}
