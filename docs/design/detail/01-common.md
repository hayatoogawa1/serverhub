# 01. 共通 DTO・共通バリデーション・エラーコード正式化（Q3）

- バージョン: 1.0（ドラフト・レビュー待ち）
- 最終更新: 2026-09-04
- 関連: [00-overview](00-overview.md) / [02-api](../basic/02-api.md) / [03-data-model](../basic/03-data-model.md) /
  [05-cross-cutting](../basic/05-cross-cutting.md) / [open-issues Q3](../../requirements/open-issues.md)

`common/*` パッケージ（[01-architecture §2.2](../basic/01-architecture.md)）に置く、
02〜05（auth/server/maintenance/dashboard）すべてが前提にする共通要素を先に固める。
以降の機能文書はここで定義した型・パターン・エラーコード表を**再定義せず参照**する。

---

## 1. 共通 DTO 実体

### 1.1 ページング

```java
package com.serverhub.common.page;

public record PageRequest(int page, int size) {}

public enum SortDirection { ASC, DESC }

public record PageResponse<T>(List<T> content, PageMeta page) {
  public record PageMeta(int number, int size, long totalElements, int totalPages) {}

  public static <T> PageResponse<T> of(List<T> content, PageRequest req, long totalElements) {
    int totalPages = (int) Math.ceil((double) totalElements / req.size());
    return new PageResponse<>(content, new PageMeta(req.page(), req.size(), totalElements, totalPages));
  }
}
```

- `PageRequest` は `page`/`size` のみを持つ**正規化済み**の値（[02-api §2.5](../basic/02-api.md) の
  丸めルールを適用済み）。`sort`/`order` はここに含めない（1.2）。
- JSON への直列化は `page`/`content` フィールド名をそのまま使う（02-api の契約どおり）。

**正規化（Controller 層、`PageRequestFactory`）**

```java
public final class PageRequestFactory {
  private static final Set<Integer> ALLOWED_SIZES = Set.of(10, 20, 50, 100);
  private static final int DEFAULT_SIZE = 20;

  public static PageRequest create(int page, Integer size) {
    int normalizedSize = (size != null && ALLOWED_SIZES.contains(size)) ? size : DEFAULT_SIZE;
    return new PageRequest(page, normalizedSize);
  }
}
```

- `page` は Controller の `@RequestParam(defaultValue = "0") @PositiveOrZero int page` で受け、
  Bean Validation が負数を `400` にする（[05-cross-cutting §2.2](../basic/05-cross-cutting.md) の
  `ConstraintViolationException` ハンドラ）。
- `size` は**丸めるだけで例外を投げない**（[02-api §2.5](../basic/02-api.md) D-API-06）。

### 1.2 ソート・enum フィルタは「型で表現する」（D-DETAIL-01）

`sort`（項目名）・`order`（`asc`/`desc`）・enum フィルタ（`environment`/`status` 等）は、
**機能ごとの Java `enum` に直接バインド**する。Spring の型変換に任せることで、独自の
ホワイトリスト判定コード・専用例外クラスを持たずに `02-api §2.5` の「一致しなければ `400`」を実現する。

```java
// 例: サーバー一覧（03-server で正式化）
public enum ServerSortKey { HOSTNAME, ENVIRONMENT, STATUS, UPDATED_AT, CREATED_AT }

@GetMapping("/servers")
public PageResponse<ServerSummaryResponse> list(
    @RequestParam(defaultValue = "0") @PositiveOrZero int page,
    @RequestParam(required = false) Integer size,
    @RequestParam(defaultValue = "UPDATED_AT") ServerSortKey sort,
    @RequestParam(defaultValue = "DESC") SortDirection order,
    @RequestParam(required = false) Environment environment,
    @RequestParam(required = false) Status status,
    ...
) { ... }
```

- 未定義の値（例 `sort=foo`）が来ると Spring は `MethodArgumentTypeMismatchException` を投げる。
  `GlobalExceptionHandler` にこれを **`400` / `VALIDATION_ERROR`** として追加する
  （[05-cross-cutting §2.2](../basic/05-cross-cutting.md) の表に対する追補、§3 参照）。
- 論理ソートキー（`ServerSortKey`）から実際の Doma/SQL 列への解決は各機能の DAO/SQL 側の責務
  （例: `switch` 式や SQL の `/*%if*/` 分岐）。共通層は「型で受けて `400` を自動化する」ところまで。
