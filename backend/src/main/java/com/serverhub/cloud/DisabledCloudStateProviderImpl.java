package com.serverhub.cloud;

import java.util.Collection;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 既定の {@link CloudStateProvider}。{@code serverhub.cloud.enabled} が未設定 or {@code false} のとき有効。
 *
 * <p>AWS を一切呼ばない。ローカル・CI・本番でクラウド連携を使わない場合はこれ。 「今すぐ更新」は {@link CloudProviderUnavailableException} →
 * {@code 503} になる。ポーラーはそもそも起動しない。
 */
@Component
@ConditionalOnProperty(
    prefix = "serverhub.cloud",
    name = "enabled",
    havingValue = "false",
    matchIfMissing = true)
public class DisabledCloudStateProviderImpl implements CloudStateProvider {

  @Override
  public boolean isEnabled() {
    return false;
  }

  @Override
  public Map<String, String> describeStates(String region, Collection<String> externalIds) {
    throw new CloudProviderUnavailableException(
        "cloud state provider is disabled (serverhub.cloud.enabled=false)");
  }
}
