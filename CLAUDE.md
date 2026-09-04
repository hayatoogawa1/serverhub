# CLAUDE.md — ServerHub 開発ガイド

このファイルは Claude Code および開発者が従うプロジェクト規約を定義する。
実装・設計の判断に迷ったらまずここを参照する。ここに書かれていない重大な判断は
勝手に行わず、開発者（プロジェクトオーナー）に確認する。

> 🚧 Phase 0 進行中。各フェーズの決定に伴い随時更新する。TODO は未確定項目。

---

## 1. プロジェクト概要

- **目的**: インフラチームのサーバー情報・メンテナンス情報を一元管理し、運用業務を効率化する。
- **性質**: 実務を意識したポートフォリオ。保守性・可読性・セキュリティ・テスト容易性・拡張性を妥協しない。
- **開発体制**: 1 名 + Claude Code。

### MVP スコープ

**実装する**: 認証（ログイン/ログアウト/未認証遮断）、サーバー CRUD・検索・ページング、
タグ付与/絞り込み、メンテナンス履歴（一覧/登録/詳細から確認）、簡易ダッシュボード、共通 UI。

**実装しない（拡張余地のみ残す）**: SSL 期限管理、定期メンテナンス、障害履歴、
CSV インポート/エクスポート、操作ログ、権限管理（ロール）。

→ **MVP の範囲を勝手に拡張しない。**

---

## 2. 技術スタック（確定分）

| 層 | 技術 | バージョン |
|---|---|---|
| Backend | Java | 17 |
| | Spring Boot | 4.1.1 |
| | Spring Security | Spring Boot 4.1.1 同梱（7.x 系） |
| | Doma | doma-processor 3.11.1 + doma-spring-boot-starter 3.0.0 + doma compile plugin 4.0.3 |
| | マイグレーション | Flyway（`spring-boot-starter-flyway` + `flyway-database-postgresql`） |
| | API ドキュメント | springdoc-openapi-starter-webmvc-ui 3.1.0（コードファースト） |
| | DB | Neon（クラウド PostgreSQL、通常開発）/ Docker `postgres:16-alpine`（オフライン・CI）。切替は環境変数 → [ADR 0003](docs/adr/0003-database-neon-with-local-docker-fallback.md) |
| | ビルド | Gradle 8.14.5（Kotlin DSL）+ Wrapper |
| Frontend | React 19.2 / TypeScript 6.0.x / Vite 8.2 | |
| | MUI 9 / React Router 7 / Axios 1.x / TanStack Query 5 | |
| | Lint/Format | ESLint 10 flat + typescript-eslint（型情報つき）+ Prettier 3 |
| | Node.js | 24（`.nvmrc`、Active LTS） |
| | グラフ | Recharts（**未確定**・要承認） |
| テスト | BE: JUnit 5 / AssertJ / Mockito / Testcontainers 2.x | |
| | FE: Vitest 4 / React Testing Library / MSW 2 / jsdom | |

バージョン選定根拠は `docs/adr/` に記録する（[0001](docs/adr/0001-backend-technology-versions.md) BE / [0002](docs/adr/0002-frontend-technology-versions.md) FE）。

---

## 3. アーキテクチャ原則

### Backend レイヤ責務

```
Controller → Service → DAO(Doma) → PostgreSQL
```

- **Controller**: HTTP 受付、Request DTO 受け取り、Bean Validation、Service 呼び出し、Response 組み立てのみ。ビジネスロジックを持たない。
- **Service**: ビジネスロジック、`@Transactional` によるトランザクション境界、業務ルール、複数 DAO を跨ぐ処理。
- **DAO**: SQL 実行のみ。`@Dao` インターフェース + 外部 SQL ファイル。Doma の思想を尊重する。
- 例外は `@RestControllerAdvice` の `GlobalExceptionHandler` で一元処理。統一エラーレスポンス（`code` / `message` / `traceId`）を返す。**StackTrace・内部情報をレスポンスに含めない。**
- リクエストごとに `traceId` を MDC に載せ、全ログに出力する。

### Frontend レイヤ責務

```
Page → Feature → Component
         ↘ Hook（TanStack Query ラップ）→ api/（関数群）→ apiClient（Axios）→ Backend
```

