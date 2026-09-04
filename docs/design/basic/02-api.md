# 02. API 一覧・API 共通仕様

- バージョン: 1.1（確定、PR #13。2026-09-05 詳細設計 03-server D-SRV-04 により `GET /servers/{id}` の記述を一部修正）
- 最終更新: 2026-09-05
- 関連: [00-overview](00-overview.md) / [01-architecture](01-architecture.md) / requirements [§9](../../requirements/requirements.md) / [open-issues Q2](../../requirements/open-issues.md)

本書は **API の契約（どんなエンドポイントが・どんな形で応答するか）** を基本設計レベルで定義する。
機能単位の Request / Response DTO のフィールド一覧・バリデーション注釈・エラーコードの値は **Phase 3（詳細設計）**、
DB スキーマは **Phase 4** で確定する。

---

## 1. Q2 の確定：バージョニングとレスポンス形式

[open-issues Q2](../../requirements/open-issues.md) を本書で確定する。

### 1.1 決定

| # | 決定 | 内容 |
|---|---|---|
| **D-API-01** | URL パスバージョニング | 業務 API・認証 API はすべて `/api/v1` プレフィックス配下。破壊的変更時のみ `v2` を切る |
| **D-API-02** | 成功レスポンスは軽量形式 | 単一リソースは素の JSON オブジェクト。ページング一覧は `{ content, page }`。ページングなしの配列は素の JSON 配列。ラッパー（`data` 等）で包まない |
| **D-API-03** | エラーレスポンスは統一エンベロープ | `{ code, message, traceId }`（requirements §10.1.12）。`400` は `errors[]`（フィールド単位）を追加 |
| **D-API-04** | JSON キーは `camelCase` | Java 側フィールド名と一致（`hostname` / `ipAddress` / `createdAt` …）。`snake_case` は DB のみ |
| **D-API-05** | 日時は ISO 8601 文字列 | `timestamp` は `2026-09-04T12:34:56+09:00`（オフセット付き）。`date`（実施日）は `2026-09-04` |

### 1.2 採用理由と代替案

**バージョニング（D-API-01）**

- URL パス方式を採用。理由：
  - Vite dev proxy・本番 ALB のルーティングルールが既に `/api/v1/*` 前提（[01-architecture](01-architecture.md) §1.2 / §1.3）。分岐が単純。
  - ブラウザ・`curl`・Swagger でそのまま叩けて確認しやすい。テストが書きやすい。
  - v1 と v2 を並走させやすい（別 `@RequestMapping` プレフィックス）。
- 代替案：メディアタイプ方式（`Accept: application/vnd.serverhub.v1+json`）。REST 的には綺麗だが、
  同一オリジンの SPA 専用 API（外部公開なし、requirements §14）には過剰。proxy / キャッシュ / 手動確認がしづらい。→ 不採用。
- 運用方針：**後方互換な変更（フィールド追加・任意パラメータ追加）は v1 のまま**。
  レスポンスの意味変更・フィールド削除・必須パラメータ追加など破壊的変更のときだけ v2。MVP は v1 のみ。

**レスポンス形式（D-API-02 / D-API-03）**

- 軽量形式を採用。理由：
  - Spring の `Page` シリアライズ（`{ content, page: { size, number, totalElements, totalPages } }`）とほぼ同形。実装・マッピングが素直。
  - ネストが浅く、Frontend の型定義と `apiClient` が単純（成功時のアンラップ用インターセプタが不要）。
  - OpenAPI スキーマがエンドポイントごとに「リソースそのもの」になり、汎用ラッパーの `oneOf` で汚れない。
  - エラーは requirements §10.1.12 で既にエンベロープ形式が確定済み。成功だけ素直にして一貫性は保てる。
- 代替案 A：全レスポンスを `{ data, error, meta }` で統一。クライアントの分岐は一律になるが、
  ネストが深くなり全 DTO がラップされ、Spring の素直な戻り値と乖離する。小規模には過剰。→ 不採用。
- 代替案 B：ページング情報を HTTP ヘッダ（`X-Total-Count` 等）に載せ、ボディは純配列。
  discoverability が下がり、TanStack Query 側でヘッダ参照の配線が要る。→ 不採用。
- ADR 化は見送り（Q 項目は要件・設計文書で管理する既存運用に合わせる）。必要になれば `docs/adr/` に起こす。

