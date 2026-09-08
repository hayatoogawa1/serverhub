package com.serverhub.cloud;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 起動時にクラウド連携の有効設定と、実際に配線された {@link CloudStateProvider} 実装を 1 行 INFO ログに出す
 * （FR-CLOUD-01。「有効にしたのに反応しない」の切り分けを速くするため）。
 *
 * <p>{@code enabled=true} なのに {@code provider=DisabledCloudStateProviderImpl} と出たら、 {@code
 * SERVERHUB_CLOUD_ENABLED} が JVM に届いていない（{@code .env} 未読込 / Gradle デーモンが古い環境を保持）。
 */
@Component
public class CloudStartupLogger {

  private static final Logger log = LoggerFactory.getLogger(CloudStartupLogger.class);

  private final CloudProperties properties;
  private final CloudStateProvider stateProvider;

  public CloudStartupLogger(CloudProperties properties, CloudStateProvider stateProvider) {
    this.properties = properties;
    this.stateProvider = stateProvider;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void logCloudConfig() {
    log.info(
        "cloud integration: enabled={}, provider={}, region={}, pollInterval={}, stalenessThreshold={}",
        properties.enabled(),
        stateProvider.getClass().getSimpleName(),
        properties.aws().region(),
        properties.pollInterval(),
        properties.stalenessThreshold());
  }
}
