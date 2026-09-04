# DB 設計（Phase 4）

詳細設計（[docs/design/detail/](../design/detail/) v1.0）、特に
[03-data-model](../design/basic/03-data-model.md)（基本設計）の論理設計を入力に、
**物理スキーマ**（正確なカラム型・長さ・制約・Index・命名）を確定する。
実際の Flyway マイグレーション SQL は `backend/src/main/resources/db/migration/V1__init.sql`。

| # | ドキュメント | 内容 | 状態 |
|---|---|---|---|
| 01 | [01-schema.md](01-schema.md) | 物理テーブル定義・制約・Index・命名規則 | ✅ 確定（v1.0、PR #26） |

マイグレーション実体: [`V1__init.sql`](../../backend/src/main/resources/db/migration/V1__init.sql)
（🚧 レビュー待ち）。`infra/docker/initdb/01_seed.sql` との整合確認済み（[03-data-model D-DATA-06](../design/basic/03-data-model.md)）。

## 進め方

Phase 1〜3 と同じサイクル（叩き台 → 採用理由/メリデメ → レビュー → 修正 → 確定）。
