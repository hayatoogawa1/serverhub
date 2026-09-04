# 05. エラー設計・ログ設計・トランザクション方針

- バージョン: 1.0（ドラフト・レビュー待ち）
- 最終更新: 2026-09-04
- 関連: requirements [§10.1.11/§10.1.12](../../requirements/requirements.md)（ログ・エラー、確定済み）/
  [§10.5](../../requirements/requirements.md)（可観測性）/ [02-api](02-api.md) / [01-architecture](01-architecture.md) §2.1

requirements で「何をログに出す/出さないか」「エラーレスポンスの形」は確定済み
（§10.1.11 / §10.1.12 / §10.5）。本書は **`GlobalExceptionHandler` の例外体系**・
**`traceId` の採番と伝播**・**トランザクション境界のルール**を実装できる粒度まで設計する。
実クラス名・単体テストは Phase 3 / 5。

---

## 1. 例外設計

### 1.1 業務例外クラス（`common/error`）

[01-architecture §2.2](01-architecture.md) の `common/error` パッケージに置く。**すべて非チェック例外**
（`RuntimeException` を継承）とし、`@Transactional` の既定ロールバック挙動（unchecked で rollback）に
乗せる。`rollbackFor` を個々の Service で書かない（§5.2）。

| 例外 | HTTP | 発生元 | 主な発生箇所 |
|---|---|---|---|
| `ResourceNotFoundException` | `404` | Service | ID 指定の詳細/更新/削除で対象なし・削除済み（FR-SRV-03/05/06, FR-MNT-02） |
| `DuplicateHostnameException` | `409` | Service | 登録・編集時のホスト名重複チェック（BR-02） |
| （DB 起因の一意制約違反） | `409` | Doma/Spring 例外変換 | Service の事前チェックをすり抜けた競合（1.3 参照） |
| `OptimisticLockConflictException` 相当 | `409` | Doma（自動） | `servers` 更新時の `version` 不一致（BR-08、1.3 参照） |
| Bean Validation 違反 | `400` | Spring（自動） | `@Valid` の Request DTO 違反（requirements §10.1.6） |
| 不正なリクエスト形式 | `400` | Spring（自動） | 不正 JSON・型不一致・不正な `sort`/`order`/enum フィルタ（02-api §2.5） |
| 未認証 | `401` | Spring Security | 04-security の `AuthenticationEntryPoint` / 認証失敗ハンドラ（`GlobalExceptionHandler` の管轄外） |
| （予約、MVP では未使用） | `403` | — | 将来のロール認可用（01-architecture §4.3） |
| 想定外の例外 | `500` | — | 上記以外すべて |

- 業務例外は「HTTP ステータス」を持たず「意味」だけを持つ（例: `ResourceNotFoundException` は
  対象種別と ID のみ）。ステータスへのマッピングは `GlobalExceptionHandler` 側の責務に閉じる
  （Service が HTTP を意識しない、レイヤ責務の分離）。
- `403` は MVP で投げる箇所がないが、`GlobalExceptionHandler` にハンドラだけ用意し将来の
  `AccessDeniedException` 対応に備える（拡張点、01-architecture §4.3）。

### 1.2 楽観ロックは Doma に任せる

- `servers` の更新は Doma の `@Version` 機構を使う（[03-data-model §4.5](03-data-model.md)）。
  更新 SQL が `WHERE id = ? AND version = ?` を生成し、影響行 0 件のとき Doma が
  `org.seasar.doma.jdbc.OptimisticLockException` を**自動的に**投げる。
- 自前で「更新前に `SELECT` して比較する」実装はしない（Doma の思想を尊重する、`CLAUDE.md` §3）。
  `GlobalExceptionHandler` はこの例外を直接キャッチして `409` に変換する（1.1 表の「相当」はこの意味）。

### 1.3 DB 起因の一意制約違反（安全網）

- 主経路：Service が登録/編集の**事前チェック**でホスト名重複を検出し `DuplicateHostnameException`
  → `409`（分かりやすいメッセージ、FR-SRV-04/05）。
- 安全網：事前チェックと実際の `INSERT`/`UPDATE` の間の競合（TOCTOU）は、部分ユニークインデックス
  違反として DB が拒否する。Spring の例外変換で `DataIntegrityViolationException` になるため、
  `GlobalExceptionHandler` はこれも `409`（汎用の「一意制約違反」メッセージ）にマッピングする。
- 二重の仕組みだが、事前チェックは UX 向け（原因の分かるメッセージ）、DB 制約は整合性の最終防衛線
  （多層防御、requirements §10.1.1）という役割分担であり過剰実装ではない。

### 1.4 405 / ルート不一致の扱い

- `CLAUDE.md` §4 のエラーテーブルは `400`/`401`/`403`/`404`/`409`/`500` のみを定義する。
  `HttpRequestMethodNotSupportedException`（存在しないメソッド）・`NoHandlerFoundException`
  （存在しないパス）は **`404`** に丸め、`405` は使わない（ステータス体系を増やさない）。

