# 07. AWS EC2 実行状態の参照（Phase 9 設計）

- ステータス: **設計確定（2026-09-08、PR #47 でオーナー承認）**。§3 の論点 P1〜P15 は推奨案どおり確定。
  実装は PR 9-1〜9-6（§11）。
- 対応: 新規要件 FR-CLOUD-01（[requirements §9.2](../../requirements/requirements.md)）/ [open-issues E2](../../requirements/open-issues.md)
- 前提調査: [探索: AWS EC2 連携影響調査](../exploration/01-aws-ec2-integration-impact.md)
- 関連: [03-data-model](03-data-model.md) §5 / [02-api](02-api.md) / [04-security](04-security.md) / [01-architecture](01-architecture.md) §1.3・1.4 / [ADR 0004](../../adr/0004-containerization-nginx-spa-reverse-proxy.md)
- 最終更新: 2026-09-08

> **実装進捗**: 9-1（DB/Entity/DAO/enum、#48）・9-2（provider + poller + AWS SDK、#49）・
> 9-3（cloud-link API + レスポンス合成、#50）完了。
> 9-4 実装中（FE: `types/cloud` `api/cloud` `hooks/cloud` `validation/cloudLink`、`CloudStateChip`、
> `CloudLinkPanel`（明細の「AWS 連携」セクション = 管理ステータスと分離）、`CloudLinkFormModal`）。

---

## 1. 目的とスコープ

### 1.1 目的（最重要要件）

**AWS EC2 インスタンスの実行状態を ServerHub 上で参照できるようにする。**
AWS コンソール / API で EC2 を停止したら、ServerHub の当該サーバーにも「AWS 実行状態: stopped」と
表示される。

### 1.2 Phase 9 でやること

- Server ↔ EC2 インスタンスの**紐付け**（インスタンス ID の手入力）
- EC2 実行状態の**定期取得 + キャッシュ**（`server_cloud_links` テーブル）
- 明細画面の**「今すぐ更新」**（その 1 台だけライブ取得）
- 画面で**「管理ステータス」と「AWS 実行状態」を明確に分離**して表示
- AWS API 障害時は**キャッシュ表示 + 取得失敗の明示**
- 汎用テーブル（`provider` 文字列）だが実装は `aws_ec2` のみ

### 1.3 Phase 9 でやらないこと（スコープ外）

| 項目 | 理由 |
|---|---|
| EC2 の起動 / 停止 / 再起動などの**操作** | オーナー指示。参照のみ |
| EC2 の一覧取得 → 一括紐付け（discover / import） | 手入力で足りる。将来 |
| メトリクス（CPU / メモリ / ディスク） | E1 の領域。MVP 対象外のまま |
| 複数リージョン / 複数アカウントの UI | 設定値で 1 リージョン。将来 |
| ダッシュボードでの AWS 状態集計・「要確認」パネル | スコープ最小化。Phase 10 で検討 |
| `servers.status` と AWS 状態の**自動整合** | 禁止事項（§2） |
| GCP / Azure / VMware 等 | テーブルは汎用だが実装しない |

---

## 2. 厳守する不変条件（オーナー指示）

| # | 不変条件 | 設計での担保 |
|---|---|---|
| C1 | `servers.status` は**人が管理するライフサイクル状態**（active / maintenance / retired）として維持 | `Status` enum・`servers.status` 列・関連コードを一切変更しない |
| C2 | AWS 実行状態で `servers.status` を**上書きしない** | AWS 状態の書き込み先は `server_cloud_links` のみ。`servers` を UPDATE する経路をポーラー・リフレッシュに持たせない |
| C3 | AWS 実行状態は**別モデル・別カラム** | 新テーブル `server_cloud_links`、新 enum `CloudInstanceState`（`Status` とは無関係） |
| C4 | 画面で「管理ステータス」と「AWS 実行状態」を**明確に分離**表示 | 明細・一覧とも別ラベル・別チップ・別色。混在させない |
| C5 | AWS API 障害時は**キャッシュを表示し、取得失敗を明示** | `state` は最後に成功した値を保持。`state_fetched_at` と `last_error` を併記。「最終取得 HH:MM」「取得できませんでした」を UI に出す |
| C6 | AWS 状態を取得できないことを理由に `servers.status` を変更しない | C2 と同じ。ポーラーは失敗時 `last_error` を書くだけ |
| C7 | EC2 の停止・起動などの操作機能は実装しない | 書き込み系 AWS API を呼ばない。IAM は `ec2:DescribeInstances` のみ |
| C8 | 既存の MVP 機能を破壊しない | すべて加算的変更。既存 API レスポンスは**フィールド追加のみ**（削除・改名なし） |
| C9 | 既存の Backend / Frontend テストを維持する | 既存 89（BE）/ 123（FE）を維持。新テストを追加 |