---

## 2. 共通仕様

### 2.1 ベースパス・ルーティング

| 区分 | パス | バージョン配下 | 認証 |
|---|---|---|---|
| 業務 API・認証 API | `/api/v1/**` | ✅ | 認証必須（`/api/v1/auth/login` を除く） |
| ヘルスチェック | `/actuator/health` | ✖ | 未認証可（requirements §10.3） |
| API ドキュメント | `/v3/api-docs` / `/swagger-ui/**` | ✖ | requirements §8.4 では未認証可。本番での制限は [04-security](04-security.md) で判断 |
| SPA 静的アセット | 上記以外すべて | ✖ | 未認証可（ルートガードは UX 目的、実体は BE / requirements §10.1.5） |

- ブラウザから見て `/api/v1/*` は Backend、それ以外は SPA（[01-architecture](01-architecture.md) §1.1）。CORS は全拒否（requirements §10.1.17）。

### 2.2 リクエスト

| 項目 | 仕様 |
|---|---|
| Content-Type | リクエストボディは `application/json`（`POST` / `PUT`）。ファイルアップロードなし |
| Accept | `application/json` 固定。コンテンツネゴシエーションはしない |
| 文字コード | UTF-8 |
| 認証 | セッション Cookie（`HttpOnly` / 本番 `Secure`）。詳細は [04-security](04-security.md) |
| CSRF | 変更系（`POST` / `PUT` / `DELETE`）は `X-XSRF-TOKEN` ヘッダ必須。`XSRF-TOKEN` Cookie の値を Axios が自動付与（requirements §10.1.4） |
| 未知のクエリパラメータ | 無視する（`400` にしない、requirements §10.1.6） |

**CSRF トークンの受け渡し（ハンドシェイク）**

1. SPA 起動時に `GET /api/v1/auth/me` を呼ぶ。未ログインでも `401` 応答と同時に `XSRF-TOKEN` Cookie が発行される。
2. 以降の変更系リクエストは Axios が Cookie 値を `X-XSRF-TOKEN` ヘッダへ複製（Double Submit Cookie）。
3. ログインの `POST` 自体も CSRF 対象。ログイン画面表示前に 1. を済ませておく。
   - 詳細な `SecurityConfig` 設定と結合テストは [04-security](04-security.md)。

### 2.3 成功レスポンス

| ケース | HTTP | ボディ |
|---|---|---|
| 単一リソース取得・更新 | `200` | リソースの JSON オブジェクト |
| リソース作成 | `201` | 作成されたリソースの JSON オブジェクト。`Location: /api/v1/servers/{id}` を付与 |
| ページング一覧 | `200` | `{ "content": [ ... ], "page": { "number", "size", "totalElements", "totalPages" } }` |
| ページングなし一覧（サジェスト等） | `200` | JSON 配列 |
| 集計（ダッシュボード） | `200` | 集計結果の JSON オブジェクト |
| 論理削除・ログアウト | `204` | ボディなし |

```jsonc
// GET /api/v1/servers/1
{ "id": 1, "hostname": "app-01", "environment": "production", "status": "active",
  "ipAddress": "10.0.0.11", "tags": ["web", "payments"],
  "version": 3, "createdAt": "2026-08-01T09:00:00+09:00", "updatedAt": "2026-09-01T18:20:00+09:00" }

// GET /api/v1/servers?page=0&size=20
{ "content": [ { "id": 1, "hostname": "app-01", "environment": "production",
                 "status": "active", "tags": ["web"], "updatedAt": "2026-09-01T18:20:00+09:00" } ],
  "page": { "number": 0, "size": 20, "totalElements": 137, "totalPages": 7 } }
```

- `page.number` は 0 始まり。要求ページが最終ページを超える場合は `content: []` + 正しい `totalElements` を返す（`404` にしない、FR-SRV-01）。
- 一覧の 1 件は表示に必要な最小項目のみ（詳細項目は詳細 API でのみ、requirements §10.2.2）。

### 2.4 エラーレスポンス

requirements §10.1.12 の統一形式。

