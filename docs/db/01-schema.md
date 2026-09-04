# 01. 物理スキーマ設計

- バージョン: 1.0（確定、PR #26）
- 最終更新: 2026-09-05
- 関連: [03-data-model](../design/basic/03-data-model.md)（論理設計、確定済み）/
  [01-common](../design/detail/01-common.md)・[02-auth](../design/detail/02-auth.md)・
  [03-server](../design/detail/03-server.md)・[04-maintenance](../design/detail/04-maintenance.md)（Entity/Doma マッピング前提） /
  [ADR 0001](../adr/0001-backend-technology-versions.md)（PostgreSQL 16）/
  `infra/docker/initdb/01_seed.sql`（列名の前提と整合）

論理設計（[03-data-model](../design/basic/03-data-model.md)）で決めた方針を、実際に
`CREATE TABLE` できる精度まで確定する。**実 SQL（Flyway マイグレーション）は本書確定後の別 PR**。

---

## 1. 共通方針

| 項目 | 決定 |
|---|---|
| スキーマ | `public`（別スキーマを切る積極的理由がないため、[03-data-model §4.7](../design/basic/03-data-model.md) の運用をシンプルに保つ） |
| 文字コード / 照合順序 | DB 既定（UTF-8、`en_US.UTF-8` 等 Docker イメージ既定）。**タグ名の大文字小文字区別**（BR-07）は PostgreSQL の `=` 比較が既定でバイト完全一致のため、専用の照合順序（`C` 等）は不要 |
| IP アドレス型 | ネイティブ `inet`/`cidr` は使わない。`varchar(45)` のまま（03-data-model の論理設計を踏襲。IPv4/IPv6 形式検証は Backend 側 `@IpAddress`、[01-common §2.1](../design/detail/01-common.md)） |
| 監査列（`created_at`/`updated_at`） | **アプリ（Doma `EntityListener`）が権威**（[01-common §4](../design/detail/01-common.md) D-DETAIL-05）。DB の `DEFAULT now()` は INSERT 時の安全網のみで、**`UPDATE` 時に自動更新するトリガーは設けない**（アプリと DB が値を取り合う状態を避ける、D-DB-01） |
| 制約・Index の命名 | PostgreSQL の既定命名（`<table>_<column(s)>_<key|fkey|idx>` 相当）に従う。独自の命名規則は設けない（過剰な標準化を避ける、D-DB-02）。例外は §3 の部分ユニーク Index のみ明示的に命名する |
| enum の表現 | `varchar(n)` + `CHECK`（DB enum 型は使わない、[03-data-model §4.3](../design/basic/03-data-model.md) D-DATA-04） |
| 主キー | 全テーブル `bigint GENERATED ALWAYS AS IDENTITY`（`server_tags` を除く、[03-data-model §4.2](../design/basic/03-data-model.md) D-DATA-01） |

---

## 2. テーブル定義

### 2.1 `users`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | `bigint` | `PRIMARY KEY GENERATED ALWAYS AS IDENTITY` |
| `email` | `varchar(255)` | `NOT NULL UNIQUE` |
| `password_hash` | `varchar(255)` | `NOT NULL`（bcrypt ハッシュは 60 文字程度、余裕を見て 255） |
| `display_name` | `varchar(255)` | `NOT NULL` |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

MVP は登録・更新 API を持たない（B1、[02-auth §1](../design/detail/02-auth.md)）。値は Flyway シード時点で固定。

### 2.2 `servers`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | `bigint` | `PRIMARY KEY GENERATED ALWAYS AS IDENTITY` |
| `hostname` | `varchar(255)` | `NOT NULL` |
| `ip_address` | `varchar(45)` | NULL 可 |
| `environment` | `varchar(20)` | `NOT NULL CHECK (environment IN ('production','staging','development'))` |
| `status` | `varchar(20)` | `NOT NULL CHECK (status IN ('active','maintenance','retired')) DEFAULT 'active'` |
| `description` | `varchar(1000)` | NULL 可 |
| `os` | `varchar(100)` | NULL 可 |
| `os_version` | `varchar(100)` | NULL 可 |
| `virtualization_type` | `varchar(20)` | `CHECK (virtualization_type IS NULL OR virtualization_type IN ('physical','virtual'))`、NULL 可 |
| `location` | `varchar(255)` | NULL 可 |
| `owner` | `varchar(255)` | NULL 可 |
| `version` | `bigint` | `NOT NULL DEFAULT 0`（楽観ロック、[03-data-model §4.5](../design/basic/03-data-model.md)） |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `deleted_at` | `timestamptz` | NULL 可（論理削除、BR-01） |

**Index / 制約**（[03-data-model §4.6](../design/basic/03-data-model.md)）

```sql
CREATE UNIQUE INDEX ux_servers_hostname_active ON servers (hostname) WHERE deleted_at IS NULL;
CREATE INDEX ix_servers_updated_at ON servers (updated_at);
CREATE INDEX ix_servers_environment ON servers (environment);
CREATE INDEX ix_servers_status ON servers (status);
```

### 2.3 `tags`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | `bigint` | `PRIMARY KEY GENERATED ALWAYS AS IDENTITY` |
| `name` | `varchar(50)` | `NOT NULL UNIQUE`（1〜50 文字は Backend バリデーションで担保、BR-07） |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

サジェスト（`LIKE 'prefix%'`）のため `name` の UNIQUE 制約が B-tree Index を兼ねる
（前方一致は既存 Index が効く、[03-data-model §4.6](../design/basic/03-data-model.md)）。

### 2.4 `server_tags`

