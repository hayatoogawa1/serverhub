package com.serverhub.cloud;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * ポーラーは {@link CloudStateRefresher} に委譲するだけの薄いラッパー。バッチ／マッピングの検証は {@link CloudStateRefresherTest}。
 */
@ExtendWith(MockitoExtension.class)
class CloudStatePollerTest {

  @Mock private CloudStateRefresher refresher;
  @InjectMocks private CloudStatePoller poller;

  @Test
  void poll_delegatesToRefresher() {
    when(refresher.refreshAll()).thenReturn(new CloudRefreshSummary(3, 2, 1, 0));

    poller.poll();

    verify(refresher).refreshAll();
  }

  @Test
  void poll_swallowsProviderUnavailable() {
    doThrow(new CloudProviderUnavailableException("disabled")).when(refresher).refreshAll();

    poller.poll(); // 例外を投げない

    verify(refresher).refreshAll();
  }
}
