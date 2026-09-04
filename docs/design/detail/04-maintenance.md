# 04. メンテナンス履歴（詳細設計）

- バージョン: 1.0（ドラフト・レビュー待ち）
- 最終更新: 2026-09-05
- 対応: FR-MNT-01〜03 / BR-06・09・10 / F4・F5 / UC-10〜12 /
  [01-common](01-common.md) / [02-auth](02-auth.md)・[03-server](03-server.md)（Entity/DAO パターンを踏襲） /
  [02-api §3.4](../basic/02-api.md) / [03-data-model](../basic/03-data-model.md)

`maintenance` パッケージ。**サーバーの存在確認のため `server` パッケージの `ServerDao` に依存する**
（[03-server](03-server.md) D-SRV-04 とは逆方向。あちらは「埋め込みをやめて疎結合にした」判断、
こちらは「対象サーバーの存在確認」という業務ルール上必須の依存であり性質が異なる、§4 参照）。

---

## 1. Entity

```java
@Entity(immutable = true)
public record MaintenanceHistory(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    Long serverId,
    LocalDate performedDate,
    MaintenanceType type,
    String worker,
    String content,
    String impact,
    String result,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime deletedAt
) {}

public enum MaintenanceType {
  PATCH("patch"), CONFIG("config"), HARDWARE("hardware"), OTHER("other");
  // value()/fromValue() は 03-server D-SRV-01 と同じパターン
}
```

- immutable record（[02-auth](02-auth.md) D-AUTH-01）。`EntityListener` で `createdAt`/`updatedAt` を
  自動設定（[01-common §4](01-common.md) D-DETAIL-05）。
- `deletedAt` は**スキーマ上のみ**（[03-data-model §2.1](../basic/03-data-model.md)）。MVP では
  この列を更新する API を一切持たない（BR-06、値は常に `NULL`）。
- `@Version` は持たない（履歴は追記のみ、更新 API がないため楽観ロック不要）。

---

## 2. DAO（`MaintenanceHistoryDao`）

| メソッド | 概要 | SQL ファイル |
|---|---|---|
| `List<MaintenanceHistoryListRow> selectList(MaintenanceHistorySearchCriteria c, PageRequest p, MaintenanceSortKey sort, SortDirection order)` | 全サーバー横断の一覧（FR-MNT-01）。`servers` と JOIN しホスト名・削除有無を取得 | `selectList.sql` |
| `long selectCount(MaintenanceHistorySearchCriteria c)` | 総件数 | `selectCount.sql` |
| `List<MaintenanceHistory> selectByServerId(Long serverId, PageRequest p)` | 特定サーバーの履歴（FR-MNT-03、実施日降順） | `selectByServerId.sql` |
| `long selectCountByServerId(Long serverId)` | 特定サーバーの履歴件数（ページング用） | `selectCountByServerId.sql` |
| `MaintenanceHistory insert(MaintenanceHistory history)` | 登録（`EntityListener` が日時設定） | Doma 自動生成（`@Insert`） |

- `MaintenanceHistoryListRow(Long id, Long serverId, String serverHostname, boolean serverDeleted,
  LocalDate performedDate, MaintenanceType type, String worker)` は DAO 専用の集計行 record
  （Entity ではない、[03-server §3.3](03-server.md) の `ServerTagRow` と同じ考え方）。
- `selectList` は **`servers.deleted_at` で絞り込まない**（BR-09）。`serverDeleted` は
  `s.deleted_at is not null` を SELECT 句に含めて取得する（F4「削除済みである旨を示す」）。
- `selectByServerId` は呼び出し前に Service が対象サーバーの存在（`deleted_at IS NULL`）を
  確認済み（§4）であるため、SQL 側での存在チェックは不要。
- `MaintenanceSortKey { PERFORMED_DATE("performedDate"), CREATED_AT("createdAt") }`
  （既定 `PERFORMED_DATE` 降順、02-api §2.5）。ORDER BY の切り替え方式は
  [03-server §3.1](03-server.md) と同じ `/*%if*/` 分岐。

---

## 3. Request / Response DTO

### 3.1 リクエスト

```java
public record MaintenanceHistoryCreateRequest(
    @NotNull Long serverId,
    @NotNull LocalDate performedDate,       // 未来日チェックなし（F5/BR-10、@Future/@Past を付けない）
    @NotNull MaintenanceType type,
    @NotBlank @Size(max = 255) String worker,
    @NotBlank @Size(max = 2000) String content,
    @Size(max = 1000) String impact,
    @Size(max = 1000) String result
) {}
```

### 3.2 レスポンス（用途別に 2 種類、D-MNT-01）