---

## 3. 設計論点（すべて確定）

**2026-09-08、PR #47 でオーナー承認。P1〜P15 は下表の「推奨」どおり確定。** さらに以下を確定事項として明記:

- **P7**: cloud-link はサブリソースとして分離（`PUT/DELETE /servers/{id}/cloud-link`）。
- **P8**: `refresh` は HTTP 200。AWS 取得失敗時も最後の成功値・`stateFetchedAt`・`lastError` を返す。
- **P10**: サーバー論理削除後も cloud link は DB 上に保持する。
- EC2 インスタンス ID の競合は **`409 CLOUD_LINK_CONFLICT`**（新コード）。
- レスポンス合成は当面 `ServerServiceImpl` に置く。Assembler は新設しない。
- サーバー一覧レスポンスに `cloudState` / `cloudStateFetchedAt` を追加。一覧取得で N+1 を出さず一括取得する。
- リージョンは当面 `ap-northeast-1` で固定。
- PR 分割は 9-1〜9-6（§11）を採用。

| # | 論点 | 選択肢 | 確定（= 推奨） |
|---|---|---|---|
| P1 | 紐付けの持ち方 | (a) 別テーブル `server_cloud_links` / (b) `servers` にフラット列追加 | **(a)**。`servers` の楽観ロック・監査列を汚さない。ポーラーの書き込み経路を隔離（C2） |
| P2 | 実行状態の取得方式 | (a) 表示時ライブ取得 / (b) DB キャッシュ + 定期ポーリング / (c) b + 明細の手動更新 | **(c)**。一覧・ダッシュボードはキャッシュ、明細に「今すぐ更新」 |
| P3 | 紐付けの入力方法 | (a) インスタンス ID 手入力のみ / (b) EC2 一覧から選択（discover） | **(a)**。Phase 9 は最小。discover は将来 |
| P4 | ポーラーの配置 | (a) 同一 Spring アプリ内 `@Scheduled` / (b) 別ワーカー | **(a)**。MVP は単一インスタンス（S6）。複数インスタンス化時は ShedLock 等でリーダー選出 or (b) へ（§9 に明記） |
| P5 | 状態の正規化 | (a) EC2 生値をそのまま保存 / (b) 生値 + 横断正規化 enum の 2 段 | **(b)**。`state_raw`（生値）+ `state`（`running`/`stopped`/`pending`/`stopping`/`terminated`/`unknown`/`gone`） |
| P6 | 対象 provider | (a) `aws_ec2` 固定カラム / (b) `provider` 文字列で汎用 | **(b)**。カラム設計だけ汎用化（コストゼロ）。実装は `aws_ec2` のみ |
| P7 | 紐付けと `servers` 編集の関係 | (a) `ServerUpdateRequest` に `cloudLink` を含める / (b) サブリソース `PUT/DELETE /servers/{id}/cloud-link` | **(b)**。`servers.version` を紐付け変更でバンプさせない。`ServerFormModal` を触らずに済む（C8/C9） |
| P8 | リフレッシュ失敗時の HTTP | (a) 5xx を返す / (b) 200 + キャッシュ値 + `lastError` | **(b)**。C5 に沿う。「更新はできなかったが表示は継続」 |
| P9 | 1 EC2 ↔ 複数 Server | 許可 / 禁止 | **禁止**（`UNIQUE (provider, external_id)`）。1 Server ↔ 最大 1 リンク（`server_id UNIQUE`） |
| P10 | サーバー論理削除時のリンク | (a) 物理削除（`server_tags` と同じ） / (b) 残す | **(b) 残す**。全読取クエリが `servers.deleted_at IS NULL` を JOIN 条件にするのでポーリング対象から自然に外れる。復元時（将来）もリンクが生きる。Service に削除ロジックを足さない |
| P11 | ローカル / テストでの AWS | LocalStack / SDK フェイク / 無効化 | **`serverhub.cloud.enabled=false` 既定 + `CloudStateProvider` インターフェースのフェイク実装**。CI・ローカルは AWS を一切呼ばない |
| P12 | リージョン | 単一（設定値） / 複数 | **単一**（`serverhub.cloud.aws.region`）。複数は将来（`server_cloud_links.region` は保持済み） |
| P13 | ポーリング間隔・鮮度閾値 | — | 間隔 **5 分**（`serverhub.cloud.poll-interval=PT5M`）、`state_fetched_at` が**閾値（既定 15 分）**を超えたら UI で「情報が古い可能性」を表示 |
| P14 | 認証情報（本番） | 静的キー / IAM ロール | **IAM ロール**（ECS タスクロール / EC2 インスタンスプロファイル）。静的キーは保存しない（BR-11） |
| P15 | 新エラーコード | 追加する / しない | `CLOUD_PROVIDER_UNAVAILABLE`（503）を**追加**するが用途は限定（provider 未設定・全断のみ。個別インスタンスの取得失敗は `lastError` で表現し 200） |