---

## 2. `GlobalExceptionHandler`（`@RestControllerAdvice`）

### 2.1 応答の組み立て

`ApiError`（02-api §2.4 の JSON 契約に対応する DTO、方針レベル）:

```java
record ApiError(String code, String message, String traceId, List<FieldError> errors) {}
record FieldError(String field, String message) {}
```

- `errors` は `null`（バリデーション以外は JSON に出さない、`@JsonInclude(NON_NULL)`）。
- `traceId` は MDC から取得（§4）。

### 2.2 ハンドラ一覧とログレベル

| 対象例外 | HTTP | ログレベル | ログに残す内容 |
|---|---|---|---|
| `MethodArgumentNotValidException` / `ConstraintViolationException`（Bean Validation） | `400` | `WARN` | パス・違反フィールド数（値そのものは機密の可能性があるため出さない） |
| `HttpMessageNotReadableException`（不正 JSON 等） | `400` | `WARN` | パス・原因クラス名 |
| `ResourceNotFoundException` | `404` | `WARN` | 対象種別・ID |
| `HttpRequestMethodNotSupportedException` / `NoHandlerFoundException` | `404` | `WARN` | メソッド・パス |
| `DuplicateHostnameException` | `409` | `WARN` | 対象ホスト名（機密情報だが調査に必要な最小限、requirements §10.1.11） |
| `DataIntegrityViolationException` | `409` | `WARN` | 制約名（分かれば）・SQL State |
| `org.seasar.doma.jdbc.OptimisticLockException` | `409` | `WARN` | 対象種別・ID |
| その他すべて `Exception` | `500` | `ERROR`（スタックトレース含む） | 例外クラス名・メッセージ・スタックトレース（**ユーザーには返さない**、requirements §10.1.12） |

- `401`/`403` は Spring Security 層（`AuthenticationEntryPoint` 等、[04-security §3.2](04-security.md)）で
  完結し、`GlobalExceptionHandler` の管轄外（フィルタチェーンは `DispatcherServlet` より前段のため）。
  ただし応答 JSON の形（`ApiError`）は共通のビルダーを再利用し、表記ゆれを防ぐ。
- `WARN` は「クライアント起因・想定内」、`ERROR` は「サーバー起因・想定外」の区別（requirements §10.5）。

---

## 3. エラーコード（暫定集合）

[open-issues Q3](../../requirements/open-issues.md)（コード体系の命名規則・追加ルールの正式化）は
**Phase 3** で確定する。本書では MVP のハンドラが実際に返す最小集合を暫定的に定義し、
実装が止まらないようにする。

| `code` | HTTP | 用途 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Bean Validation 違反、不正なリクエスト形式 |
| `RESOURCE_NOT_FOUND` | 404 | 対象不存在・削除済み・不正ルート |
| `DUPLICATE_HOSTNAME` | 409 | ホスト名重複（事前チェック・DB 制約とも同一コード） |
| `OPTIMISTIC_LOCK_CONFLICT` | 409 | `version` 不一致 |
| `AUTH_REQUIRED` | 401 | 未認証（`AuthenticationEntryPoint`） |
| `AUTH_BAD_CREDENTIALS` | 401 | ログイン失敗（`AuthenticationFailureHandler`） |
| `INTERNAL_ERROR` | 500 | 想定外エラー全般 |

Phase 3 でこの集合を正式化し、機能追加に伴うコード追加ルール（命名規則・重複防止・一覧管理場所）を定める。

---

## 4. `traceId` とログ設計

### 4.1 採番と伝播

- `common/web` に単一の `RequestLoggingFilter`（Servlet `Filter`）を置く。責務は 2 つ：
  1. リクエスト受付時に `traceId`（UUID）を採番し `MDC` に `traceId` キーで格納。レスポンスヘッダ
     `X-Trace-Id` にも設定する（画面の `traceId` 表示以外に、サポート時の突き合わせを容易にするため）。
  2. `finally` で「メソッド・パス・ステータス・所要時間・`traceId`・（あれば）ユーザー識別子」を
     1 行ログ出力し（requirements §10.5「リクエストログ」）、**最後に `MDC.clear()`**（スレッドプール
     再利用時の漏洩防止）。
- **登録順序**: Spring Security の `FilterChainProxy` より前段で動く必要がある（401 になった
  リクエストにも `traceId` を残すため）。`FilterRegistrationBean` の順序を
  `SecurityProperties.DEFAULT_FILTER_ORDER`（既定 -100）より小さい値に明示的に設定する
  （[01-architecture §2.1](01-architecture.md) の「Filter → Security」の順を実現）。
- リクエスト/レスポンスボディは**全文ダンプしない**（requirements §10.1.11）。ログに残すのは
  メタ情報（メソッド・パス・ステータス・所要時間）のみ。

