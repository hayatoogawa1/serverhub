package com.serverhub.server;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * タグのサジェスト（詳細設計 03-server §3.2、FR-TAG-02 / F3）。
 *
 * <p>タグの付与・解除は {@link ServerService} 側（サーバー登録・編集）に含める。単独 CRUD は持たない。
 */
@Service
@Transactional(readOnly = true)
public class TagService {

  /** サジェスト件数の上限（02-api §3.3）。 */
  static final int SUGGEST_LIMIT = 20;

  private final TagDao tagDao;

  public TagService(TagDao tagDao) {
    this.tagDao = tagDao;
  }

  /** 既存タグ名の前方一致サジェスト。空・空白のみの {@code prefix} は空リスト。 */
  public List<String> suggest(String prefix) {
    if (prefix == null || prefix.isBlank()) {
      return List.of();
    }
    return tagDao.selectSuggest(prefix.trim(), SUGGEST_LIMIT);
  }
}