---

## 4. データモデル変更案（DB）

### 4.1 新テーブル `server_cloud_links`

`V3__cloud_links.sql`（Flyway、[03-data-model §4.7](03-data-model.md)）:

```sql
CREATE TABLE server_cloud_links (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    server_id        BIGINT       NOT NULL UNIQUE REFERENCES servers (id),
    provider         VARCHAR(30)  NOT NULL CHECK (provider IN ('aws_ec2')),
    external_id      VARCHAR(255) NOT NULL,        -- EC2 インスタンス ID（i-...）
    region           VARCHAR(30),                  -- 例 ap-northeast-1
    account_id       VARCHAR(20),                  -- 12 桁。手入力では通常空

    -- 最後に観測した実行状態（AWS からのみ書き込まれる）
    state            VARCHAR(20),                  -- 正規化: running/stopped/pending/stopping/terminated/unknown/gone
    state_raw        VARCHAR(50),                  -- provider の生値
    state_fetched_at TIMESTAMPTZ,                  -- この state をいつ取得したか（成功時のみ更新）

    -- 直近の取得失敗（成功でクリア）
    last_error       VARCHAR(500),
    last_error_at    TIMESTAMPTZ,

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (provider, external_id)
);

CREATE INDEX ix_server_cloud_links_poll ON server_cloud_links (state_fetched_at);
```

- `server_id UNIQUE` → **1 Server ⇔ 最大 1 リンク**（1:0..1）。
- `UNIQUE (provider, external_id)` → 同じ EC2 を 2 つの Server に紐付けない（P9）。
- **`servers` テーブルは一切変更しない**（C1/C2/C3/C8）。
- 論理削除カラムは持たない。サーバー論理削除時もリンクは残す（P10）。
- 楽観ロックは持たない。`state` 系はポーラーが last-write-wins で更新、紐付け CRUD は Service 経由（低頻度）。

### 4.2 命名・型の方針（[03-data-model §4](03-data-model.md) 準拠）

- `snake_case`・複数形テーブル名・`bigint identity` 代理キー・監査列 `created_at`/`updated_at`。
- enum は `varchar` + `CHECK`。`provider` は `IN ('aws_ec2')`。`state` も正規化値集合
  （`running`/`stopped`/`pending`/`stopping`/`terminated`/`unknown`/`gone`）で `CHECK` する
  — この集合は provider 非依存で固定なので、他 provider を足しても変わらない
  （03-data-model D-DATA-04「enum は varchar + CHECK」に合わせた。9-1 実装時に決定）。生値は `state_raw`。
  Java 側は `fromValue` が未知値を `UNKNOWN` に落とすので、将来 CHECK 外の値が来ても機能は止まらない。
- 日時は `timestamptz`（UTC 保持、API は ISO 8601 + オフセット）。`state` の DB マッピングは
  `CloudInstanceStateConverter`、`provider` は `CloudProviderConverter`（`DomainConvertersProvider` に登録、D-DETAIL-04）。

### 4.3 [03-data-model](03-data-model.md) への反映（9-1 で実施済み）

§1 の ER 図に `servers ||--o| server_cloud_links` を追加、§2 テーブル一覧に 1 行追加、§5 の
「クラウド連携」行を「Phase 9 で実装」に更新。

---

## 5. API 変更案

すべて**加算的**（C8）。既存レスポンスはフィールド追加のみ。

### 5.1 既存レスポンスへのフィールド追加

**`GET /api/v1/servers/{id}`**（`ServerDetailResponse`）に `cloudLink`（nullable）を追加:

```jsonc
{
  "id": 12, "hostname": "web-prod-01", "status": "active", /* …既存フィールド… */
  "cloudLink": {
    "provider": "aws_ec2",
    "externalId": "i-0abc123def456",
    "region": "ap-northeast-1",
    "state": "stopped",              // 正規化値。未取得は null
    "stateRaw": "stopped",
    "stateFetchedAt": "2026-09-08T10:32:00+09:00",
    "stale": false,                  // state_fetched_at が鮮度閾値超過なら true
    "lastError": null                // 直近の取得失敗理由（成功していれば null）
  }
}
```

**`GET /api/v1/servers`**（`ServerSummaryResponse`）に軽量な 2 フィールドを追加:

```jsonc
{ "id": 12, "hostname": "web-prod-01", "status": "active", "tags": [...], "updatedAt": "...",
  "cloudState": "stopped",                    // 紐付けなし or 未取得は null
  "cloudStateFetchedAt": "2026-09-08T10:32:00+09:00" }
```

- 一覧はバッジ表示のみなので `state` と `fetchedAt` だけ。N+1 回避のため
  `CloudLinkReader.findByServerIds(ids)（ServerCloudLinkDao.selectByServerIds）` で一括取得（`ServerTagDao.selectByServerIds` と同じ手法）。

### 5.2 新規エンドポイント（サブリソース、P7）

| メソッド | パス | 用途 | 認証 | 主なレスポンス |
|---|---|---|---|---|
| `PUT` | `/api/v1/servers/{id}/cloud-link` | 紐付けの作成 / 置換（upsert） | 要 | `200` `CloudLinkResponse` |
| `DELETE` | `/api/v1/servers/{id}/cloud-link` | 紐付けの解除 | 要 | `204` |
| `POST` | `/api/v1/servers/{id}/cloud-link/refresh` | その 1 台だけ即時ライブ取得 | 要 | `200` `CloudLinkResponse`（失敗時もキャッシュ値 + `lastError` を返す、P8） |

- `PUT` リクエストボディ: `{ "provider": "aws_ec2", "externalId": "i-...", "region": "ap-northeast-1" }`
  - `externalId` は `^i-[0-9a-f]{8,17}$` で Bean Validation（`@Pattern`、`Hostname` と同じ手法）。
  - `provider` は `aws_ec2` のみ許可（他は `400 VALIDATION_ERROR`）。
- 対象サーバーが存在しない / 論理削除済み → `404 RESOURCE_NOT_FOUND`（既存の IDOR 対策と同じ）。
- 別サーバーが同じ `externalId` を使用中 → `409`（新コード不要、`DUPLICATE_HOSTNAME` は使えないので
  `409 CLOUD_LINK_CONFLICT` を追加するか、`VALIDATION_ERROR` 400 で表現するか **要レビュー**。
  推奨: `409 CLOUD_LINK_CONFLICT`）。
- `refresh` は AWS 断でも `200`。`CloudLinkResponse.lastError` に理由、`state` は前回値のまま（C5/P8）。
  provider 自体が無効（`serverhub.cloud.enabled=false` 等）なら `503 CLOUD_PROVIDER_UNAVAILABLE`。

### 5.3 変更しないもの

- `GET /dashboard/summary`（Phase 9 では集計に AWS 状態を含めない、§1.3）
- `POST /servers` / `PUT /servers/{id}` / `DELETE /servers/{id}`（`ServerUpdateRequest` は不変、P7・C8）
- エラーエンベロープ形式・queryKey 規約・バージョニング（`/api/v1`）

### 5.4 [02-api](02-api.md) / OpenAPI

02-api §3.2 に `/servers/{id}/cloud-link` サブリソースの節を追加。springdoc は
コードファーストなのでアノテーションから自動生成。

---

## 6. Backend 変更案

新パッケージ `com.serverhub.cloud`（[00-overview](../detail/00-overview.md) のパッケージ方針に従う）。

### 6.1 ドメイン

| 型 | 種別 | 内容 |
|---|---|---|
| `CloudProvider` | enum | `AWS_EC2("aws_ec2")`。`@JsonValue`/`@JsonCreator` + Doma `DomainConverter`（`Environment` と同型、D-SRV-01） |
| `CloudInstanceState` | enum | `RUNNING` / `STOPPED` / `PENDING` / `STOPPING` / `TERMINATED` / `UNKNOWN` / `GONE`（`value()` は小文字） |
| `ServerCloudLink` | Doma `@Entity`（immutable record） | `server_cloud_links` に対応。`@Version` は付けない |
| `CloudInstanceRef` | record | `(provider, externalId, region)`。provider 呼び出しの引数 |
| `CloudStateReading` | record | `(state, stateRaw, fetchedAt)` or `(error, at)` の結果 |