### 4.2 構造化ログ

- **Spring Boot 標準の Structured Logging**（JSON 出力）を使い、専用ライブラリ（Logstash encoder 等）
  を追加しない（依存を増やさない、`CLAUDE.md` §4「技術的負債を増やす実装を安易に選ばない」）。
  具体的なフォーマット（ECS 系等）と設定キーは Phase 5 の実装時に Spring Boot 4.1 の対応状況を
  確認して確定する。
- 出力するフィールドは requirements §10.5 に準拠：`timestamp` / `level` / `logger` / `message` /
  `traceId`（MDC 経由で自動付与）/（あれば）ユーザー識別子。
- ログレベルの使い分け（`ERROR`/`WARN`/`INFO`/`DEBUG`）は requirements §10.5 のまま。本書では
  「どの例外がどのレベルか」を §2.2 で具体化した。

### 4.3 業務イベントログ（`INFO`）

- ログイン結果は 04-security（`AuthenticationSuccessHandler`/`FailureHandler`）で記録（requirements §10.1.2）。
- サーバーの登録・更新・削除、メンテナンス履歴の登録は Service 層で 1 行の `INFO` ログを出す
  （「重要な業務イベント」、requirements §10.5）。内容は「操作種別・対象種別・対象 ID・結果」に限り、
  機密情報（ホスト名等の値そのもの）は含めない（IDは機密情報ではない、requirements §10.1.11「値そのものより ID を優先」）。

---

## 5. トランザクション方針

### 5.1 境界は Service 層に統一

- `@Transactional` は **すべて Service の public メソッド**に付与する（`CLAUDE.md` §3）。Controller・DAO には付けない。
- **読み取り専用**（一覧・詳細・サジェスト・ダッシュボード集計）は `@Transactional(readOnly = true)`。
- **更新系**（登録・編集・削除）は既定の `@Transactional`（書き込み）。
- 単一 DAO 呼び出ししかない更新（例: メンテナンス履歴登録 FR-MNT-02）にも一律で付与する
  （将来の複数テーブル化・チェック追加に強くする。過剰設計ではなく「境界を Service に統一する」
  という単純なルールの一貫適用）。

### 5.2 ロールバック

- 業務例外はすべて非チェック例外（§1.1）のため、Spring の既定（unchecked → rollback）に任せる。
  `@Transactional(rollbackFor = ...)` を個別に書かない（ルールの単純化、書き漏れ防止）。
- 複数 DAO を跨ぐ更新（サーバー登録/編集 + `server_tags`、FR-SRV-04/05/06）は同一トランザクション内で
  実行し、途中で例外が起きれば全体がロールバックする（`CLAUDE.md` §3、requirements §10.3）。

### 5.3 DB エラー時の変換

- Spring の例外変換（`DataAccessException` 系）に任せる。個別の SQL 例外を Service で catch して
  握り潰さない（`CLAUDE.md` §4「例外の握り潰しをしない」）。
- 一意制約違反 → `409`（§1.3）。それ以外の DB アクセス例外（接続断等）→ `500`（requirements §10.3）。

---

## 6. この文書で確定した事項

| ID | 事項 | 根拠 |
|---|---|---|
| D-XCUT-01 | 業務例外はすべて非チェック例外。`rollbackFor` を書かない | `@Transactional` の既定挙動に統一、実装の単純化 |
| D-XCUT-02 | 楽観ロック競合は Doma の `OptimisticLockException` をそのまま `409` にマッピング（自前の事前 `SELECT` 比較をしない） | `CLAUDE.md` §3「Doma の思想を尊重する」 |
| D-XCUT-03 | ホスト名重複は Service 事前チェック（主経路）+ DB 制約違反変換（安全網）の二段構え、いずれも `409` | requirements §10.1.1 多層防御 |
| D-XCUT-04 | `405`/ルート不一致は `404` に丸め、`CLAUDE.md` §4 のステータス集合を増やさない | ステータス体系の単純化 |
| D-XCUT-05 | `traceId` 採番・MDC 設定・1 行リクエストログを単一の `RequestLoggingFilter` に集約し、Security フィルタより前段で実行 | 401 も `traceId` を持たせるため |
| D-XCUT-06 | 構造化ログは Spring Boot 標準機能を使い、追加ライブラリを入れない | 依存を増やさない |
| D-XCUT-07 | `@Transactional` は Service の全 public メソッドに一律付与（読み取りは `readOnly=true`） | 境界の一貫性、`CLAUDE.md` §3 |
| D-XCUT-08 | エラーコードの暫定集合（§3）を MVP 実装用に定義。命名規則の正式化は Phase 3（Q3） | 実装を止めない |

- Bean の実クラス名・単体/結合テストのシナリオ、Structured Logging の具体設定は **Phase 3 / 5**。
