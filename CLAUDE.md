# CLAUDE.md — ServerHub 開発ガイド

このファイルは Claude Code および開発者が従うプロジェクト規約を定義する。
実装・設計の判断に迷ったらまずここを参照する。ここに書かれていない重大な判断は
勝手に行わず、開発者（プロジェクトオーナー）に確認する。

> Phase 8（Docker）完了。Phase 9（AWS）着手。各フェーズの決定に伴い随時更新する。

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
| | グラフ | Recharts（確定 → [06-ui](docs/design/basic/06-ui.md) D-UI-01） |
| テスト | BE: JUnit 5 / AssertJ / Mockito / Testcontainers 2.x | |
| | FE: Vitest 4 / React Testing Library / MSW 2 / jsdom | |

技術判断は `docs/adr/` に記録する（[0001](docs/adr/0001-backend-technology-versions.md) BE バージョン / [0002](docs/adr/0002-frontend-technology-versions.md) FE バージョン / [0003](docs/adr/0003-database-neon-with-local-docker-fallback.md) DB）。

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

### Frontend レイヤ責務（横スライス = レイヤ別ディレクトリ）

```
pages/       画面（SC-01〜08）。features を組み立てる
components/  UI 部品。common/ layout/ feedback/ + ドメイン別（auth/ servers/ maintenance/）
hooks/       TanStack Query ラップ（useXxxQuery / useXxxMutation）。ドメインごとに 1 ファイル
api/         HTTP。client（Axios 唯一のインスタンス）/ errors / queryKeys + ドメインごとに 1 ファイル
types/       型（API DTO / ドメイン enum）。ドメインごとに 1 ファイル
validation/  フォーム検証（server.ts / maintenance.ts）
url/         URL クエリ ⇔ 型付きパラメータの変換
utils/ constants/ app/（合成ルート）
```

- **Axios を各コンポーネントから直接呼ばない。** `api/` 層経由（ESLint で禁止）。
- 依存の向き: `pages → components/hooks → api → client`。逆流させない。
- 共通部品は **2 箇所目で必要になった時点で切り出す**。「似ているから」だけの共通化は禁止。
- 詳細は [frontend/README.md](frontend/README.md) / [06-ui](docs/design/basic/06-ui.md)。

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
- **実装クラスは `Impl` 末尾**。単一実装でも `interface Xxx` + `class XxxImpl implements Xxx` に分ける。
  - Backend: Service（`ServerService` + `ServerServiceImpl` …）。DAO は既に `@Dao interface`。Controller / Filter / Advice はフレームワークが具象前提のため対象外。
  - Frontend: api 層（`interface ServersApi` + `class ServersApiImpl` + `export const serversApi`）。React hook・純粋関数モジュール・コンポーネントは対象外（クラスでないため）。
- TypeScript: コンポーネント PascalCase、hook は `useXxx`、API メソッドは動詞始まり（`getServers` 等）。api 層のシングルトンは `xxxApi`。
- DB: テーブル・カラムは snake_case、複数形テーブル名。
- API パス: `/api/v1/...`（URL パスバージョニング。確定 → [02-api](docs/design/basic/02-api.md)）。リソースは複数形・ケバブケース（`/servers` / `/maintenance-histories`）。
- API レスポンス: 成功は軽量形式（単一 = 素の JSON、ページング一覧 = `{ content, page }`）。エラーは `{ code, message, traceId (+ errors[]) }`。JSON キーは `camelCase`、日時は ISO 8601。
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

エラーコード体系は確定 → [docs/design/detail/01-common.md](docs/design/detail/01-common.md) §3。

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

**現在: Phase 8（Docker）完了 → Phase 9（AWS）進行中。**
Phase 6 は Stitch の UI 方針で FE を実装（PR #36〜#42）。Phase 7 は品質確認・不具合修正（#43〜#44）。
Phase 8 はコンテナ化: nginx が SPA 配信 + `/api` を Backend へリバースプロキシ（[ADR 0004](docs/adr/0004-containerization-nginx-spa-reverse-proxy.md)、
`backend/Dockerfile`・`frontend/Dockerfile`+nginx.conf・`infra/docker/docker-compose.app.yml`・`make app-*`、#46）。
**Phase 9 の最重要要件は「AWS EC2 の実行状態を ServerHub 上で参照できること」**（FR-CLOUD-01、
設計 [07-aws-ec2-integration](docs/design/basic/07-aws-ec2-integration.md)、レビュー中）。
不変条件（オーナー指示）: `servers.status`（管理ライフサイクル）を AWS 実行状態で上書きしない・
別モデル別カラム・画面で分離表示・AWS 障害時はキャッシュ + 取得失敗を明示・EC2 の操作機能は作らない・
既存 MVP と既存テスト（BE 89 / FE 123）を壊さない。**設計レビュー確定まで実装 PR を作らない。**

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
| フルスタックをコンテナ起動 / シード / 停止 / ログ | `make app-up` / `make app-seed` / `make app-down` / `make app-logs`（[ADR 0004](docs/adr/0004-containerization-nginx-spa-reverse-proxy.md)） |
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

