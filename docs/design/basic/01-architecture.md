# 01. システム構成・アーキテクチャ

- バージョン: 0.1（ドラフト）
- 最終更新: 2026-09-04

## 1. システム構成

### 1.1 論理構成（環境共通）

```mermaid
flowchart LR
  U[利用者ブラウザ] -->|HTTPS| FE[SPA<br/>React + Vite ビルド成果物]
  U -->|"/api/v1/* (同一オリジン)"| BE[Backend<br/>Spring Boot]
  BE -->|JDBC / SSL| DB[(PostgreSQL)]
  BE -.->|OpenAPI| SW[Swagger UI]
```

- SPA と Backend は**同一オリジン**で配信する（requirements §6.1 P1、§10.1.17）。
  ブラウザから見て `/api/v1/*` は Backend、それ以外は SPA。CORS は不要（全拒否）。
- DB 接続は環境変数で切り替え（[ADR 0003](../../adr/0003-database-neon-with-local-docker-fallback.md)）。

### 1.2 開発環境

```mermaid
flowchart LR
  Dev[開発者ブラウザ<br/>localhost:5173] -->|"/ (静的)"| Vite[Vite dev server :5173]
  Dev -->|"/api/*"| Vite
  Vite -->|proxy /api → :8080| BE[Spring Boot :8080]
  BE -->|JDBC| DBsel{DB 切替}
  DBsel -->|"通常 (.env: SPRING_PROFILES_ACTIVE=neon)"| Neon[(Neon<br/>クラウド PostgreSQL)]
  DBsel -->|"オフライン (既定)"| Local[(Docker postgres:16-alpine<br/>localhost:5432)]
```

- Vite dev server の proxy（[ADR 0002](../../adr/0002-frontend-technology-versions.md)）でブラウザからは同一オリジン。
- Backend は `make be-run`（`.env` を読み込んで `./gradlew bootRun`）。
- スキーマは Flyway が起動時に適用（Neon / ローカル共通）。オフラインデモのシードは `make db-seed`。

### 1.3 本番想定（詳細は Phase 9）

```mermaid
flowchart LR
  U[利用者] -->|HTTPS| ALB[ALB<br/>TLS 終端 / HTTP→HTTPS]
  ALB -->|"/ (静的)"| S[SPA 配信<br/>（S3+CloudFront or Backend 同梱）]
  ALB -->|"/api/v1/*"| APP[Backend<br/>ECS Fargate 等]
  APP -->|"JDBC / sslmode=require"| PDB[(本番 DB<br/>Neon or RDS ※N2)]
```

- TLS 終端は ALB、証明書は ACM。HTTP は HTTPS へリダイレクト。HSTS を付与（requirements §10.1.13/14）。
- Backend は `X-Forwarded-*` を尊重（`server.forward-headers-strategy`）。
- SPA の配信方法（Backend 同梱 or 別配信）、本番 DB（N2）、コンテナ基盤は **Phase 9 で確定**。
- MVP は単一インスタンス前提（requirements §10.3 / S6）。冗長化・オートスケールは将来。

## 2. アプリケーションアーキテクチャ

### 2.1 Backend レイヤ

```
HTTP Request
  │
  ▼
[Filter] TraceId 付与(MDC) → Spring Security(認証/CSRF)
  │
  ▼
Controller  … HTTP 受付 / Request DTO / Bean Validation / Response 組み立て
  │  (Command/Query オブジェクト, ドメイン引数)
  ▼
Service     … 業務ロジック / @Transactional 境界 / 業務ルール / 複数 DAO 調整
  │  (Entity / 検索条件オブジェクト)
  ▼
DAO (Doma)  … SQL 実行のみ。@Dao インターフェース + 外部 SQL ファイル
  │
  ▼
PostgreSQL

例外は全レイヤから GlobalExceptionHandler(@RestControllerAdvice) へ → 統一エラーレスポンス
```

