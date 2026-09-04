-- 初期スキーマ。物理設計の詳細・根拠は docs/db/01-schema.md を参照。
-- テーブル作成順序は FK 依存に従う: users -> tags -> servers -> server_tags -> maintenance_histories

-- ============================================================
-- users: ログインアカウント（MVP は登録・更新 API を持たない。B1）
-- ============================================================
CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- tags: 分類ラベル（全サーバーで共有、大文字小文字を区別、BR-07）
-- ============================================================
CREATE TABLE tags (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- servers: 管理対象サーバー（論理削除、楽観ロック）
-- ============================================================
CREATE TABLE servers (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hostname            VARCHAR(255) NOT NULL,
    ip_address          VARCHAR(45),
    environment         VARCHAR(20) NOT NULL
        CHECK (environment IN ('production', 'staging', 'development')),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'maintenance', 'retired')),
    description         VARCHAR(1000),
    os                  VARCHAR(100),
    os_version          VARCHAR(100),
    virtualization_type VARCHAR(20)
        CHECK (virtualization_type IS NULL OR virtualization_type IN ('physical', 'virtual')),
    location            VARCHAR(255),
    owner               VARCHAR(255),
    version             BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- ホスト名は deleted_at IS NULL の範囲で一意（BR-02）
CREATE UNIQUE INDEX ux_servers_hostname_active ON servers (hostname) WHERE deleted_at IS NULL;
-- 既定ソート（更新日時降順、B6）
CREATE INDEX ix_servers_updated_at ON servers (updated_at);
-- 絞り込み・ダッシュボード集計
CREATE INDEX ix_servers_environment ON servers (environment);
CREATE INDEX ix_servers_status ON servers (status);

-- ============================================================
-- server_tags: サーバー ⇔ タグ 多対多（物理削除、代理キーなし）
-- ============================================================
CREATE TABLE server_tags (
    server_id BIGINT NOT NULL REFERENCES servers (id),
    tag_id    BIGINT NOT NULL REFERENCES tags (id),
    PRIMARY KEY (server_id, tag_id)
);

-- server_id は複合 PK の先頭列としてすでに Index が効くため tag_id 側のみ追加
CREATE INDEX ix_server_tags_tag_id ON server_tags (tag_id);

-- ============================================================
-- maintenance_histories: メンテナンス履歴（登録・参照のみ、B4）
-- ============================================================
CREATE TABLE maintenance_histories (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    server_id      BIGINT NOT NULL REFERENCES servers (id),
    performed_date DATE NOT NULL,
    type           VARCHAR(20) NOT NULL
        CHECK (type IN ('patch', 'config', 'hardware', 'other')),
    worker         VARCHAR(255) NOT NULL,
    content        VARCHAR(2000) NOT NULL,
    impact         VARCHAR(1000),
    result         VARCHAR(1000),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- スキーマ上のみ。MVP は更新する API を持たない（B4）
    deleted_at     TIMESTAMPTZ
);

-- サーバー別履歴（FR-MNT-03）
CREATE INDEX ix_maintenance_histories_server_id_performed_date
    ON maintenance_histories (server_id, performed_date DESC);
-- 全体一覧・ダッシュボードの「直近」（FR-MNT-01 / FR-DASH-01）
CREATE INDEX ix_maintenance_histories_performed_date
    ON maintenance_histories (performed_date DESC);
