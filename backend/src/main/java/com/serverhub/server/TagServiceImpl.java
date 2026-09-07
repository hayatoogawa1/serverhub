package com.serverhub.server;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** {@link TagService} の実装（詳細設計 03-server §3.2、FR-TAG-02 / F3）。 */
@Service
@Transactional(readOnly = true)
public class TagServiceImpl implements TagService {

  /** サジェスト件数の上限（02-api §3.3）。 */
  static final int SUGGEST_LIMIT = 20;

  private final TagDao tagDao;

  public TagServiceImpl(TagDao tagDao) {
    this.tagDao = tagDao;
  }

  @Override
  public List<String> suggest(String prefix) {
    if (prefix == null || prefix.isBlank()) {
      return List.of();
    }
    return tagDao.selectSuggest(prefix.trim(), SUGGEST_LIMIT);
  }
}