### 6.2 レイヤ（[CLAUDE.md §3](../../../CLAUDE.md) / Impl 命名規約 §4）

```
CloudLinkController  （PUT / DELETE / POST refresh）
  → CloudLinkService (interface) / CloudLinkServiceImpl  @Transactional
      → ServerCloudLinkDao (@Dao interface + 外部 SQL)
      → ServerDao（対象サーバーの存在・非削除チェックに再利用、D-MNT-03 と同じ依存許容）
      → CloudStateProvider (interface)  ← refresh 時のみ
          ├ Ec2CloudStateProviderImpl     （@ConditionalOnProperty enabled=true）
          └ DisabledCloudStateProviderImpl（既定。常に CloudProviderUnavailableException）

ServerServiceImpl（既存）
  → CloudLinkReader（読み取り専用ヘルパー）  ← ここだけを追加依存
      → ServerCloudLinkDao / CloudProperties

CloudStatePoller   @Scheduled（@ConditionalOnProperty enabled=true）
  → ServerCloudLinkDao / CloudStateProvider

CloudExceptionHandler @RestControllerAdvice
  → CloudLinkConflictException → 409、CloudProviderUnavailableException → 503
```

- **`ServerServiceImpl` は変更最小**: `get()` / `list()` の組み立てで `CloudLinkReader` を呼び
  `cloudLink` / `cloudState` を埋めるだけ（enrichment）。ビジネスロジックは増やさない。
  - `CloudLinkReader` は `ServerCloudLinkDao` + `CloudProperties` のみに依存する読み取り専用 Bean。
    `server` 層が `cloud` 層の書き込み系や `ServerDao` に依存しないようにこの 1 つに集約した
    （Assembler は新設しない — レビュー確定事項）。
  - DB 一意制約違反（`DuplicateKeyException`）は `CloudLinkServiceImpl` で `CloudLinkConflictException`
    に正規化してからスローする（`server` の `DUPLICATE_HOSTNAME` ハンドラと衝突させない）。
- `@EnableScheduling` は `CloudConfig` 内の内部 `@Configuration`（`enabled=true` のみ）。

### 6.3 ポーラーの挙動（`CloudStatePoller`）

1. `serverhub.cloud.enabled=false`（既定）なら何もしない。
2. `server_cloud_links` から `provider='aws_ec2'` かつ紐付く `servers.deleted_at IS NULL` の行を取得。
3. `external_id` を **100 件ずつ**に分割し、`Ec2Client.describeInstances(instanceIds=...)` を呼ぶ。
4. 各インスタンス:
   - 応答にある → `state` / `state_raw` / `state_fetched_at=now()` を更新、`last_error` をクリア。
   - 応答に**ない**（`InvalidInstanceID.NotFound` 個別 or バッチから欠落）→ `state='gone'`、`state_fetched_at=now()`。
   - AWS 呼び出し自体が失敗（スロットリング・認証・ネットワーク）→ `state` は**据え置き**、
     `last_error` / `last_error_at` を記録（C5/C6）。指数バックオフで次周期。
5. すべて構造化ログ（`traceId` 付き、[05-cross-cutting](05-cross-cutting.md)）。秘密情報は出さない。

### 6.4 設定（`application.yml` / 環境変数）— 9-2 で実装

```yaml
serverhub:
  cloud:
    enabled: ${SERVERHUB_CLOUD_ENABLED:false}   # 既定 OFF。ローカル・CI は false
    poll-interval: PT5M
    staleness-threshold: PT15M                   # これを超えたら stale=true（9-3 で使用）
    aws:
      region: ${SERVERHUB_CLOUD_AWS_REGION:ap-northeast-1}
      batch-size: 100                            # DescribeInstances 1 回あたり（AWS 上限）
```

- `CloudProperties`（`@ConfigurationProperties("serverhub.cloud")`、record）。`CloudConfig` が常に登録。
  スケジューリング（`@EnableScheduling`）と `CloudStatePoller`・`Ec2CloudStateProviderImpl` は
  `enabled=true` のときだけ Bean 化（`@ConditionalOnProperty`）。`enabled=false`（既定）は
  `DisabledCloudStateProviderImpl` のみ。
- ローカルで実 AWS を試したい開発者は `SERVERHUB_CLOUD_ENABLED=true` + `AWS_PROFILE` 等（SDK 標準）。
- 静的キーはリポジトリ・DB・`.env`（コミット対象）に置かない（BR-11 / §10.1.9）。`.env.example` は
  region と enabled のコメントのみ。

### 6.5 依存追加