- **Axios を各コンポーネントから直接呼ばない。** `api/` 層経由。
- 共通部品（Button / Modal / ConfirmDialog / DataTable / Pagination / StatusBadge / Tag / Loading / ErrorMessage / Notification 等）は **2 箇所目で必要になった時点で切り出す**。先行共通化・「似ているから」だけの共通化は禁止。

### 認証・認可

- セッション + HttpOnly/Secure Cookie（Spring Security フォームログイン）。JWT 不採用。
- CSRF 対策を有効化。SPA はバックエンドと同一ドメイン配信前提。
- MVP は全ユーザー同一権限。ただし **将来の権限管理追加を考慮した設計**にする（ロール用の拡張ポイントを残す）。
- ユーザー登録画面は作らない。ユーザーは Flyway シード SQL または初期化スクリプトで作成。
- セキュリティ要件の詳細（認証・セッション・CSRF・入力検証・SQLi/XSS・機密情報・ログ・
  エラー・HTTP ヘッダ・DB・Secret・CORS・脆弱性管理と MVP での実装範囲）は
  [docs/requirements/requirements.md](docs/requirements/requirements.md) §10.1 を参照。

### 削除方式

- `servers` / `maintenance_histories` は**論理削除**（`deleted_at`）。一覧・検索は `deleted_at IS NULL` 前提。
- `server_tags`（中間テーブル）は物理削除。

---

## 4. コーディング規約

### 命名

- Java: ベースパッケージは `com.serverhub`（確定）。以下、機能別にサブパッケージを切る。クラス/メソッドは英語、意図が伝わる名前。
- TypeScript: コンポーネント PascalCase、hook は `useXxx`、API 関数は動詞始まり（`getServers` 等）。
- DB: テーブル・カラムは snake_case、複数形テーブル名。
- API パス: `/api/v1/...`（**TODO: 確定**）。
- queryKey: 階層構造（例 `['servers', 'list', params]` / `['servers', 'detail', id]`）。

### 禁止事項

- 「とりあえず動く」コード、巨大な Controller/Service、重複コード
- ハードコード、Magic Number / Magic String（定数・enum・設定に切り出す）
- N+1、不要な API 通信、不適切な DB アクセス
- SQL インジェクション等のセキュリティ問題、不十分なバリデーション
- 例外の握り潰し、`console.log` の乱用（構造化ロガーを使う）
- `any` の安易な利用、型安全性を無視した TypeScript
- テストしづらい設計、過剰設計

### エラー設計

| HTTP | 用途 |
|---|---|
| 400 | バリデーションエラー、不正なリクエスト |
| 401 | 未認証 |
| 403 | 認証済みだが権限なし |
| 404 | リソース不存在 |
| 409 | 一意制約違反・状態競合 |
| 500 | 想定外のサーバーエラー（詳細はログのみ、レスポンスは汎用メッセージ） |

エラーコード体系は Phase 3 で確定（**TODO**）。

### ログ設計

- アプリケーションログ / エラーログを構造化して出力。`traceId` を必ず含める。
- **パスワード・トークン・セッション ID・その他機密情報はログ出力禁止。**

---

## 5. テスト方針

| レイヤ | 何をテストするか |
|---|---|
| BE Service | 業務ロジック・業務ルール（Mockito で DAO をモック） |
| BE Controller/API | リクエスト/レスポンス、バリデーション、HTTP ステータス、認証 |
| BE DAO | 実 DB（Testcontainers）に対する SQL の正しさ |
| BE 結合 | 主要ユースケースの E2E（コントローラ〜DB） |
| FE Component | 表示・イベント |
| FE Hook | データ取得・キャッシュ・エラー状態（MSW で API モック） |
| FE 画面 | 主要画面の正常系・異常系 |

観点: 正常系 / 異常系（必須未入力・不正形式・不存在 ID・重複・認証/権限・DB/API エラー）/ 境界値（最小・最大・最大文字数・0件・1件・最大件数・ページ先頭/末尾/存在しないページ）。

→ **テストなしで機能完成と判断しない。**

---

## 6. Git 運用

- **`main` への直接コミットは原則禁止。**（例外: リポジトリ初期化の最初のコミットのみ）
- フロー: `feature/<短い説明>` ブランチを切る → 実装 → PR 作成 → 自己レビュー → `main` へマージ。
- 1 コミット 1 目的。小さく。無関係な変更を混ぜない。
- コミットメッセージは意味のある日本語 or 英語で、何を・なぜ変えたか分かる粒度。
- コード変更に伴い設計書（`docs/`）を同じ PR で更新する。