| カラム | 型 | 制約 |
|---|---|---|
| `server_id` | `bigint` | `NOT NULL REFERENCES servers(id)` |
| `tag_id` | `bigint` | `NOT NULL REFERENCES tags(id)` |

- `PRIMARY KEY (server_id, tag_id)`（複合キー、代理キーなし、[03-data-model §2.1](../design/basic/03-data-model.md) D-DATA-03）。
- 追加 Index: `CREATE INDEX ix_server_tags_tag_id ON server_tags (tag_id);`（`server_id` は PK の
  先頭列としてすでに Index が効くため、`tag_id` 側のみ追加）。
- 物理削除のみ（`deleted_at` を持たない、[03-data-model §4.4](../design/basic/03-data-model.md)）。
- `ON DELETE` 句は付けない：`servers`/`tags` は物理削除しない運用のため発火しない
  （[03-data-model §3](../design/basic/03-data-model.md)）。将来物理削除を導入する場合に再検討。

### 2.5 `maintenance_histories`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | `bigint` | `PRIMARY KEY GENERATED ALWAYS AS IDENTITY` |
| `server_id` | `bigint` | `NOT NULL REFERENCES servers(id)` |
| `performed_date` | `date` | `NOT NULL`（未来日許容、範囲制約なし、BR-10） |
| `type` | `varchar(20)` | `NOT NULL CHECK (type IN ('patch','config','hardware','other'))` |
| `worker` | `varchar(255)` | `NOT NULL` |
| `content` | `varchar(2000)` | `NOT NULL` |
| `impact` | `varchar(1000)` | NULL 可 |
| `result` | `varchar(1000)` | NULL 可 |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `deleted_at` | `timestamptz` | NULL 可（**スキーマ上のみ**。MVP は更新する API を持たない、B4） |

**Index**（[03-data-model §4.6](../design/basic/03-data-model.md) / [04-maintenance §1](../design/detail/04-maintenance.md)）

```sql
CREATE INDEX ix_maintenance_histories_server_id_performed_date
  ON maintenance_histories (server_id, performed_date DESC);
CREATE INDEX ix_maintenance_histories_performed_date
  ON maintenance_histories (performed_date DESC);
```

- 前者はサーバー別履歴（FR-MNT-03）、後者は全体一覧・ダッシュボードの「直近」（FR-MNT-01/FR-DASH-01）。

---

## 3. テーブル作成順序（FK 依存）

`V1__init.sql` は以下の順で作成する（依存先が先）：

```
users → tags → servers → server_tags（servers, tags 双方に依存） → maintenance_histories（servers に依存）
```

`users` は他テーブルと関連を持たないため順序は独立（[03-data-model §2.3](../design/basic/03-data-model.md)、
「担当者」はフリーテキストで `users` と FK にしない）。

---

## 4. `infra/docker/initdb/01_seed.sql` との整合確認

既存シードファイルが前提とする列名・テーブル名は本書の定義と一致する（`01_seed.sql` 冒頭の
「Phase 4 の物理設計で確定後、必要なら本ファイルを更新する」を解消）：

| テーブル | シードが使う列 | 本書の定義 | 一致 |
|---|---|---|---|
| `users` | `email, password_hash, display_name` | 同左 | ✅ |
| `tags` | `name` | 同左 | ✅ |
| `servers` | `hostname, ip_address, environment, status, description, os, os_version, virtualization_type, location, owner` | 同左 | ✅ |
| `server_tags` | `server_id, tag_id` | 同左 | ✅ |
| `maintenance_histories` | `server_id, performed_date, type, worker, content, impact, result` | 同左 | ✅ |

`01_seed.sql` の修正は不要。次の Flyway SQL 実装後、`make db-reset && make be-run && make db-seed`
で疎通確認する（Phase 5 の初期検証項目）。

---

## 5. Doma マッピングとの整合

[01-common §4](../design/detail/01-common.md) / [02-auth](../design/detail/02-auth.md) の
`immutable entity（record）` + Doma 既定命名規約（`camelCase ⇄ snake_case`）は、本書のカラム名
（すべて Entity フィールド名から機械的に導出可能な snake_case）とそのまま整合する。
`@Column` によるカラム名の明示指定は不要。

---

## 6. この文書で追加・確定した事項

| ID | 事項 | 根拠 |
|---|---|---|
| D-DB-01 | `updated_at` を自動更新する DB トリガーは設けない。アプリ（`EntityListener`）が唯一の権威、DB の `DEFAULT now()` は INSERT 時の安全網のみ | 二重管理の回避（01-common D-DETAIL-05 の徹底） |
| D-DB-02 | 制約・Index の命名は PostgreSQL 既定命名に従う（部分ユニーク Index など明示命名が必要なものだけ命名） | 過剰な標準化を避ける |
| D-DB-03 | スキーマは `public` を使う（別スキーマを切らない） | 別スキーマを要する具体的理由がない（YAGNI） |
| D-DB-04 | IP アドレス列はネイティブ `inet` 型を使わず `varchar(45)` のまま | 03-data-model の論理設計（文字列型）を踏襲、Phase 4 で再決定しない |

- 実際の `CREATE TABLE`/`CREATE INDEX` を含む Flyway マイグレーションは
  [`backend/src/main/resources/db/migration/V1__init.sql`](../../backend/src/main/resources/db/migration/V1__init.sql)。
- DB ユーザー分離・権限最小化（S1）は Phase 4〜5 の対象（[03-data-model §4.7](../design/basic/03-data-model.md)）。
  本書は含まない（マイグレーション実装 PR 側で検討）。