```java
// 全体一覧（GET /maintenance-histories、FR-MNT-01）：サーバーを跨ぐため識別情報を含む。作業内容は含めない
public record MaintenanceHistorySummaryResponse(
    Long id, Long serverId, String serverHostname, boolean serverDeleted,
    LocalDate performedDate, MaintenanceType type, String worker
) {}

// サーバー詳細内の履歴・登録直後のレスポンス（FR-MNT-03、POST の 201 応答）：単一サーバーに閉じるため詳細項目を含む
public record MaintenanceHistoryDetailResponse(
    Long id, LocalDate performedDate, MaintenanceType type, String worker,
    String content, String impact, String result, LocalDateTime createdAt
) {}
```

- **D-MNT-01**: 一覧の用途によってレスポンス形を分ける。全体一覧（複数サーバーを横断）は
  「どのサーバーか」の識別が主目的で作業内容までは不要（requirements FR-MNT-01 の出力定義どおり）。
  サーバー詳細内の一覧は 1 サーバーに閉じており、`serverId`/`serverHostname` は既に画面側で
  分かっているため不要な代わりに作業内容が要る（requirements FR-MNT-03）。1 つの型で
  両方を賄って null 許容フィールドを増やすより、用途別の型で表現する方が読みやすい。

---

## 4. サーバー存在確認（依存の方向）

- **登録時**（FR-MNT-02）：Service が `server` パッケージの `ServerDao.selectActiveById(serverId)`
  を呼び、存在しない/削除済みなら `ResourceNotFoundException` → `404`（BR-06）。
- **`GET /servers/{id}/maintenance-histories`**（FR-MNT-03）：同様に `ServerDao.selectActiveById`
  で対象サーバーの存在を確認してから `MaintenanceHistoryDao.selectByServerId` を呼ぶ。
  **02-api の記述を明確化**（D-MNT-02）：「404（サーバー不存在）」を「404（サーバー不存在・
  削除済み）」とし、`GET /servers/{id}` 等の他のサブリソースと 404 の扱いを揃える。
- この依存（`maintenance` → `server`）は [03-server](03-server.md) D-SRV-04 が避けた依存
  （`server` → `maintenance`、詳細レスポンスへの履歴埋め込み）とは**逆方向かつ必須**：
  「メンテナンス履歴は必ず 1 台のサーバーに属し、対象サーバーの存在確認なしに登録できない」
  という業務ルール（BR-06）そのものであり、疎結合にして避けられる依存ではない。

---

## 5. 業務ルールの実装配置

| BR/F | 内容 | 実装配置 |
|---|---|---|
| BR-06 | 履歴は登録・参照のみ（編集・削除 API を作らない）。対象は `deleted_at IS NULL` のサーバーに限る | 編集/削除の Controller メソッド自体を実装しない。登録時は §4 のとおり `ServerDao` で存在確認 |
| BR-09 | 削除済みサーバーの履歴も一覧表示、ダッシュボード集計からは除外 | `selectList` は `servers.deleted_at` を条件にしない（集計側は [05-dashboard](05-dashboard.md) で別途絞り込み） |
| BR-10 | 実施日は利用者入力・未来日も許容。`created_at`/`updated_at` はシステム設定 | `performedDate` に日付範囲バリデーションを付けない。監査列は `EntityListener` |
| F4 | 削除済みサーバーの履歴に削除済みである旨を示す | `MaintenanceHistorySummaryResponse.serverDeleted`（Frontend がバッジ等で表示、06-ui） |
| F5 | 未来日許容 | BR-10 と同じ（バリデーションを追加しないことが実装） |

---

## 6. エラーケース一覧

| ケース | HTTP | `code` |
|---|---|---|
| Bean Validation 違反（必須未入力・文字数超過） | 400 | `VALIDATION_ERROR` |
| 未定義の `sort`/`order`（クエリ） | 400 | `VALIDATION_ERROR`（自動） |
| ID/`serverId` 形式不正 | 400 | `VALIDATION_ERROR` |
| 登録対象サーバーが不存在・削除済み | 404 | `RESOURCE_NOT_FOUND` |
| `GET /servers/{id}/maintenance-histories` の対象サーバーが不存在・削除済み | 404 | `RESOURCE_NOT_FOUND` |

`409` に相当するケースはない（一意制約・楽観ロックの対象外、追記のみのため）。

---

## 7. この文書で追加・確定した事項

| ID | 事項 | 根拠 |
|---|---|---|
| D-MNT-01 | 一覧レスポンスは用途別に 2 型（全体一覧=識別情報中心、サーバー内一覧=詳細項目中心） | requirements FR-MNT-01/03 の出力定義の違いをそのまま型にする |
| D-MNT-02 | `GET /servers/{id}/maintenance-histories` の 404 は「不存在・削除済み」に統一（02-api の記述を明確化） | 他のサブリソースとの一貫性 |
| D-MNT-03 | `maintenance` → `server`（`ServerDao` 参照）の依存を許容する。D-SRV-04 とは逆方向・必須の依存として区別 | BR-06 は対象サーバーの存在確認そのものが業務ルール |

- SQL ファイルの正確な列名は Phase 4（DB 物理設計）確定後に最終化する。
