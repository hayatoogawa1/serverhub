# 基本設計（Phase 2）

要件定義（[docs/requirements/](../../requirements/) v1.0）と ADR（[docs/adr/](../../adr/)）を入力に、
「どう作るか」を設計レベルで定義する。機能ごとの詳細な DTO / SQL は Phase 3、
DB 物理設計（DDL・マイグレーション）は Phase 4。

| # | ドキュメント | 内容 | 状態 |
|---|---|---|---|
| 00 | [00-overview.md](00-overview.md) | Phase 2 の位置づけ・入力・進め方 | ✅ 確定（v1.0） |
| 01 | [01-architecture.md](01-architecture.md) | システム構成・アプリケーションアーキテクチャ・運用/将来拡張方針 | ✅ 確定（v1.0） |
| 02 | [02-api.md](02-api.md) | API 一覧・API 共通仕様（バージョニング / エンベロープ / エラー形式） | ✅ 確定（v1.0、PR #13） |
| 03 | [03-data-model.md](03-data-model.md) | 論理 ER 図・テーブル一覧・DB 設計方針 | ✅ 確定（v1.0、PR #14） |
| 04 | [04-security.md](04-security.md) | 認証・認可・セキュリティ設計 | ✅ 確定（v1.0、PR #15） |
| 05 | [05-cross-cutting.md](05-cross-cutting.md) | エラー設計・ログ設計・トランザクション方針 | ✅ 確定（v1.0、PR #16） |
| 06 | [06-ui.md](06-ui.md) | 画面設計・フロントエンド設計 | 🚧 レビュー待ち（v1.0 ドラフト） |

## 進め方

Phase 1 と同じサイクル（叩き台 → 採用理由/メリデメ → レビュー → 修正 → 確定）。
確定に伴い `CLAUDE.md` の TODO と `docs/requirements/open-issues.md` を同 PR で更新する。
