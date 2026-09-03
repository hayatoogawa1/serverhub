---
name: spec-sync
description: コードを変更したときに、関連する設計ドキュメント（docs/ 配下）と CLAUDE.md / README を同じ変更（PR）内で更新するための手順。CLAUDE.md「7. 仕様変更時の手順」の運用。
---

# spec-sync — コードと設計ドキュメントの同期

「コードだけ変更して設計書を放置しない」を担保する。実装 PR には対応するドキュメント
更新を含める。

## 手順

1. **影響範囲を調査** — 変更したレイヤ / 機能を特定する。
2. **関連ドキュメントを特定** — 下表を起点に、実体を grep で確認する。
3. **設計 → 実装 → テスト → ドキュメント** の順で差分を揃える。
4. PR の説明に「更新した設計書」を列挙する。

## 変更箇所とドキュメントの対応

| 変更した箇所 | 見直すドキュメント |
|---|---|
| 技術スタック / バージョン / ビルド設定 | `docs/adr/`（新規 ADR を追加）、`CLAUDE.md` §2、`README.md` 技術スタック |
| API（エンドポイント / DTO / ステータス / エラー） | `docs/design/detail/`、`docs/design/basic/` の API 一覧、OpenAPI（コード側アノテーション） |
| DB スキーマ / マイグレーション | `docs/db/`、`docs/design/basic/` の ER 図・テーブル一覧、`backend/src/main/resources/db/migration/` |
| 画面 / 画面遷移 | `docs/design/basic/` 画面一覧・遷移図、`docs/design/detail/` 画面詳細 |
| 認証 / 認可 / セキュリティ方針 | `CLAUDE.md` §3、`docs/design/basic/` 認証・認可設計 |
| コマンド / 開発手順 | `README.md` よく使うコマンド、`CLAUDE.md` §10、`Makefile` |
| 用語 / 業務ルール / スコープ | `docs/requirements/` |

## 注意

- ドキュメントが未作成のフェーズ（例: Phase 1 前の `docs/design/`）は、該当箇所を
  「後続フェーズで反映」と PR に明記すれば可。ただし ADR と CLAUDE.md / README は常に同期する。
- 決定を変える場合、既存 ADR は書き換えず新しい ADR を追加して旧 ADR に `Superseded` を追記。
