# 03. サーバー・タグ（詳細設計）

- バージョン: 1.1（確定、PR #22 → Phase 5 ③ 実装で §1/§2/§3/§6/§7 を実装確定値に更新）
- 最終更新: 2026-09-07
- 対応: FR-SRV-01〜06 / FR-TAG-01・02 / BR-01・02・03・04・05・07・08・10 / UC-03〜09 /
  [01-common](01-common.md) / [02-auth](02-auth.md)（Entity/DAO パターンを踏襲） /
  [02-api §3.2/§3.3](../basic/02-api.md) / [03-data-model](../basic/03-data-model.md)

`server` パッケージに `Server`/`Tag` の両方を置く（タグは単独 CRUD API を持たないため、
00-overview §5 の合意どおり同居させる）。

---

## 1. 列挙型（enum）と JSON/DB 変換

`environment` / `status` / `virtualization_type` は Java 側 `UPPER_SNAKE_CASE`、DB・JSON は
小文字（[01-common §4](01-common.md) D-DETAIL-04 の具体化）。**JSON と DB を同じ `value` 文字列で
統一する**（D-SRV-01）：

```java
public enum Environment {
  PRODUCTION("production"), STAGING("staging"), DEVELOPMENT("development");

  private final String value;

  @JsonValue public String value() { return value; }
  @JsonCreator public static Environment fromValue(String value) { ... } // 不一致は IllegalArgumentException
}
```

- `Status { ACTIVE("active"), MAINTENANCE("maintenance"), RETIRED("retired") }`、
  `VirtualizationType { PHYSICAL("physical"), VIRTUAL("virtual") }` も同型。
- **Jackson**: `@JsonValue`/`@JsonCreator` で JSON の小文字表現に統一（レスポンス/リクエストとも）。
  アノテーションのパッケージは `com.fasterxml.jackson.annotation.*`（Jackson 2/3 共通。Spring Boot 4.1 の
  Jackson 3 databind もこれを読む。`tools.jackson.annotation` は存在しない）。
- **Doma**（Phase 5 で確定、D-DETAIL-04 の具体化）: enum クラス自体は変更せず、`fromValue`/`value()` に委譲する
  `DomainConverter<MyEnum, String>` 実装（`@org.seasar.doma.ExternalDomain` 付き）を `common/domain` に置き、
  `@org.seasar.doma.DomainConverters({...})` を付けた集約クラス `DomainConvertersProvider` を 1 つ用意する。
  その FQCN を注釈処理オプション `-Adoma.domain.converters=...`（`backend/build.gradle.kts` の `JavaCompile`）で
  指定する。Entity 側は素の enum フィールドのまま扱える。
- **クエリパラメータ**（`environment`/`status` フィルタ、[01-common §1.2](01-common.md)）: 同じ
  `fromValue` を使う Spring `Converter<String, Environment>`（`@Component`、Spring Boot が MVC の
  ConversionService へ自動登録）を用意する。変換失敗時は `IllegalArgumentException` →
  `MethodArgumentTypeMismatchException` → `400`（自動）。
- **ソートキー**も同じパターン：`ServerSortKey { HOSTNAME("hostname"), ENVIRONMENT("environment"),
  STATUS("status"), UPDATED_AT("updatedAt"), CREATED_AT("createdAt") }`（F1、値は API のクエリ
  表記に合わせ camelCase）。`Converter<String, ServerSortKey>` を登録し、実際の ORDER BY 列への解決は
  SQL 側で行う（§3.3）。`order`（`asc`/`desc`）は大文字小文字を問わず `SortDirection` にバインドする
  `Converter` を `common/page` に置く。

---

## 2. Entity（`server` パッケージ）

```java
@Entity(immutable = true)
public record Server(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    String hostname,
    String ipAddress,
    Environment environment,
    Status status,
    String description,
    String os,
    String osVersion,
    VirtualizationType virtualizationType,
    String location,
    String owner,
    @Version Long version,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime deletedAt
) {}

@Entity(immutable = true)
public record Tag(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    String name,
    LocalDateTime createdAt
) {}
```