`backend/build.gradle.kts`:
```kotlin
implementation(platform("software.amazon.awssdk:bom:<version>"))
implementation("software.amazon.awssdk:ec2")
```
- SDK v2。`ec2` モジュールのみ（`sts` は IAM ロール利用時に SDK が必要なら追加）。
- イメージサイズ増を確認（ADR 0004 の検証項目）。

### 6.6 エラー設計（[01-common §3](../detail/01-common.md)）

| 追加コード | HTTP | 用途 |
|---|---|---|
| `CLOUD_LINK_CONFLICT` | 409 | 別サーバーが同じ EC2 インスタンス ID を使用中（**要レビュー**: 400 で表現する案もあり） |
| `CLOUD_PROVIDER_UNAVAILABLE` | 503 | provider 全体が無効・未設定で `refresh` できない（個別取得失敗は含まない） |

- 個別インスタンスの取得失敗は**エラーレスポンスにしない**。`CloudLinkResponse.lastError` で表現し `200`（P8/C5）。

### 6.7 テスト（[CLAUDE.md §5](../../../CLAUDE.md)）

| 対象 | テスト |
|---|---|
| `CloudStateMapper` | EC2 生値 → 正規化 enum（全 EC2 状態 + 未知値 → `unknown`） |
| `CloudLinkServiceImpl` | upsert / delete / 対象サーバー不存在 404 / インスタンス ID 形式 / 重複 409（Mockito） |
| `CloudStatePoller` | 正常更新 / バッチ分割 / 欠落 → `gone` / AWS 例外時に `state` 据え置き + `last_error`（フェイク provider） |
| `CloudLinkApiIntegrationTest` | `PUT`/`DELETE`/`refresh`/401/404（Testcontainers + フェイク provider） |
| `ServerApiIntegrationTest`（既存） | `cloudLink` フィールドが `null` で返ることを 1 ケース追加（既存アサーションは不変 = C9） |

**既存 89 テストは変更なしで green を維持**（レスポンスへのフィールド追加は既存 `jsonPath` アサーションに影響しない）。

---

## 7. Frontend 変更案

すべて加算的。既存 123 テストを維持（C9）。**FE は AWS を直接呼ばない**（Backend 経由のみ）→ CSP 変更不要。

### 7.1 型・API・hook（9-4 で実装）

| ファイル | 内容 |
|---|---|
| `types/cloud.ts`（新規） | `CloudInstanceState` union（7 値）、`CLOUD_STATE_LABELS`、`CLOUD_STATE_TONE`（色グループ）、`CloudProvider`、`CloudLink` / `CloudLinkBody` / `CloudLinkFormValues`、`toCloudInstanceState`（未知値 → `unknown`） |
| `types/server.ts` | `ServerDetail` に `cloudLink?: CloudLink \| null`、`ServerSummary` に `cloudState?` / `cloudStateFetchedAt?`（すべて optional、既存契約を壊さない） |
| `types/api.ts` | `ERROR_CODES` に `CLOUD_LINK_CONFLICT` / `CLOUD_PROVIDER_UNAVAILABLE` |
| `api/cloud.ts`（新規、`interface CloudApi` + `CloudApiImpl` + `cloudApi`、§4 命名規約） | `setCloudLink` / `deleteCloudLink` / `refreshCloudState`。**FE は AWS を直接呼ばない** |
| `hooks/cloud.ts`（新規） | `useSetCloudLinkMutation` / `useDeleteCloudLinkMutation` / `useRefreshCloudStateMutation`。成功時 `setQueryData` で `servers.detail(id).cloudLink` を差し替え + `['servers']` invalidate（別クエリは作らない） |
| `validation/cloudLink.ts`（新規） | インスタンス ID 形式（Backend の `@Pattern` と同一）、リージョン形式、`toCloudLinkBody` |

### 7.2 コンポーネント（9-4 で実装）