```jsonc
// 404
{ "code": "RESOURCE_NOT_FOUND", "message": "対象のサーバーが見つかりません。", "traceId": "b1e2..." }

// 400（バリデーション）
{ "code": "VALIDATION_ERROR", "message": "入力内容を確認してください。", "traceId": "b1e2...",
  "errors": [ { "field": "hostname", "message": "ホスト名は必須です。" },
              { "field": "ipAddress", "message": "IP アドレスの形式が正しくありません。" } ] }
```

| フィールド | 説明 |
|---|---|
| `code` | 機械可読の安定した文字列。内部構造を推測させない。**値の体系は Phase 3 で確定（Q3）**。本書の例は暫定表記 |
| `message` | 利用者向けの日本語メッセージ。内部情報（SQL・クラス名・スタックトレース）を含めない |
| `traceId` | サーバーログ突き合わせ用。機密ではなく画面表示可 |
| `errors[]` | `400` のときのみ。`field`（リクエストのフィールド名）+ `message`。「なぜ不正か」に限定 |

**HTTP ステータスの使い分け**（`CLAUDE.md` §4 / requirements §8.3）

| ステータス | 用途 | 例 |
|---|---|---|
| `400` | バリデーション違反、不正なリクエスト形式、不正な `sort` / `order` / enum フィルタ値、ID の形式不正 | ホスト名未入力、`sort=foo` |
| `401` | 未認証・セッション切れ | Cookie なしで業務 API |
| `403` | 認証済みだが権限なし（**MVP では発生しない**。将来のロール管理用に予約） | — |
| `404` | リソース不存在・論理削除済み・存在しないルート | `GET /servers/9999`、削除済みサーバー |
| `409` | 一意制約違反・楽観ロック競合 | ホスト名重複、`version` 不一致 |
| `500` | 想定外のサーバーエラー | 未捕捉例外・DB 障害。詳細はログのみ、レスポンスは汎用文言 + `traceId` |

- 例外は全レイヤから `@RestControllerAdvice` の `GlobalExceptionHandler` に集約（詳細は [05-cross-cutting](05-cross-cutting.md)）。
- ID の形式は正しいが対象が存在しない → `404`（IDOR 的な存在推測をさせない、requirements §10.1.5）。

### 2.5 ページング・ソート・絞り込みの共通パラメータ

一覧系 API（`GET /api/v1/servers`、`GET /api/v1/maintenance-histories` 等）で共通。

| パラメータ | 型 | 既定 | 仕様 |
|---|---|---|---|
| `page` | integer | `0` | 0 始まり。負数・非整数は `400` |
| `size` | integer | `20` | 許可値 `10` / `20` / `50` / `100`。**許可値以外は既定値 `20` に丸める**（`400` にしない）。上限は実質 100 |
| `sort` | string | API ごとに規定 | **ホワイトリスト**の論理項目名のみ。一致しなければ `400`（requirements §10.1.7） |
| `order` | string | `desc` | `asc` / `desc` のみ。それ以外は `400` |

- `size` を丸めで許容し、enum フィルタ（`environment` / `status`）の未知値は `400` にする、という非対称は意図的：
  ページサイズは表示上の都合で正規化して差し支えないが、絞り込み条件の誤りは「意図しない結果」を招くため明示的に弾く。
- サーバー一覧の `sort` 許可値（F1）：`hostname` / `environment` / `status` / `updatedAt`（既定） / `createdAt`。
- メンテナンス履歴一覧の `sort` 許可値：`performedDate`（既定） / `createdAt`。
- 検索条件は Frontend で URL クエリに保持し、再現・共有可能にする（requirements §13.3、FR-SRV-02）。

### 2.6 命名規約

- パス：小文字ケバブケース、リソースは複数形（`/servers`、`/maintenance-histories`）。動詞をパスに入れない（例外：`/auth/login` 等の認証アクション、`/tags/suggest` の補助エンドポイント）。
- クエリ・JSON キー：`camelCase`。
- queryKey（Frontend、`CLAUDE.md` §4）：`['servers', 'list', params]` / `['servers', 'detail', id]` / `['maintenanceHistories', 'list', params]` / `['tags', 'suggest', prefix]` / `['dashboard', 'summary']` / `['auth', 'me']`。詳細は [06-ui](06-ui.md)。

---

## 3. API 一覧

すべて `/api/v1` 配下。認証は「ログイン以外は必須」。Request / Response の項目詳細は Phase 3。

### 3.1 認証（`/api/v1/auth`）

