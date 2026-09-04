# DB 設計（Phase 4）

詳細設計（[docs/design/detail/](../design/detail/) v1.0、特に
[03-data-model](../design/detail/../basic/03-data-model.md) の論理設計）を入力に、
**物理スキーマ**（正確なカラム型・長さ・制約・Index・命名）を確定する。
実際の Flyway マイグレーション SQL（`backend/src/main/resources/db/migration/V1__init.sql`）は
本書確定後の別 PR で作成する。

| # | ドキュメント | 内容 | 状態 |
|---|---|---|---|
| 01 | [01-schema.md](01-schema.md) | 物理テーブル定義・制約・Index・命名規則 | 🚧 レビュー待ち（v1.0 ドラフト） |

## 進め方

Phase 1〜3 と同じサイクル（叩き台 → 採用理由/メリデメ → レビュー → 修正 → 確定）。
確定後、`V1__init.sql`（Flyway）を別 PR で作成し、`infra/docker/initdb/01_seed.sql` との
整合を確認する（[03-data-model D-DATA-06](../design/basic/03-data-model.md)）。