- ホワイトリスト管理表（`common/page` の固定マップ、[01-architecture §2.2](../basic/01-architecture.md)）は
  不要になる：Java の enum 定義自体がホワイトリストを兼ねるため（実装をシンプルにする）。

### 1.3 エラー DTO

```java
package com.serverhub.common.error;

public record ApiError(String code, String message, String traceId, List<FieldError> errors) {
  public static ApiError of(String code, String message, String traceId) {
    return new ApiError(code, message, traceId, null);
  }
  public static ApiError validation(String message, String traceId, List<FieldError> errors) {
    return new ApiError("VALIDATION_ERROR", message, traceId, errors);
  }
}

public record FieldError(String field, String message) {}
```

- `@JsonInclude(JsonInclude.Include.NON_NULL)` を `ApiError` に付け、`errors` が `null` のとき
  JSON に出さない（[02-api §2.4](../basic/02-api.md)）。
- `GlobalExceptionHandler`（`common/error`）と、04-security のログイン成功/失敗ハンドラの両方が
  この `ApiError` を使う（[05-cross-cutting §2.2](../basic/05-cross-cutting.md) 「共通のビルダーを再利用」）。

---

## 2. 共通バリデーション

### 2.1 IP アドレス・ホスト名（requirements §10.1.6）

既存ライブラリを優先し自作を避ける方針（requirements §10.1.1 実装コスト評価）。

| 対象 | 方式 |
|---|---|
| IP アドレス | Apache Commons Validator の `InetAddressValidator`（IPv4/IPv6 両対応）を、独自の Bean Validation 制約アノテーション `@IpAddress`（`common/validation`）でラップする |
| ホスト名 | Commons Validator の `DomainValidator` は公開 TLD 前提で内部ホスト名（例 `web-prod-01`）に不向きなため不採用。RFC 1123 のラベル規則に基づく `@Pattern`（`^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`、長さは別途 `@Size`）で足りるため、独自ライブラリは追加しない |

- `commons-validator` を新規依存として追加する（requirements §10.1.1 で名指しされた候補、Phase 5 で
  バージョン確定・`build.gradle.kts` に追加）。

### 2.2 バリデーションの層

requirements §10.1.6 のとおり Controller の Bean Validation（`@Valid`）が一次防衛線。
`common/validation` には上記の再利用可能な制約アノテーションのみを置き、機能固有のルール
（ホスト名の重複など）は各機能の Service 層に置く（[05-cross-cutting §1](../basic/05-cross-cutting.md)）。

---

## 3. エラーコードの正式化（Q3、確定）

### 3.1 命名規則

| 項目 | ルール |
|---|---|
| 形式 | `UPPER_SNAKE_CASE` |
| 構造 | `<対象/状況>_<問題>` の英語表現（例 `RESOURCE_NOT_FOUND`、`DUPLICATE_HOSTNAME`） |
| 名前空間 | **機能プレフィックスを付けない、単一のフラットな一覧**で管理する。MVP の規模（後述のとおり実質 7 件）ではプレフィックスを分ける利点よりも「一覧を見れば全体が分かる」利点を優先する |
| 1 コード = 1 HTTP ステータス | 同じ `code` が異なるステータスで使われることを禁止する（クライアント側の分岐を単純にする） |

### 3.2 コード追加ルール

1. 新しいエラーケースが発生したら、まず**本書 §3.3 の一覧に既存コードで表現できないか**確認する
   （安易に増やさない）。
2. 表現できなければ、本書 §3.3 の一覧に追記する PR を出す（該当機能の詳細設計 PR に含めてよい）。
   **一覧は本書に一元管理**し、各機能文書（02〜05）はここへのリンクのみを置き、コードを
   再定義・重複記載しない。
3. `message` は日本語・利用者向け・内部情報を含まない（requirements §10.1.12）。`code` の
   英語表現とは独立して変更可能。

### 3.3 コード一覧（MVP 確定分）

[05-cross-cutting §3](../basic/05-cross-cutting.md) の暫定集合を正式なコードとして確定する。