- Doma immutable entity（record、[02-auth](02-auth.md) D-AUTH-01 を踏襲）。`Server` は自動生成 SQL
  （`@Insert`/`@Update`）を使うため `@Table(name = "servers")` を明示する（`doma.naming` は複数形化しない）。
- `Server` は `EntityListener` で `createdAt`/`updatedAt` を自動設定（[01-common §4](01-common.md) D-DETAIL-05）。
  `Tag` は更新がない（`created_at` のみ）ためリスナー不要。
- **`server_tags` の Entity（Phase 5 で方針変更、D-SRV-06）**: 当初「Entity を作らない」としていたが、Doma は
  `@BatchInsert` と複数列を返す `@Select` の対象型が `@Entity` であることを要求する（素の record 射影は不可）。
  そのため中間テーブル用に最小の Doma entity を 2 つ置く：
  - `ServerTag(@Id Long serverId, @Id Long tagId)` … 書き込み（`@BatchInsert`）用。`@Table(name = "server_tags")`。
  - `ServerTagNameRow(Long serverId, String tagName)` … 一覧表示用に `server_tags` × `tags` を JOIN した射影。
  いずれも `ServerTagDao` の内部でのみ使い、ドメインモデル／Service・Controller には公開しない
  （「中間テーブルは行操作のみ」という [03-data-model §2.1](../basic/03-data-model.md) の意図は維持）。

---

## 3. DAO

### 3.1 `ServerDao`

| メソッド | 概要 | SQL ファイル |
|---|---|---|
| `Optional<Server> selectActiveById(Long id)` | `deleted_at IS NULL` の 1 件（BR-01） | `selectActiveById.sql` |
| `Optional<Long> selectIdByActiveHostname(String hostname)` | ホスト名重複チェック（BR-02） | `selectIdByActiveHostname.sql` |
| `List<Server> selectList(ServerSearchCriteria c, PageRequest p, ServerSortKey sort, SortDirection order)` | 一覧・検索（FR-SRV-01/02） | `selectList.sql` |
| `long selectCount(ServerSearchCriteria c)` | 一覧・検索の総件数 | `selectCount.sql` |
| `Result<Server> insert(Server server)` | 登録（Service が `version=0` を設定、`EntityListener` が日時設定）。immutable entity のため戻り値は `Result<Server>`（`getEntity()` で採番後インスタンス取得） | Doma 自動生成（`@Insert`、SQL ファイル不要） |
| `Result<Server> update(Server server)` | 全項目更新。`@Version` 不一致で Doma が `OptimisticLockException`（実行時は doma-spring-boot が `OptimisticLockingFailureException` に変換、§6）。`createdAt`/`deletedAt` は `@Update(exclude=…)` で更新対象外 | Doma 自動生成（`@Update`） |
| `int updateDeletedAt(Long id, LocalDateTime deletedAt)` | 論理削除（`version` チェックなし。FR-SRV-06 は `version` を入力に含まない） | `@Update(sqlFile = true)` + `updateDeletedAt.sql` |

- `selectList`/`selectCount` は同じ `ServerSearchCriteria`（Service 内部専用オブジェクト、リクエスト
  DTO をそのまま渡さない）を受け、`/*%if*/` で `keyword`（`LIKE` エスケープ済み前提、§5）・
  `environment`・`status`・`tagIds`（タグ名から解決済み）を AND 結合する（[02-api §3.2](../basic/02-api.md)）。
- `selectList` の ORDER BY は `sort`/`order` の Java 値を SQL 内の `/*%if*/`〜`/*%elseif*/` 分岐で
  切り替える（識別子を文字列結合しない、requirements §10.1.7）:

  ```sql
  order by
  /*%if sort == @com.serverhub.server.ServerSortKey@HOSTNAME */ hostname
  /*%elseif sort == @com.serverhub.server.ServerSortKey@ENVIRONMENT */ environment
  /*%elseif sort == @com.serverhub.server.ServerSortKey@STATUS */ status
  /*%elseif sort == @com.serverhub.server.ServerSortKey@CREATED_AT */ created_at
  /*%else*/ updated_at
  /*%end*/
  /*%if order == @com.serverhub.common.page.SortDirection@ASC */ asc /*%else*/ desc /*%end*/
  ```

