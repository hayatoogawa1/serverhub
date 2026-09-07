-- AWS EC2 等の外部インスタンスと servers の紐付け + 最後に観測した実行状態のキャッシュ。
-- 設計: docs/design/basic/07-aws-ec2-integration.md（FR-CLOUD-01 / E2）。
--
-- 重要（オーナー指示の不変条件）:
--   * servers.status（人が管理するライフサイクル状態）とは別概念。ここには「観測された実行状態」だけを持つ。
--   * state 系はポーラーが更新する。servers 本体・servers.version・servers.updated_at には一切触れない。
--   * サーバー論理削除時もこの行は残す。読取クエリ側で servers.deleted_at IS NULL を JOIN 条件にする。
--   * 秘密情報（AWS アクセスキー等）は保存しない。保持するのは識別子と観測状態のみ。

CREATE TABLE server_cloud_links (
    id               BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    server_id        BIGINT       NOT NULL REFERENCES servers (id),
    provider         VARCHAR(30)  NOT NULL CHECK (provider IN ('aws_ec2')),
    external_id      VARCHAR(255) NOT NULL,          -- EC2 インスタンス ID（i-...）
    region           VARCHAR(30),                    -- 例 ap-northeast-1
    account_id       VARCHAR(20),                    -- 12 桁。手入力では通常 NULL

    -- 最後に観測した実行状態（AWS からのみ書き込まれる）
    state            VARCHAR(20)
        CHECK (state IS NULL OR state IN
            ('running', 'stopped', 'pending', 'stopping', 'terminated', 'unknown', 'gone')),
    state_raw        VARCHAR(50),                    -- provider の生値（例 "shutting-down"）
    state_fetched_at TIMESTAMPTZ,                    -- この state を取得した時刻（成功時のみ更新）

    -- 直近の取得失敗（成功でクリア）
    last_error       VARCHAR(500),
    last_error_at    TIMESTAMPTZ,

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- 1 Server ⇔ 最大 1 リンク
    CONSTRAINT ux_server_cloud_links_server UNIQUE (server_id),
    -- 同じ EC2 インスタンスを複数のサーバーに紐付けない（409 CLOUD_LINK_CONFLICT）
    CONSTRAINT ux_server_cloud_links_provider_external UNIQUE (provider, external_id)
);

-- ポーラーの「古い順に取得」用
CREATE INDEX ix_server_cloud_links_state_fetched_at ON server_cloud_links (state_fetched_at);