- 責務は `CLAUDE.md` §3 のとおり。Controller に業務ロジックを置かない。DAO は SQL のみ。
- 横断的関心事（詳細は各 PR）:
  - 認証・認可・CSRF: Spring Security（04-security）
  - trace: リクエストごとに `traceId` を MDC へ（05-cross-cutting）
  - 例外→レスポンス: `GlobalExceptionHandler`（05-cross-cutting）
  - トランザクション: Service の `@Transactional`（05-cross-cutting）
  - API ドキュメント: springdoc（コードファースト、02-api）

### 2.2 Backend パッケージ構成（`com.serverhub`）

**機能別（package by feature）** を基本とする（`CLAUDE.md` §4「機能別にサブパッケージを切る」）。

```
com.serverhub
├── ServerHubApplication
├── config/          … SecurityConfig, OpenApiConfig, WebConfig など横断設定
├── common/          … 横断部品
│   ├── error/       … GlobalExceptionHandler, ApiError, 業務例外クラス群
│   ├── web/         … TraceIdFilter, 共通レスポンス（エンベロープ）
│   └── page/        … ページング/ソートの共通型（PageRequest, PageResponse, Sort ホワイトリスト）
├── auth/            … ログイン/ログアウトに関わる設定・ハンドラ、CurrentUser 取得
├── user/            … users テーブル（認証用）。UserDao, User, UserDetailsService 実装
├── server/          … ServerController / ServerService / ServerDao / dto / Server
│   └── sql/         … Doma の SQL ファイル（resources 側に対応ディレクトリ）
├── tag/             … TagController / TagService / TagDao（サジェスト含む）
├── maintenance/     … MaintenanceController / Service / Dao / dto
└── dashboard/       … DashboardController / Service / Dao（集計クエリ）
```

- 各機能パッケージ内に Controller / Service / Dao / dto を置く。機能を跨ぐ共有型のみ `common` へ。
- 認可（ロール）を将来追加する場合の差し込み点: `config/SecurityConfig`（`authorizeHttpRequests` /
  メソッドセキュリティ）と各 `Service`（業務ルールとしての権限チェック）。MVP では設けない
  （requirements §10.1.5）。

### 2.3 Frontend レイヤ

```
main.tsx（Providers: QueryClient / Theme / Router）
  │
Page（ルーティング単位。SC-01〜08）
  │
Feature（features/<domain>: 画面機能のまとまり）
  ├─ components/  … その feature 専用の表示部品
  ├─ hooks/       … useXxxQuery / useXxxMutation（TanStack Query ラップ）
  ├─ api/         … 関数群（getServers 等）。apiClient を使う
  └─ types.ts     … その feature の型（API 型含む）
  │
共有: src/components（共通部品）/ src/hooks / src/api/apiClient（Axios）/ src/types / src/utils
```

- ディレクトリは既存スキャフォールド（[ADR 0002](../../adr/0002-frontend-technology-versions.md)）に準拠。
- feature: `features/auth` / `features/servers` / `features/maintenance` / `features/dashboard`。
- **Axios を各コンポーネントから直接呼ばない**（ESLint で禁止済み）。`features/<d>/api` → `apiClient`。
- 詳細（queryKey 設計・invalidation・ルーティング・認証ガード・共通部品）は 06-ui。

### 2.4 フロント ↔ バック通信

- ベース URL: `/api/v1`（Q2、02-api で確定）。`apiClient` は `baseURL: '/api/v1'`, `withCredentials: true`。
- 認証: セッション Cookie（HttpOnly）。CSRF: `XSRF-TOKEN` Cookie → `X-XSRF-TOKEN` ヘッダ
  （Axios 標準機能、requirements §10.1.4）。
- キャッシュ・再取得は TanStack Query（06-ui）。

## 3. 技術スタック（確定分の再掲）

詳細・根拠は ADR。ここでは構成把握のための要約。

