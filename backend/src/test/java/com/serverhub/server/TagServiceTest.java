package com.serverhub.server;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TagServiceTest {

  @Mock private TagDao tagDao;
  @InjectMocks private TagServiceImpl service;

  @Test
  void suggest_trimsPrefixAndCapsLimit() {
    when(tagDao.selectSuggest("we", TagServiceImpl.SUGGEST_LIMIT)).thenReturn(List.of("web"));

    assertThat(service.suggest("  we  ")).containsExactly("web");
  }

  @Test
  void suggest_returnsEmpty_forBlankPrefix_withoutQuery() {
    assertThat(service.suggest("   ")).isEmpty();
    assertThat(service.suggest(null)).isEmpty();
    verify(tagDao, never()).selectSuggest(eq(null), anyInt());
  }
}
