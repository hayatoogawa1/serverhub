package com.serverhub.cloud;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * クラウド連携（FR-CLOUD-01）の Spring 構成。
 *
 * <ul>
 *   <li>{@link CloudProperties} は常に登録（9-3 の Service が {@code stalenessThreshold} を参照するため）。
 *   <li>スケジューリング（{@link CloudStatePoller}）は {@code serverhub.cloud.enabled=true} のときだけ有効化する。
 * </ul>
 *
 * <p>起動時の有効設定ログは {@link CloudStartupLogger}。
 */
@Configuration
@EnableConfigurationProperties(CloudProperties.class)
public class CloudConfig {

  @Configuration
  @ConditionalOnProperty(prefix = "serverhub.cloud", name = "enabled", havingValue = "true")
  @EnableScheduling
  static class CloudPollingConfig {}
}
