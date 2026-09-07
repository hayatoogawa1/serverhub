package com.serverhub.cloud;

import com.serverhub.common.error.ResourceNotFoundException;
import com.serverhub.server.ServerDao;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link CloudLinkService} の実装（設計 07-aws-ec2-integration §6.2）。
 *
 * <p>依存: {@link ServerCloudLinkDao}（紐付け）/ {@link ServerDao}（対象サーバーの存在・非削除チェック、 {@code maintenance}
 * → {@code server} と同じ依存許容）/ {@link CloudStateProvider}（refresh）。
 */
@Service
@Transactional
public class CloudLinkServiceImpl implements CloudLinkService {

  private static final Logger log = LoggerFactory.getLogger(CloudLinkServiceImpl.class);

  private final ServerCloudLinkDao linkDao;
  private final ServerDao serverDao;
  private final CloudStateProvider stateProvider;
  private final CloudProperties properties;

  public CloudLinkServiceImpl(
      ServerCloudLinkDao linkDao,
      ServerDao serverDao,
      CloudStateProvider stateProvider,
      CloudProperties properties) {
    this.linkDao = linkDao;
    this.serverDao = serverDao;
    this.stateProvider = stateProvider;
    this.properties = properties;
  }

  @Override
  public CloudLinkResponse upsert(Long serverId, CloudLinkRequest request) {
    requireActiveServer(serverId);

    linkDao
        .selectByProviderAndExternalId(request.provider(), request.externalId())
        .filter(existing -> !existing.serverId().equals(serverId))
        .ifPresent(
            existing -> {
              throw new CloudLinkConflictException(request.externalId());
            });

    String region =
        (request.region() == null || request.region().isBlank())
            ? properties.aws().region()
            : request.region();

    ServerCloudLink current = linkDao.selectByServerId(serverId).orElse(null);
    try {
      if (current == null) {
        linkDao.insert(
            new ServerCloudLink(
                null,
                serverId,
                request.provider(),
                request.externalId(),
                region,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null));
        log.info("cloud link created: serverId={}", serverId);
      } else {
        // 別インスタンスへ繋ぎ替える可能性があるので観測状態をリセットする
        linkDao.update(
            new ServerCloudLink(
                current.id(),
                serverId,
                request.provider(),
                request.externalId(),
                region,
                null,
                null,
                null,
                null,
                null,
                null,
                current.createdAt(),
                current.updatedAt()));
        log.info("cloud link updated: serverId={}", serverId);
      }
    } catch (DuplicateKeyException e) {
      // DB 一意制約（race）。ドメイン例外へ正規化する
      throw new CloudLinkConflictException(request.externalId());
    }

    return currentResponse(serverId);
  }

  @Override
  public void delete(Long serverId) {
    requireActiveServer(serverId);
    int removed = linkDao.deleteByServerId(serverId);
    if (removed > 0) {
      log.info("cloud link removed: serverId={}", serverId);
    }
  }

  @Override
  public CloudLinkResponse refresh(Long serverId) {
    requireActiveServer(serverId);
    ServerCloudLink link =
        linkDao
            .selectByServerId(serverId)
            .orElseThrow(() -> new ResourceNotFoundException("cloud link", serverId));

    if (!stateProvider.isEnabled()) {
      throw new CloudProviderUnavailableException("cloud state provider is not configured");
    }

    String region =
        (link.region() == null || link.region().isBlank())
            ? properties.aws().region()
            : link.region();
    LocalDateTime now = LocalDateTime.now();
    try {
      Map<String, String> raw = stateProvider.describeStates(region, List.of(link.externalId()));
      String rawState = raw.get(link.externalId());
      if (rawState == null) {
        linkDao.updateState(link.id(), CloudInstanceState.GONE, null, now);
      } else {
        linkDao.updateState(link.id(), CloudStateMapper.fromEc2(rawState), rawState, now);
      }
    } catch (CloudProviderUnavailableException e) {
      // AWS 取得失敗: 状態は据え置き、last_error を記録して 200 で返す（P8 / C5）
      linkDao.updateStateError(link.id(), truncate(e.getMessage()), now);
      log.warn("cloud link refresh failed (cached value kept): serverId={}", serverId);
    }
    return currentResponse(serverId);
  }

  private void requireActiveServer(Long serverId) {
    serverDao
        .selectActiveById(serverId)
        .orElseThrow(() -> new ResourceNotFoundException("Server", serverId));
  }

  private CloudLinkResponse currentResponse(Long serverId) {
    ServerCloudLink link =
        linkDao
            .selectByServerId(serverId)
            .orElseThrow(() -> new ResourceNotFoundException("cloud link", serverId));
    return CloudLinkResponse.from(link, properties.stalenessThreshold(), LocalDateTime.now());
  }

  private static String truncate(String s) {
    if (s == null) {
      return "unknown error";
    }
    return s.length() <= 500 ? s : s.substring(0, 497) + "...";
  }
}