| `code` | HTTP | 用途 | 発生元 |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Bean Validation 違反、不正なリクエスト形式、**未定義の sort/order/enum フィルタ**（`MethodArgumentTypeMismatchException`、本書 §1.2 で追加） | 全機能共通 |
| `RESOURCE_NOT_FOUND` | 404 | 対象不存在・削除済み・不正ルート | 全機能共通 |
| `DUPLICATE_HOSTNAME` | 409 | ホスト名重複（事前チェック・DB 制約とも同一コード） | server |
| `OPTIMISTIC_LOCK_CONFLICT` | 409 | `version` 不一致 | server |
| `AUTH_REQUIRED` | 401 | 未認証（`AuthenticationEntryPoint`） | auth |
| `AUTH_BAD_CREDENTIALS` | 401 | ログイン失敗 | auth |
| `INTERNAL_ERROR` | 500 | 想定外エラー全般 | 全機能共通 |

- **02〜05 の各文書を設計した時点でこの表に新規コードが必要か確認**したところ、
  MVP の機能範囲（requirements §5.1、CRUD + 検索 + 履歴 + ダッシュボード）では
  上記 7 件で全ケースを表現できる見込み（例: メンテナンス登録時の対象サーバー不存在・削除済みは
  いずれも `RESOURCE_NOT_FOUND` を再利用）。**02〜05 で新規コードが必要になった場合のみ、
  この表に追記する**（§3.2 の手順）。

---

## 4. Doma 共通設定の方針

- **主キー**: `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)`（[03-data-model §4.2](../basic/03-data-model.md)）。
- **命名規約**: Doma 既定の `camelCase ⇄ snake_case` 自動変換（`BuiltinNamingConvention` 相当）を使う。
  カラム名は Entity フィールド名から機械的に導出できるため、`@Column` での明示指定は
  変則的なもの（略語等）がある場合のみに限定する。
- **enum カラム**: DB 値（`production`/`active` 等の小文字 snake_case、[03-data-model §4.3](../basic/03-data-model.md)）と
  Java 側の命名慣習（enum 定数は `PRODUCTION` 等の `UPPER_SNAKE_CASE`）を一致させない方針とする
  （Java 側の慣習を DB のカラム値のために崩さない）。両者を分離するための Doma 側の具体的な
  仕組み（Domain クラス・カスタムコンバータ等）は、**Doma 3.11 系の実 API を Phase 5 で確認して確定**する
  （本書では「変換レイヤーを 1 箇所に用意する」という方針のみ確定し、実装クラスは持ち越す）。
- **監査列（`created_at`/`updated_at`）**: Doma の `EntityListener` で自動設定する方針とし、
  Service 層で個別に代入するコードを機能ごとに書かない（[03-data-model §4.8](../basic/03-data-model.md) の
  「方針、詳細は Phase 3/5」を受けて確定）。リスナーの実クラスは Phase 5。
- **楽観ロック**: `@Version`（`servers.version`）。[05-cross-cutting §1.2](../basic/05-cross-cutting.md) のとおり、
  Doma が自動的に `OptimisticLockException` を投げる前提を維持する。

---

## 5. この文書で追加・確定した事項

| ID | 事項 | 根拠 |
|---|---|---|
| D-DETAIL-01 | `sort`/`order`/enum フィルタは Java `enum` に直接バインドし、`MethodArgumentTypeMismatchException` を `400`/`VALIDATION_ERROR` として扱う。専用ホワイトリスト判定コードを書かない | 02-api §2.5 の実装を最小コードで満たす |
| D-DETAIL-02 | IP アドレスは Commons Validator `InetAddressValidator`、ホスト名は `@Pattern`（RFC 1123 準拠）。`commons-validator` を新規依存に追加 | requirements §10.1.1/§10.1.6 |
| D-DETAIL-03 | エラーコードは単一フラット名前空間、`UPPER_SNAKE_CASE`、一覧は本書に一元管理（Q3 確定） | MVP 規模に見合う簡潔さ |
| D-DETAIL-04 | enum カラムは DB 値（小文字）と Java 側命名（大文字）を分離する変換レイヤーを設ける。実装クラスは Phase 5 で確定 | Java の命名慣習を DB のために崩さない |
| D-DETAIL-05 | 監査列は Doma `EntityListener` で自動設定し、Service 層に重複コードを書かない | 03-data-model §4.8 の正式化 |

- `GlobalExceptionHandler` への `MethodArgumentTypeMismatchException` 追加は、05-cross-cutting §2.2 の
  表に対する**追補**として扱う（同表の再掲はしない）。
