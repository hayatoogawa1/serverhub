# 00. 基本設計 概要

- バージョン: 1.0（確定）
- 最終更新: 2026-09-04

## 1. 本書群の位置づけ

| フェーズ | 扱う内容 | 場所 |
|---|---|---|
| Phase 1 要件定義 | 何を作るか（スコープ・機能・非機能・業務ルール・概念データ・画面） | `docs/requirements/` |
| **Phase 2 基本設計（本書群）** | どう作るか（構成・API 契約・論理データ・非機能の設計・画面設計） | `docs/design/basic/` |
| Phase 3 詳細設計 | 機能単位の Request/Response DTO・Entity・DAO・SQL・バリデーション・エラーコード | `docs/design/detail/` |
| Phase 4 DB 設計 | 物理スキーマ・DDL・Flyway マイグレーション・Index | `docs/db/` |

## 2. 入力（前提として従うもの）

- 要件定義書 [docs/requirements/requirements.md](../../requirements/requirements.md) v1.0
- 未決事項 [docs/requirements/open-issues.md](../../requirements/open-issues.md)
- [ADR 0001](../../adr/0001-backend-technology-versions.md) Backend バージョン
- [ADR 0002](../../adr/0002-frontend-technology-versions.md) Frontend バージョン
- [ADR 0003](../../adr/0003-database-neon-with-local-docker-fallback.md) 開発 DB（Neon + ローカル Docker）
- [CLAUDE.md](../../../CLAUDE.md) プロジェクト規約（レイヤ責務・命名・禁止事項・エラー/ログ方針）

## 3. Phase 2 で確定させる未決事項

| ID | 論点 | 扱う文書 |
|---|---|---|
| Q2 | API バージョニング（`/api/v1`）とレスポンスエンベロープ形式 | 02-api |
| S5 | Content-Security-Policy の MVP 方針 | 04-security |
| （グラフ） | グラフライブラリの採否（Recharts 候補） | 06-ui |

Q3（エラーコード体系の値）は **Phase 3** で確定する（Phase 2 では枠組みのみ）。

## 4. 成果物

[README.md](README.md) の一覧（01〜06）。各文書は独立した PR で作成・レビューする。

## 5. 設計の基本方針

- 要件（特に §10 非機能）を「設計上の具体」に落とし、実装フェーズが判断に迷わない状態にする。
- MVP スコープ（requirements §5.1 / §5.2）を広げない。将来拡張は「拡張ポイントの設計」に留める。
- 過剰設計をしない。YAGNI と「2 箇所目で共通化」を守る。
- 決定は根拠とともに残す（重大な選択は ADR 追加も検討）。