| 層 | 技術 | ADR |
|---|---|---|
| Backend | Java 17 / Spring Boot 4.1.1 / Spring Security 7 / Doma 3 / Flyway / springdoc 3.1 | [0001](../../adr/0001-backend-technology-versions.md) |
| DB | Neon（主）/ Docker `postgres:16-alpine`（オフライン・CI）。Testcontainers 2.x（テスト） | [0003](../../adr/0003-database-neon-with-local-docker-fallback.md) |
| Frontend | React 19 / TS 6.0 / Vite 8 / MUI 9 / React Router 7 / Axios / TanStack Query 5 | [0002](../../adr/0002-frontend-technology-versions.md) |
| Build/CI | Gradle 8.14.5 + Wrapper / npm（Node 24）/ GitHub Actions | 0001 / 0002 |

## 4. 運用・将来拡張方針（概要）

### 4.1 環境と設定管理

| 環境 | DB | 設定 |
|---|---|---|
| ローカル（既定） | Docker `postgres:16-alpine` | `application.yml` 既定値（`.env.example` と一致） |
| ローカル（Neon） | Neon | `.env` に `SPRING_PROFILES_ACTIVE=neon` + `SPRING_DATASOURCE_*` → `application-neon.yml` |
| CI | Testcontainers | プロファイルなし（`./gradlew check`） |
| 本番（Phase 9） | Neon or RDS（N2） | 環境変数 / AWS Secrets Manager。`application-prod.yml`（HTTPS 前提・ログレベル等） |

- シークレットはコード・`application.yml`・Git に置かない（requirements §10.1.16）。
- プロファイルで環境差を吸収（`local` / `neon` / `prod`）。共通は `application.yml`。

### 4.2 可観測性・ヘルスチェック（概要。詳細は 05-cross-cutting）

- 構造化ログ + `traceId`。`/actuator/health`（liveness / readiness プローブ）。
- メトリクス（Micrometer 等）は将来。

### 4.3 将来拡張の「拡張ポイント」

| 拡張候補（requirements §5.3） | 設計上の余地（MVP では実装しない） |
|---|---|
| 権限管理（ロール） | `SecurityConfig` の認可ルール差し込み点、Service の権限チェック点、`users` に対する `user_roles` を追加できる正規化（03-data-model で意識） |
| 操作ログ / 監査 | 更新系を Service に集約、`created_at` / `updated_at`（将来 `created_by` / `updated_by`）。`traceId` で追跡可能 |
| SSL 期限 / 障害履歴 / 定期メンテナンス | `servers` に 1:N でぶら下がる履歴系テーブルを追加できる構造 |
| CSV 入出力 | 一覧取得ロジック（Service + 検索条件オブジェクト）を再利用できる形にする |
| 認証情報管理 | ServerHub には保存せず、Secret Manager の参照（識別子）のみ持つ方向（requirements §10.1.9） |

### 4.4 デプロイ / CI・CD（概要）

- CI: GitHub Actions（`./gradlew check` + FE 全チェック）。既存。
- CD・インフラ構築（コンテナ化、AWS）: **Phase 8（Docker）/ Phase 9（AWS）** で設計。
- Neon ブランチを PR ごとに CI で使う構成は将来（open-issues N1）。

## 5. この文書で追加した設計判断

| ID | 判断 | 根拠 |
|---|---|---|
| D-ARCH-01 | Backend は機能別パッケージ（package by feature）。各機能に Controller/Service/Dao/dto を同居 | `CLAUDE.md` §4、変更の局所性・将来のモジュール分割余地 |
| D-ARCH-02 | プロファイルは `local`（既定）/ `neon` / `prod` の 3 系統。共通は `application.yml` | ADR 0003、環境差の吸収 |
| D-ARCH-03 | 本番 SPA 配信方法・コンテナ基盤・本番 DB は Phase 8/9 で確定（MVP は単一インスタンス前提） | requirements §10.3 / S6 / N2 |