要件レベルの未決は [docs/requirements/open-issues.md](docs/requirements/open-issues.md) で管理。
Phase 1 時点で残るのは後続フェーズ確定分のみ:

- 開発 DB ポートの `127.0.0.1` バインド（S2）、セッションストア（S6）
- Neon ブランチ CI（N1 → 将来）、本番 DB は Neon か RDS（N2 → Phase 9）

### 確定済み（履歴）

- ベースパッケージ `com.serverhub`（Phase 0-3）
- Backend / Frontend バージョン一式 → [ADR 0001](docs/adr/0001-backend-technology-versions.md) / [0002](docs/adr/0002-frontend-technology-versions.md)
- 開発 DB は Neon 主 + ローカル Docker フォールバック → [ADR 0003](docs/adr/0003-database-neon-with-local-docker-fallback.md)
- Git hosting: GitHub（public, `hayatoogawa1/serverhub`）。`feature/*` → PR → 自己レビュー → `main`
- Phase 1 要件定義 v1.0 確定（B1〜B9 / Q1・Q4〜Q8 / F1〜F7 / S1・S3・S4・S7・S8）→ [docs/requirements/](docs/requirements/)
- Phase 2 基本設計 完了（00〜06 全 6 文書 v1.0）→ [docs/design/basic/](docs/design/basic/)
- Q3（エラーコード体系: 単一フラット名前空間・UPPER_SNAKE_CASE・一覧は 01-common に一元管理）確定 → [01-common](docs/design/detail/01-common.md)（D-DETAIL-03）
- Phase 3 詳細設計 完了（00〜05 全 6 文書 v1.0）→ [docs/design/detail/](docs/design/detail/)
- Phase 4 DB 設計 完了（物理スキーマ設計 + Flyway `V1__init.sql`）→ [docs/db/](docs/db/)
- Phase 5 Backend 実装: ①common（PR #29）・②auth（PR #30）・③server+tag（PR #31）・
  ④maintenance（PR #32）・⑤dashboard（PR #33、集計は 1 セクション 1 クエリ D-DASH-01、
  集計行 record は DAO 射影とレスポンスで共用 D-DASH-04）マージ済み。
  ⑥ログ仕上げ実装中: 構造化ログ ECS を標準出力へ有効化（D-XCUT-09）+ 業務イベント INFO ログ（§4.3）
  → [05-cross-cutting](docs/design/basic/05-cross-cutting.md) §4。これで Phase 5 Backend 実装は完了
- 実サーバー連携（死活監視・構成自動取得等）は MVP 対象外・MVP 後の独立フェーズ → [open-issues E1](docs/requirements/open-issues.md)
- AWS EC2 連携（Phase 9）の既存設計への影響調査を実施 → [open-issues E2](docs/requirements/open-issues.md) /
  [探索ドキュメント](docs/design/exploration/01-aws-ec2-integration-impact.md)。破壊的変更は不要。
  不変条件: **管理 `status`（active/maintenance/retired）を AWS 実行状態で上書きしない**（別テーブル・別 enum・自動整合なし）
- **命名規約変更（オーナー指示）**: 実装クラスは `Impl` 末尾（§4）。
  FE 横スライス化 + api 層 `interface`+`Impl`（#40 マージ済み）。
  Backend の Service を `interface`+`Impl` に分離（ServerService/TagService/MaintenanceHistoryService/
  DashboardService + ServerHubUserDetailsServiceImpl、#41）。Controller はインターフェースを DI（変更なし）
- Phase 6 Frontend 完了: FE-1 基盤（#36）・FE-2 サーバー参照（#37）・FE-3 登録/編集/論理削除（#38）・
  FE-4 メンテナンス履歴（#39）・FE-4.5 横スライス化（#40）・FE-5 ダッシュボード（#42、`recharts`）
  マージ済み。SC-01〜08 + 404 の全画面が揃う。FE のディレクトリ構造は
  [frontend/README.md](frontend/README.md)、Stitch 差分は [06-ui §10](docs/design/basic/06-ui.md)
- Phase 7 テスト: format-file フックを Windows 対応（#43）。
  FE 401 インターセプタの不具合を修正 — `/auth/me` 自身の 401 でも横断ハンドラが起動し
  `['auth','me']` invalidate → `/auth/me` 再取得の無限ループになっていた。認証エンドポイント
  （`/auth/**`）の 401 はハンドラ対象外にした（[06-ui §2.3 / D-UI-03](docs/design/basic/06-ui.md)）。
  FE テスト +13（110→123。ServerListPage の URL クエリ同期 / 絞り込み / ページング、ルーティング統合
  = 戻る/進む・セッション切れ・NotFound、apiClient インターセプタ）。BE は Testcontainers
  結合テスト 89 + Docker Postgres + `bootRun` で主要 API を手動疎通確認。**Phase 7 完了（#43 / #44）**