| ファイル | 内容 |
|---|---|
| `components/servers/CloudStateChip.tsx`（新規） | `state` → ラベル + 色。**`StatusChip`（枠線 + 色ドット）とは意図的に別デザイン（塗りつぶし）**。`role="img"` + `aria-label="AWS 実行状態: …"` |
| `components/servers/CloudLinkPanel.tsx`（新規） | 明細の**独立セクション「AWS 連携」**（`ServerDetailView` は無変更）。未連携 → 「AWS 未連携」+「連携する」。連携済み → provider / インスタンス ID（コピー）/ リージョン / 「AWS 実行状態」行（`CloudStateChip` +「最終取得 …」+ `stale` バッジ + `lastError` の注記 + 「管理ステータスとは別」の注記）+「今すぐ更新」（`isPending` で二重送信防止）+「連携を編集」/「連携を解除」（確認ダイアログ） |
| `components/servers/CloudLinkFormModal.tsx`（新規） | インスタンス ID（必須、`i-` 形式）+ リージョン（既定 `ap-northeast-1` プリセット）。409 `CLOUD_LINK_CONFLICT` は externalId フィールドに表示 |
| `pages/ServerDetailPage.tsx` | `ServerDetailView` と履歴セクションの間に `<CloudLinkPanel>` を配置。`ServerDetailView`（管理情報）は無変更 = `StatusChip` はそのまま |
| `pages/DashboardPage.tsx` | **変更なし**（§1.3） |
| `components/servers/ServerListTable.tsx` | 9-5 で「AWS」列を追加 |

### 7.3 表示ルール（C4 / C5）

- 「管理ステータス」と「AWS 実行状態」は**必ず別ラベル・別行**。同じチップ種を使わない。
- AWS 実行状態には**常に「最終取得 HH:MM」を併記**。
- `stale=true`（鮮度閾値超過）→「情報が古い可能性があります」。
- `lastError != null` →「最終取得は成功しています／最新の取得に失敗しました（HH:MM）」を明示。値は消さない。
- `state=gone` →「インスタンスが見つかりません（削除済みの可能性）」。
- 取得に失敗しても**管理ステータスの表示・編集は一切変わらない**（C6）。

### 7.4 テスト

| 対象 | テスト |
|---|---|
| `CloudStateChip` | 各 state の表示・色・aria-label |
| `CloudLinkFormModal` | 必須・形式バリデーション / 成功 / 409 表示 |
| `ServerDetailPage`（追加） | 管理ステータスと AWS 実行状態が別々に出る / 「今すぐ更新」で mutation / `stale` 表示 / `lastError` 表示 / 取得失敗でも StatusChip は不変 |
| `mocks/serverFixtures` | `serverDetailFixture` に `cloudLink`、cloud-link 系ハンドラを追加 |

既存の `ServerFormModal.test` / `ServerListPage.test` / `ServerDetailPage.test`（現行分）は**変更しない**。

---

## 8. AWS IAM 変更案

### 8.1 権限（最小権限、C7）