- タグ AND 絞り込み（B5）は `server_tags` のサブクエリ（[03-data-model §4.6](../basic/03-data-model.md) の
  Index 前提）:

  ```sql
  /*%if criteria.tagIds != null && !criteria.tagIds.isEmpty() */
  and s.id in (
    select st.server_id from server_tags st
    where st.tag_id in /* criteria.tagIds */(1, 2)
    group by st.server_id
    having count(distinct st.tag_id) = /* criteria.tagIds.size() */2
  )
  /*%end*/
  ```

  タグ名 → `tagIds` の解決は Service が事前に `TagDao.selectByNames` で行う。**存在しないタグ名が
  1 つでもあれば、AND 条件を満たすサーバーは絶対に無いため、DAO を呼ばず空リストを返す**
  （最適化、無駄なクエリを避ける）。

### 3.2 `TagDao`

| メソッド | 概要 | SQL ファイル |
|---|---|---|
| `List<Tag> selectByNames(List<String> names)` | 既存タグの解決（FR-TAG-01） | `selectByNames.sql` |
| `List<String> selectSuggest(String prefix, int limit)` | 前方一致サジェスト（FR-TAG-02、F3） | `selectSuggest.sql` |
| `int insertIgnoreConflict(String name)` | 新規タグ作成。`INSERT ... ON CONFLICT (name) DO NOTHING`（下記） | `insertIgnoreConflict.sql` |

- **タグ作成は「なければ作る」を `ON CONFLICT DO NOTHING` の upsert で表現**し、事前チェック→
  `409` という設計にしない（D-SRV-02）。同時に同名タグを作ろうとする 2 リクエストが競合しても
  片方が無視されるだけで失敗しない（ホスト名のような「利用者が解決すべき衝突」ではなく、
  「結果的に 1 つ存在すればよい」操作のため）。Service は `insertIgnoreConflict` の後に
  `selectByNames` で最終的な ID を取得する。

### 3.3 `ServerTagDao`（中間テーブル）

| メソッド | 概要 | SQL ファイル |
|---|---|---|
| `List<ServerTagNameRow> selectByServerIds(List<Long> serverIds)` | 一覧表示用のタグをまとめて取得（N+1 回避、requirements §10.2.2） | `selectByServerIds.sql` |
| `List<String> selectTagNamesByServerId(Long serverId)` | 詳細表示用（1 件） | `selectTagNamesByServerId.sql` |
| `BatchResult<ServerTag> batchInsert(List<ServerTag> rows)` | タグ付け（`@BatchInsert`。immutable entity のため戻り値は `BatchResult`） | Doma 自動生成 |
| `int deleteByServerId(Long serverId)` | 既存の付け外しを一旦全削除（3.4） | `@Delete(sqlFile = true)` + `deleteByServerId.sql` |

`ServerTag` / `ServerTagNameRow` は §2 のとおり `server` パッケージ内の最小 Doma entity（D-SRV-06）。

### 3.4 タグの更新方式（D-SRV-03）

サーバー登録・編集時、`server_tags` は**差分更新ではなく「全削除 → 全再登録」**にする
（[03-data-model §2.1](../basic/03-data-model.md) 「差分」を実装レベルで単純化）。

- 理由：1 サーバーあたりのタグ数は少数（requirements の性質上、数個程度）で、削除+再挿入の
  コストは無視できる。差分計算（追加分/削除分の集合演算）のコードを書くより単純で誤りにくい。
- 登録（`POST`）は `server_tags` が空の状態から挿入のみ。編集（`PUT`）は
  `deleteByServerId` → `batchInsert` を同一トランザクション内で実行。

---

## 4. Request / Response DTO

### 4.1 リクエスト

