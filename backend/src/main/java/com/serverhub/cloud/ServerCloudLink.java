package com.serverhub.cloud;

import java.time.LocalDateTime;
import org.seasar.doma.Entity;
import org.seasar.doma.GeneratedValue;
import org.seasar.doma.GenerationType;
import org.seasar.doma.Id;
import org.seasar.doma.Table;

/**
 * サーバー ⇔ 外部インスタンスの紐付け 1 件 + 最後に観測した実行状態のキャッシュ （FR-CLOUD-01、設計 07-aws-ec2-integration §4 /
 * §6.1、テーブル定義 V3）。
 *
 * <p>紐付け（{@code provider}/{@code externalId}/{@code region}/{@code accountId}）は人が設定する。 状態（{@code
 * state}/{@code stateRaw}/{@code stateFetchedAt}/{@code lastError}/{@code lastErrorAt}）は ポーラー・手動更新が
 * AWS からの取得結果で設定する。<b>{@code servers} テーブルには一切触れない。</b>
 *
 * <p>{@code createdAt}/{@code updatedAt} は {@link ServerCloudLinkEntityListener} が自動設定する（BR-10）。
 * 楽観ロック（{@code @Version}）は持たない（状態更新はポーラーが last-write-wins、紐付け CRUD は低頻度）。
 */
@Entity(immutable = true, listener = ServerCloudLinkEntityListener.class)
@Table(name = "server_cloud_links")
public record ServerCloudLink(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    Long serverId,
    CloudProvider provider,
    String externalId,
    String region,
    String accountId,
    CloudInstanceState state,
    String stateRaw,
    LocalDateTime stateFetchedAt,
    String lastError,
    LocalDateTime lastErrorAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {

  ServerCloudLink withCreatedAt(LocalDateTime createdAt) {
    return new ServerCloudLink(
        id,
        serverId,
        provider,
        externalId,
        region,
        accountId,
        state,
        stateRaw,
        stateFetchedAt,
        lastError,
        lastErrorAt,
        createdAt,
        updatedAt);
  }

  ServerCloudLink withUpdatedAt(LocalDateTime updatedAt) {
    return new ServerCloudLink(
        id,
        serverId,
        provider,
        externalId,
        region,
        accountId,
        state,
        stateRaw,
        stateFetchedAt,
        lastError,
        lastErrorAt,
        createdAt,
        updatedAt);
  }
}