---

## 7. 仕様変更時の手順

1. 影響範囲を調査 → 2. 関連設計書を特定 → 3. 設計変更 → 4. 実装変更 → 5. テスト変更 → 6. ドキュメント変更。
コードだけ変更して設計書を放置しない。

---

## 8. Claude Code への重要ルール

1. 仕様が不明確なら質問する。
2. 重大な設計判断を勝手に行わない。
3. 実装前に既存コードと関連ドキュメントを読む。
4. 変更範囲を最小限にする。
5. テストなしで機能完成と判断しない。
6. エラーを握り潰さない。
7. セキュリティ上危険な実装をしない。
8. 技術的負債を増やす実装を安易に選ばない。
9. 過剰設計もしない。
10. MVP の範囲を勝手に拡張しない。
11. 一度に大量のコードを書かない。各 Phase をレビュー可能な状態にしてから次へ進む。

---

## 9. 開発ワークフロー（フェーズ）

Phase 0 環境・ルール整備 → 1 要件定義 → 2 基本設計 → 3 詳細設計 → 4 DB 設計 →
5 Backend 実装 → 6 Frontend 実装 → 7 テスト → 8 Docker → 9 AWS → 10 レビュー・改善。

**現在: Phase 0。**

---

## 10. よく使うコマンド

> 🚧 各コンポーネント追加時に追記。README.md の「よく使うコマンド」と同期する。

すべてリポジトリルートから `make <target>`（`make help` で一覧）。

| 目的 | コマンド |
|---|---|
| 初回セットアップ（`.env` / git hooks / `npm ci`） | `make setup` |
| DB: 通常は Neon（`.env` に `SPRING_PROFILES_ACTIVE=neon` + `SPRING_DATASOURCE_*`）。オフラインはローカル Docker | [ADR 0003](docs/adr/0003-database-neon-with-local-docker-fallback.md) |
| ローカル DB 起動 / 停止 / 作り直し / シード | `make db-up` / `make db-down` / `make db-reset` / `make db-seed` |
| Backend 起動 / ビルド / テスト / 整形 | `make be-run` / `make be-build` / `make be-test`（Docker 必須） / `make be-format` |
| Frontend 開発 / チェック / ビルド / 整形 | `make fe-dev` / `make fe-check` / `make fe-build` / `make fe-format` |
| 全チェック（push 前相当） | `make check` |
| Flyway マイグレーション配置先 | `backend/src/main/resources/db/migration/`（`V<n>__<説明>.sql`） |
| API ドキュメント | `http://localhost:8080/swagger-ui.html` |

### 自動化（`.claude/` / `.githooks/`）

- **Claude Code フック**（`.claude/settings.json`）: ファイル編集後に Frontend の変更ファイルを Prettier 整形。
- **git pre-commit**: 変更ファイルのみ Prettier `--check` + ESLint、Java は `spotlessCheck`、`.env` 混入検知。
- **git pre-push**: 変更のあった側の `./gradlew check` / FE の typecheck+lint+test+build（Docker 不在時は BE テストをスキップ）。
- **GitHub Actions**（`.github/workflows/ci.yml`）: push / PR で BE `./gradlew check`（Testcontainers 含む）+ FE 全チェック。
- **Skills**（`.claude/skills/`）: `verify`（完了前の検証手順）、`spec-sync`（コードと設計書の同期）。

---

## 11. 未確定事項（要承認）

- API のバージョニング方針（`/api/v1`）とレスポンスエンベロープ形式
- 一覧のデフォルトソート・1 ページ件数
- サーバー属性 / メンテナンス履歴項目 / 環境・ステータス区分（B2〜B5、要件定義で叩き台 → 承認）
- グラフライブラリ（Recharts 候補）

### 確定済み（履歴）

- ベースパッケージ `com.serverhub`（Phase 0-3）
- Backend バージョン一式 → [docs/adr/0001](docs/adr/0001-backend-technology-versions.md)
- Git hosting: GitHub（public, `hayatoogawa1/serverhub`）。`feature/*` → PR → 自己レビュー → `main`