| メソッド | パス | 概要 | FR | 成功 | 主なエラー |
|---|---|---|---|---|---|
| `POST` | `/auth/login` | メール + パスワードでログイン。成功時セッション確立・セッション ID 再生成 | FR-AUTH-01 | `200` + ログインユーザー（`id` / `email` / `displayName`） | `400`（未入力・形式）、`401`（資格情報不正・存在を示さない共通メッセージ） |
| `POST` | `/auth/logout` | セッション破棄・Cookie 削除 | FR-AUTH-02 | `204` | `401` |
| `GET` | `/auth/me` | 現在のログインユーザー。SPA 起動時の認証状態判定・ヘッダー表示・CSRF Cookie 発行に使う | FR-AUTH-03 / SC 共通 | `200` + ユーザー | `401`（未ログイン） |

- ブルートフォース対策（ロック・レート制限）は MVP 対象外（S3）。失敗はログのみ。
- `POST /auth/login` は Spring Security のフォームログインをベースに、成功／失敗ハンドラで上記 JSON を返す（[04-security](04-security.md)）。

### 3.2 サーバー（`/api/v1/servers`）

| メソッド | パス | 概要 | FR | 成功 | 主なエラー |
|---|---|---|---|---|---|
| `GET` | `/servers` | 一覧・検索・絞り込み・ソート・ページング。`deleted_at IS NULL` のみ | FR-SRV-01 / 02 | `200` + `{ content, page }` | `400`（不正な `sort` / enum フィルタ値）、`401` |
| `GET` | `/servers/{id}` | 詳細。全属性 + タグ + `version`（メンテナンス履歴は含まない。直近分は `/servers/{id}/maintenance-histories` を小さい `size` で呼ぶ、詳細設計 [03-server](../detail/03-server.md) D-SRV-04） | FR-SRV-03 | `200` + サーバー | `400`（ID 形式）、`404`（不存在・削除済み）、`401` |
| `POST` | `/servers` | 登録。サーバー + `server_tags` を 1 トランザクション。`version=0` | FR-SRV-04 / FR-TAG-01 | `201` + サーバー + `Location` | `400`（フィールド単位）、`409`（ホスト名重複）、`500`、`401` |
| `PUT` | `/servers/{id}` | 編集（全項目 + タグ）。`version` による楽観ロック | FR-SRV-05 / FR-TAG-01 | `200` + サーバー | `400`、`409`（ホスト名重複 / `version` 不一致）、`404`（削除済み）、`401` |
| `DELETE` | `/servers/{id}` | 論理削除（`deleted_at` 設定）。`server_tags` は物理削除 | FR-SRV-06 | `204` | `404`（不存在・既削除）、`401` |
| `GET` | `/servers/{id}/maintenance-histories` | 当該サーバーの履歴（実施日降順、ページング可） | FR-MNT-03 | `200` + `{ content, page }` | `404`（サーバー不存在）、`401` |

**検索クエリ（`GET /servers`、FR-SRV-02）**：`§2.5` の共通パラメータ + `keyword`（ホスト名 / IP / 用途に部分一致、`LIKE` ワイルドカードはエスケープ）、`environment`（enum・完全一致）、`status`（enum・完全一致）、`tags`（配列・指定した全タグを持つ = AND、B5）。各条件 AND、未指定は無視。

- 楽観ロック競合（`version` 不一致）は `409`。Frontend は最新の再取得を促す（BR-08 / requirements §8.3）。
- `retired`（廃止）のサーバーは論理削除とは別概念で、一覧・検索・集計に含まれる（BR-05）。

### 3.3 タグ（`/api/v1/tags`）

| メソッド | パス | 概要 | FR | 成功 | 主なエラー |
|---|---|---|---|---|---|
| `GET` | `/tags/suggest?prefix={s}` | 既存タグ名の**前方一致**サジェスト（件数上限あり、例 20） | FR-TAG-02 / F3 | `200` + `string[]` | `401` |

- タグの付与・解除はサーバーの登録／編集リクエスト（`§3.2`）に含める。単独の CRUD API は作らない（FR-TAG-01、Q5：タグ管理画面は MVP 対象外）。
- タグ名の正規化（前後空白除去・1〜50 文字・大小区別・重複不可）は Service で担保（BR-07 / Q8）。