```java
public record ServerCreateRequest(
    @NotBlank @Size(max = 255) @Hostname String hostname,
    @IpAddress String ipAddress,                 // 任意
    @NotNull Environment environment,
    @NotNull Status status,
    @Size(max = 1000) String description,
    @Size(max = 100) String os,
    @Size(max = 100) String osVersion,
    VirtualizationType virtualizationType,        // 任意
    @Size(max = 255) String location,
    @Size(max = 255) String owner,
    @Size(max = 50) List<@NotBlank @Size(max = 50) String> tags
) {}

public record ServerUpdateRequest(
    // ServerCreateRequest と同じ項目 +
    @NotNull Long version
) {}
```

- `@IpAddress`/`@Hostname` は [01-common §2.1](01-common.md) の共通制約アノテーション。
- `tags` は未指定可（`null`/空リストはタグなしとして扱う）。正規化（前後空白除去・重複排除、BR-07）は
  Service で行い、DTO はそのまま受け取る。

### 4.2 レスポンス

```java
public record ServerSummaryResponse(
    Long id, String hostname, Environment environment, Status status,
    List<String> tags, LocalDateTime updatedAt
) {}

public record ServerDetailResponse(
    Long id, String hostname, String ipAddress, Environment environment, Status status,
    String description, String os, String osVersion, VirtualizationType virtualizationType,
    String location, String owner, List<String> tags,
    Long version, LocalDateTime createdAt, LocalDateTime updatedAt
) {}
```

**D-SRV-04（02-api の一部訂正）**: `ServerDetailResponse` に**メンテナンス履歴を埋め込まない**。
[02-api §3.2](../basic/02-api.md) の `GET /servers/{id}` 説明にある「直近のメンテナンス履歴」は削除し、
Frontend は `GET /servers/{id}/maintenance-histories?size=5` 相当を別途呼ぶ（既存の一覧 API を
小さい `size` で呼ぶだけで、専用の埋め込みフィールドを持たない）。理由：
- `server` パッケージが `maintenance` パッケージの DTO に依存する結合を避ける（レイヤ/パッケージの
  疎結合、[01-architecture §2.2](../basic/01-architecture.md)）。
- 「もっと見る」で結局同じ一覧 API を呼ぶため（06-ui）、埋め込みは初回表示の 1 リクエストを
  減らす以上の価値がなく、コストに見合わない（過剰設計の回避）。
- 02-api §3.2 の当該行は本 PR で修正する（spec-sync）。

---

## 5. 業務ルールの実装配置

| BR/FR | 内容 | 実装配置 |
|---|---|---|
| BR-01 | 一覧・検索・詳細は `deleted_at IS NULL` のみ対象 | `ServerDao` の全 SQL に固定条件（Service が渡す変数ではなく SQL 固定） |
| BR-02 | ホスト名は `deleted_at IS NULL` 内で一意 | Service: `selectIdByActiveHostname` で事前チェック → `409`。DB 側は部分ユニークインデックスが安全網（[05-cross-cutting §1.3](../basic/05-cross-cutting.md)） |
| BR-03 | 必須項目（ホスト名・環境区分・ステータス） | Bean Validation（`@NotNull`/`@NotBlank`）+ DB `NOT NULL` |
| BR-04 | enum は定義値のみ | Java `enum` 型バインド（§1）+ DB `CHECK` |
| BR-05 | ステータス遷移に制約なし | **実装しない**（遷移チェックのコードを書かないことが実装） |
| BR-07 | タグ名正規化・重複不可 | Service：前後空白除去・空文字除外・**大文字小文字は区別**（正規化しない）・リクエスト内重複を 1 件に集約。DB は `server_tags(server_id, tag_id)` 複合 PK が最終防衛線 |
| BR-08 | 楽観ロック | Doma `@Version` が影響行 0 件で `OptimisticLockException`。doma-spring-boot の例外変換で実行時は `org.springframework.dao.OptimisticLockingFailureException` になるため、`GlobalExceptionHandler` は両型を受ける（[05-cross-cutting §1.2](../basic/05-cross-cutting.md)） |
| BR-10 | `created_at`/`updated_at` はシステム設定 | `ServerEntityListener`（`preInsert`/`preUpdate` で `now()` を差し込む。[01-common §4](01-common.md) D-DETAIL-05） |
| F1 | ソート項目ホワイトリスト | `ServerSortKey` enum（§1） |
| F3 | サジェスト前方一致 | `TagDao.selectSuggest` の `LIKE /* @prefix(prefix) */ escape '$'`（Doma 標準関数がワイルドカードをエスケープ、requirements §10.1.7）。`keyword` 検索も同様に `@infix` を使い、Service では事前エスケープしない |

