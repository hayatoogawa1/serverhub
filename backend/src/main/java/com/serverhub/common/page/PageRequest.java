package com.serverhub.common.page;

/**
 * 正規化済みのページング情報。
 *
 * <p>{@code size} は許可値（10/20/50/100）に丸め済み（{@link PageRequestFactory}）。ソート項目・方向は 機能ごとに異なる enum
 * で表現するためここには含めない（詳細設計 01-common §1.1/§1.2）。
 */
public record PageRequest(int page, int size) {

  /** SQL の {@code OFFSET} に渡す値。Doma の SQL テンプレート内で算術式を書かずに済ませるための補助。 */
  public int offset() {
    return page * size;
  }
}