ServerHub が使う IAM ポリシー（読み取り専用）:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ServerHubDescribeEc2",
      "Effect": "Allow",
      "Action": ["ec2:DescribeInstances"],
      "Resource": "*",
      "Condition": { "StringEquals": { "aws:RequestedRegion": ["ap-northeast-1"] } }
    }
  ]
}
```

- `ec2:DescribeInstances` は**リソースレベル制限に非対応**なので `Resource: "*"` + リージョン条件で絞る。
- 起動・停止・変更系（`ec2:StartInstances` 等）は**含めない**（C7）。
- タグでさらに絞りたい場合は将来 `ec2:ResourceTag` 条件を追加（discover 実装時）。

### 8.2 クレデンシャル戦略（P14 / §10.1.9）

| 環境 | 方法 |
|---|---|
| 本番（Phase 9 の AWS デプロイ） | **IAM ロール**を計算リソースにアタッチ（ECS タスクロール / EC2 インスタンスプロファイル）。SDK 既定クレデンシャルチェーンが自動取得。静的キーなし |
| ローカルで実 AWS を試す開発者 | `serverhub.cloud.enabled=true` + `AWS_PROFILE` / `AWS_ACCESS_KEY_ID`（SDK 標準、コミットしない） |
| CI / 自動テスト | `enabled=false` + フェイク provider。AWS を呼ばない |

- ロールの信頼ポリシーは ServerHub の計算サービスからのみ Assume 可能に。
- 実際のロール作成は Phase 9 の AWS インフラ構築（IaC or 手順書）で行う。本書は**必要権限の定義**まで。
- `.env.example` に AWS の**リージョン・enabled フラグ**のコメントだけ追記（キーは書かない）。

### 8.3 セキュリティレビュー観点

- アウトバウンド通信は AWS EC2 API（HTTPS）のみ。CSP `connect-src` は Backend の設定で、FE には影響なし。
- `DescribeInstances` のレスポンスに含まれる情報（Private IP・タグ等）のうち、ServerHub が**保存するのは
  `state` / `state_raw` のみ**。他は破棄（最小取得の原則、§10.1.9）。
- ログに instance ID は出してよい（機密ではない）。クレデンシャル・トークンは出さない（既存ルール）。

---

## 9. 運用・非機能

- **単一インスタンス前提**（S6）。ポーラーは 1 プロセス想定。将来スケールアウトする場合:
  ShedLock（DB ロック）でリーダーのみポーリング、または P4(b) の別ワーカーへ分離。→ open-issues に追記。
- レート制限: `DescribeInstances` は 100 件/呼び出し。数百台規模（B7）でも 5 分間隔なら余裕。
  スロットリング時は指数バックオフ。
- ダッシュボードの `refetchInterval` 不使用方針（S8）は不変。鮮度はサーバー側（`state_fetched_at`）で管理。
- 監査: 紐付けの作成 / 解除は業務イベント INFO ログ（[05-cross-cutting §4.3](05-cross-cutting.md) と同じ方針）。

---

## 10. 要件・課題管理への反映（本 PR で行う文書変更）

| 文書 | 変更 |
|---|---|
| 本書（新規） | Phase 9 設計（レビュー中） |
| [requirements §9.2](../../requirements/requirements.md) | **FR-CLOUD-01**（AWS EC2 実行状態の参照）を追加。§14 の該当記述を更新 |
| [open-issues E2](../../requirements/open-issues.md) | 「調査済み」→「設計中（本書）」。§3 の論点を「Phase 9 レビューで確定」に |
| [03-data-model §5](03-data-model.md) | クラウド連携行を「Phase 9 実装、本書参照」に更新（ER は実装 PR で） |
| [CLAUDE.md §9 / §11](../../../CLAUDE.md) | Phase 9 着手を記録 |

**コード・スキーマ・テストの変更は本 PR では行わない**（設計レビュー用）。

---

## 11. 実装 PR 計画（レビュー確定後）

| PR | 範囲 | 既存テストへの影響 |
|---|---|---|
| 9-1 | DB `V3` + `ServerCloudLink` Entity / `ServerCloudLinkDao` / enum + `DomainConverter` | なし（新規のみ） |
| 9-2 | `CloudStateProvider` interface + `DisabledCloudStateProviderImpl` + `Ec2CloudStateProviderImpl` + `CloudStatePoller` + 設定 + AWS SDK 依存 | なし（`enabled=false` 既定） |
| 9-3 | `CloudLinkController` + `CloudLinkServiceImpl` + `refresh` + レスポンス enrichment（detail + list）+ 新エラーコード | 既存 BE 89 は不変（フィールド追加のみ）。新テスト追加 |
| 9-4 | FE 型 / `api/cloud` / `hooks/cloud` / `CloudStateChip` / `ServerDetailView` の分離表示 / `CloudLinkFormModal` | 既存 FE 123 は不変。新テスト追加 |
| 9-5 | FE 一覧バッジ + MSW fixtures + 仕上げ | 既存の列不在アサーションに影響なし |
| 9-6 | AWS IAM ポリシー文書 + デプロイ手順（Phase 9 AWS インフラ作業と統合可） | なし |

各 PR は「1 機能 = 1 ブランチ = 1 PR」「テストなしで完成としない」を守る。

---

## 12. レビュー結果（2026-09-08、PR #47 承認）

すべて確定。

1. §3 の論点 P1〜P15 → **推奨案どおり採用**（P7 サブリソース分離 / P8 refresh は 200 / P10 リンクを残す を含む）。
2. §5.2 の重複エラー → **`409 CLOUD_LINK_CONFLICT`**（新コード）。
3. §6.2 の enrichment → **当面 `ServerServiceImpl`**。Assembler は新設しない。
4. §5.1 一覧レスポンスに `cloudState` / `cloudStateFetchedAt` → **追加する**。N+1 を出さず一括取得。
5. リージョン → **当面 `ap-northeast-1` で固定**。
6. §11 の PR 分割（9-1〜9-6）→ **採用**。

### 追加の絶対条件（オーナー指示、実装で厳守）

`servers.status` / `Status` enum は一切変更しない。AWS state と管理 status は別物。AWS → ServerHub の
**取得のみ**（`StartInstances`/`StopInstances`/`TerminateInstances` 等の書き込み API は禁止）。IAM は
`ec2:DescribeInstances` のみ。静的 AWS アクセスキーを DB・ソースコードに保存しない。ローカル/CI は
`enabled=false` + Fake/Disabled provider。AWS 障害時も一覧・詳細・Dashboard は利用可能。FE から AWS API を
直接呼ばない。既存 BE 89 / FE 123 のテストを壊さない。MVP 既存機能を破壊しない。