### 3.4 メンテナンス履歴（`/api/v1/maintenance-histories`）

| メソッド | パス | 概要 | FR | 成功 | 主なエラー |
|---|---|---|---|---|---|
| `GET` | `/maintenance-histories` | 全サーバー横断の履歴一覧。`serverId`（任意）で絞り込み。実施日降順 | FR-MNT-01 | `200` + `{ content, page }` | `400`（不正なページング）、`401` |
| `POST` | `/maintenance-histories` | 登録。対象サーバーは `deleted_at IS NULL` 必須。**登録のみ**（編集・削除 API なし） | FR-MNT-02 | `201` + 履歴 + `Location` | `400`、`404`（対象サーバー不存在・削除済み）、`500`、`401` |

- 論理削除済みサーバーの履歴も一覧に表示する（行に削除済みである旨。F4 / BR-09）。集計対象からは除外。
- 実施日は `YYYY-MM-DD`、未来日も許容（F5 / BR-10）。

### 3.5 ダッシュボード（`/api/v1/dashboard`）

| メソッド | パス | 概要 | FR | 成功 | 主なエラー |
|---|---|---|---|---|---|
| `GET` | `/dashboard/summary` | サーバー総数 / 環境区分別 / ステータス別 / タグ別（上位 10 + その他）/ 最近のメンテナンス（直近 10 件） | FR-DASH-01 | `200` + 集計オブジェクト | `401` |

- すべて `deleted_at IS NULL` 対象。集計は集計クエリで取得し N+1 を避ける（requirements §10.2.2）。
- 数値 + グラフ用データを返す。グラフライブラリの採否は [06-ui](06-ui.md)（Recharts 候補）。
- 0 件でもレスポンスは成立（各区分 0 を返す）。

### 3.6 共通 UI（FR-COM）

FR-COM-01〜06 は Frontend の振る舞い（エラー表示・ローディング・トースト・確認ダイアログ・グラフ・モーダル）であり、専用 API を持たない。上記 API のレスポンス（特にエラーエンベロープ）を利用する。詳細は [06-ui](06-ui.md)。

---

## 4. OpenAPI / Swagger

- **コードファースト**：springdoc-openapi がコントローラ / DTO のアノテーションから `/v3/api-docs` を生成。手書きの OpenAPI YAML は持たない（[ADR 0001](../../adr/0001-backend-technology-versions.md)）。
- Swagger UI：`/swagger-ui.html`。`/api/v1` 配下ではない（インフラ用エンドポイント）。
- 各エンドポイントに `@Operation` / `@ApiResponse` を付け、統一エラーエンベロープを共通スキーマ（`ApiError`）として登録する。
- 認証・本番での公開範囲は [04-security](04-security.md) で確定（requirements §8.4 は未認証可としているが、本番で制限する余地を残す）。

---

## 5. この文書で追加・確定した事項

| ID | 事項 | 根拠 |
|---|---|---|
| D-API-01 | URL パスバージョニング `/api/v1`。破壊的変更時のみ `v2` | Q2、01-architecture、proxy / ALB ルーティング |
| D-API-02 | 成功レスポンスは軽量形式（単一 = 素の JSON、ページング = `{ content, page }`） | Q2、Spring `Page` との整合、FE の単純化 |
| D-API-03 | エラーは統一エンベロープ `{ code, message, traceId (+ errors[]) }` | requirements §10.1.12 |
| D-API-04 | JSON キーは `camelCase` | `CLAUDE.md` §4 |
| D-API-05 | 日時は ISO 8601（`timestamp` はオフセット付き、実施日は `YYYY-MM-DD`） | 相互運用性・曖昧さ排除 |
| D-API-06 | `size` の許可値外は既定値に丸める。enum フィルタの未知値は `400` | requirements §10.1.6 の「丸める or 400」を確定。FR-SRV-01 / FR-SRV-02 の記述差を解消 |
| D-API-07 | `GET /api/v1/auth/me` を追加（認証状態判定・ヘッダー表示・CSRF Cookie 発行） | requirements §13.1 共通ヘッダー、FR-AUTH-03、§10.1.4 |

- Q3（エラーコードの値の体系）は Phase 3。本書のコード文字列は暫定。
- S5（CSP）・Swagger の本番公開範囲・セッション詳細は [04-security](04-security.md)。