---

## 6. エラーケース一覧

| ケース | HTTP | `code` |
|---|---|---|
| Bean Validation 違反（必須未入力・文字数超過・IP/ホスト名形式） | 400 | `VALIDATION_ERROR` |
| 未定義の `sort`/`order`/`environment`/`status`（クエリ） | 400 | `VALIDATION_ERROR`（[01-common §1.2](01-common.md)、自動） |
| ID 形式不正（パス変数が数値でない） | 400 | `VALIDATION_ERROR` |
| 対象サーバー不存在・削除済み（詳細/編集/削除/履歴サブリソース） | 404 | `RESOURCE_NOT_FOUND` |
| ホスト名重複（登録・編集） | 409 | `DUPLICATE_HOSTNAME` |
| `version` 不一致（編集） | 409 | `OPTIMISTIC_LOCK_CONFLICT` |
| DB 一意制約違反（安全網） | 409 | `DUPLICATE_HOSTNAME`（`ux_servers_hostname_active` 違反 → doma-spring-boot が `DuplicateKeyException` に変換 → `server` パッケージの `ServerExceptionHandler` が変換。事前チェック用の `DuplicateHostnameException` と同じハンドラで受ける。[05-cross-cutting §1.3](../basic/05-cross-cutting.md)） |

タグ・サジェストのエンドポイントは `VALIDATION_ERROR`（`prefix` 長さ超過等）以外のエラーケースを持たない。

---

## 7. この文書で追加・確定した事項

| ID | 事項 | 根拠 |
|---|---|---|
| D-SRV-01 | enum は Java/JSON/DB を単一の `value` 文字列で統一する変換関数（`fromValue`/`value()`）を持つ | 01-common D-DETAIL-04 の具体化。JSON・DB・クエリ変換のロジックを 1 箇所に |
| D-SRV-02 | タグ新規作成は `INSERT ... ON CONFLICT DO NOTHING` の upsert。事前チェック＋`409` にしない | 「衝突を利用者に見せる必要がない」操作という性質の違い（ホスト名との対比） |
| D-SRV-03 | `server_tags` は差分更新せず「全削除 → 全再登録」 | データ量が小さく、差分計算より単純で誤りにくい |
| D-SRV-04 | `GET /servers/{id}` にメンテナンス履歴を埋め込まない（02-api の記述を修正） | パッケージ間の疎結合、過剰設計の回避 |
| D-SRV-05 | 存在しないタグ名を含む検索は DAO を呼ばず空リストを即返す | 無駄なクエリの回避 |
| D-SRV-06 | `server_tags` にも最小 Doma entity（`ServerTag` / `ServerTagNameRow`）を置く（当初「Entity なし」から変更、§2/§3.3） | Doma は `@BatchInsert`・複数列 `@Select` の対象型に `@Entity` を要求する。DAO 内部限定で公開しないことで「行操作のみ」の意図は維持 |

- D-SRV-01 の Doma 変換方式・クエリパラメータの `Converter` は Phase 5 で §1 のとおり確定した
  （`@ExternalDomain` + `@DomainConverters` + `-Adoma.domain.converters`、`@Component` Converter）。
- `ServerSearchCriteria` は `record ServerSearchCriteria(String keyword, Environment environment, Status status, List<Long> tagIds)`。
- SQL ファイルの内容は [`V1__init.sql`](../../../backend/src/main/resources/db/migration/V1__init.sql) の列名に合わせて確定済み。