- Phase 8 Docker: 3 コンテナ（db / backend / frontend=nginx）。**nginx が唯一のエントリポイントで
  `/api` を Backend へリバースプロキシ**（同一オリジン、CORS 不要）。Backend は SPA を配信しない。
  マルチステージビルド・非 root・ヘルスチェック。`make app-up` でフルスタック起動 → ローカルで
  ログイン〜CRUD〜dashboard の疎通を確認済み。`.gitattributes` で `gradlew`/`*.sh`/`Dockerfile`/`.env*` を
  LF 固定（CRLF だと docker build / compose が壊れる）→ [ADR 0004](docs/adr/0004-containerization-nginx-spa-reverse-proxy.md)。**Phase 8 完了（#46）**
- Phase 9 AWS: 最重要要件は **AWS EC2 実行状態の参照**（FR-CLOUD-01）。設計は
  [07-aws-ec2-integration](docs/design/basic/07-aws-ec2-integration.md)（**PR #47 で確定**、論点 P1〜P15 承認）。
  実装 PR 9-1〜9-6:
  - **9-1 完了（#48）**: DB `V3__cloud_links.sql`（`server_cloud_links`）+ `ServerCloudLink` Entity/Listener/`ServerCloudLinkDao` +
    `CloudProvider`/`CloudInstanceState` enum + Converter（`DomainConvertersProvider` に登録）。BE 89 → 102。既存不変。
  - **9-2 完了**: `CloudStateProvider` interface + `Ec2CloudStateProviderImpl`（`@ConditionalOnProperty enabled=true`、
    `ec2:DescribeInstances` のみ、`url-connection-client`）+ `DisabledCloudStateProviderImpl`（既定、常に 503 相当）+
    `CloudStatePoller`（`@Scheduled`、`enabled=true` のみ、失敗時 `last_error` のみ・状態据え置き）+ `CloudProperties`
    （`serverhub.cloud.*`、既定 `enabled=false`）+ AWS SDK v2 `ec2` + `ServerCloudLinkDao` にポーラー用メソッド。
    BE 102 → 111。既存不変。ローカル/CI は AWS 非接続
  - **9-3 完了**: `CloudLinkController` + `CloudLinkServiceImpl`（`@Transactional`、`ServerDao` で存在チェック）+
    `PUT/DELETE /servers/{id}/cloud-link` + `POST .../refresh`（AWS 失敗でも 200 + `lastError`、provider 無効のみ 503）。
    `cloudLink` を `ServerDetailResponse`、`cloudState`/`cloudStateFetchedAt` を `ServerSummaryResponse` に**加算**
    （`ServerServiceImpl` が読み取り専用 `CloudLinkReader` で合成、一覧は `selectByServerIds` で N+1 回避）。
    `CLOUD_LINK_CONFLICT`(409)・`CLOUD_PROVIDER_UNAVAILABLE`(503) を `ErrorCode`/`CloudExceptionHandler` に追加。
    BE 111 → 134。既存不変（`servers`/`Status`/`servers.status` 無変更、レスポンスはフィールド追加のみ）
  - **9-4 完了**: FE `types/cloud` / `api/cloud`（interface+Impl）/ `hooks/cloud` / `validation/cloudLink` /
    `CloudStateChip`（`StatusChip` と別デザイン）/ `CloudLinkPanel`（明細の独立セクション「AWS 連携」、
    `ServerDetailView` は無変更 = `StatusChip` そのまま）/ `CloudLinkFormModal`。refresh の二重送信防止・
    AWS 失敗 200 でキャッシュ表示 + lastError・503 のみエラートースト・未連携は「AWS 未連携」。
    FE テスト 123 → 147。既存不変（cloudLink/cloudState はすべて optional）
  - 9-5: FE 一覧 AWS 列 + MSW + 仕上げ
  - 9-6: AWS IAM ポリシー文書 + デプロイ手順
  不変条件: `servers.status`/`Status` enum を変更しない・AWS 書き込み API 禁止・IAM は `ec2:DescribeInstances` のみ・
  静的キー非保存・ローカル/CI は `enabled=false`・AWS 障害時も台帳画面は動く・FE から AWS を直接呼ばない・
  既存 BE 89 / FE 123 を壊さない
- Phase 2 基本設計 00-overview / 01-architecture v1.0 確定 → [docs/design/basic/](docs/design/basic/)
- Q2（API バージョニング `/api/v1` + 軽量レスポンス形式 + 統一エラーエンベロープ）確定 → [02-api](docs/design/basic/02-api.md)（D-API-01〜07）
- Phase 2 基本設計 02-api / 03-data-model v1.0 確定 → [docs/design/basic/](docs/design/basic/)
- S5（CSP は緩め・enforce。Swagger UI は開発のみ未認証・本番は認証必須）確定 → [04-security](docs/design/basic/04-security.md)（D-SEC-01〜06）
