# 05. ダッシュボード（詳細設計）

- バージョン: 1.0（ドラフト・レビュー待ち）
- 最終更新: 2026-09-05
- 対応: FR-DASH-01 / BR-01・09 / Q4 / F5 / UC-13 / [01-common](01-common.md) /
  [03-server](03-server.md)・[04-maintenance](04-maintenance.md)（enum・依存パターンを踏襲） /
  [02-api §3.5](../basic/02-api.md)

`dashboard` パッケージ。集計専用の**読み取り機能**であり、`server`/`maintenance` の enum 型に
依存する（§4、D-DASH-02）。Phase 3 の最後の文書（00-overview §5 の構成）。

---

## 1. DAO（`DashboardDao`）

集計は requirements §10.2.2（N+1 回避）に従い、**1 セクション 1 クエリ**（計 5 クエリ）で取得する。
ループ内クエリは書かない。

| メソッド | 概要 | SQL ファイル |
|---|---|---|
| `long selectTotalServers()` | `deleted_at IS NULL` の総数 | `selectTotalServers.sql` |
| `List<EnvironmentCount> selectServerCountByEnvironment()` | 環境区分別 `GROUP BY`（値が 0 件の区分は行が返らない） | `selectServerCountByEnvironment.sql` |
| `List<StatusCount> selectServerCountByStatus()` | ステータス別 `GROUP BY`（同上） | `selectServerCountByStatus.sql` |
| `List<TagCount> selectServerCountByTag()` | タグ別 `GROUP BY`、件数降順。**全件**返す（上位 10 件への切り出しは Service、§2） | `selectServerCountByTag.sql` |
| `List<RecentMaintenanceRow> selectRecentMaintenance(int limit)` | 直近のメンテナンス。`servers` と **`INNER JOIN` かつ `deleted_at IS NULL`**（BR-09、§3） | `selectRecentMaintenance.sql` |

- `EnvironmentCount(Environment environment, long count)` / `StatusCount(Status status, long count)` /
  `TagCount(String tagName, long count)` / `RecentMaintenanceRow(Long id, Long serverId,
  String serverHostname, LocalDate performedDate, MaintenanceType type)` は DAO 専用の集計行
  record（`dashboard` パッケージ内、Entity ではない。[03-server §3.3](03-server.md) の
  `ServerTagRow` と同じ考え方）。
- `selectServerCountByTag` は `server_tags`/`servers`（`deleted_at IS NULL`）/`tags` の JOIN + `GROUP BY`。
  0 件のタグは（`tags` に存在しても）返さない（表示する意味がないため）。

---

## 2. 0 件区分の補完・上位 N 件（Service 層、D-DASH-01）

- **環境区分・ステータスは 3 区分すべてを 0 件表示する**（requirements FR-DASH-01）。DAO は
  値がある区分しか返さないため、Service が `Environment.values()`/`Status.values()`
  （＝enum 定義そのものが「全区分」の唯一の情報源）を回し、DAO の結果とマージして
  欠けている区分を `count=0` で補う。**SQL 側で `UNION`/`VALUES` を使って全区分を作らない**
  （enum の定義とクエリ文字列で「全区分」を二重管理しない）。
- **タグは上位 10 件 + 「その他」**（F5）。`selectServerCountByTag` は全件を件数降順で返し、
  Service が先頭 10 件を `topTags`、11 件目以降の件数合計を `otherTagsCount` とする。
  **SQL 側で `LIMIT` + 別クエリの `SUM` に分けない**（1 クエリで完結させ、切り出しは Java 側の
  単純なリスト操作にする）。

---

## 3. 「直近のメンテナンス」は削除済みサーバーを除外する（D-DASH-03）

[04-maintenance](04-maintenance.md) の**全体一覧**は削除済みサーバーの履歴も表示する（F4、
行にその旨を示す）が、**ダッシュボードは対象から除外**する（BR-09「ただしダッシュボードの
集計対象からは除外」）。実装は `selectRecentMaintenance` の JOIN 条件で
`servers.deleted_at IS NULL` を課すことで表現し、04-maintenance の
`MaintenanceHistorySummaryResponse`（`serverDeleted` フラグを持つ）は再利用しない。
`RecentMaintenanceItem`（§4）は常に非削除サーバーのみを指すため、そのフラグ自体が不要。

---

## 4. Response DTO

```java
public record DashboardSummaryResponse(
    long totalServers,
    List<EnvironmentCount> serversByEnvironment,   // 常に3件（0件補完済み、declare順）
    List<StatusCount> serversByStatus,             // 常に3件（同上）
    List<TagCount> topTags,                        // 最大10件、件数降順
    long otherTagsCount,                            // 11位以降の件数合計（0の場合もそのまま返す）
    List<RecentMaintenanceItem> recentMaintenanceHistories // 直近10件（Q4）
) {
  public record EnvironmentCount(Environment environment, long count) {}
  public record StatusCount(Status status, long count) {}
  public record TagCount(String tagName, long count) {}
  public record RecentMaintenanceItem(
      Long id, Long serverId, String serverHostname, LocalDate performedDate, MaintenanceType type
  ) {}
}
```

- `Environment`/`Status` は [03-server](03-server.md) の enum（`value()`/`fromValue()` による
  JSON 小文字変換、D-SRV-01）を再利用する。`MaintenanceType` は
  [04-maintenance §1](04-maintenance.md) の enum を再利用する。
- **D-DASH-02**: `dashboard` パッケージは `server`/`maintenance` の enum 型に依存してよい
  （型を再定義しない）。ダッシュボードは本質的に他機能のデータを横断集計する読み取り専用機能で
  あり、[03-server](03-server.md) D-SRV-04 が避けた「レスポンス DTO への埋め込み依存」とは
  異なる（enum のような安定した値型への依存は軽い結合として許容する）。
- グラフ用の系列データ（Recharts、06-ui D-UI-01）は Frontend がこの配列をそのまま
  `dataKey`/`nameKey` にマッピングして描画する（追加の集計専用フィールドは持たない）。

---

## 5. 業務ルール・要件の実装配置

| 項目 | 内容 | 実装配置 |
|---|---|---|
| BR-01 | 集計対象は `deleted_at IS NULL` のサーバーのみ | 全 `DashboardDao` メソッドの SQL に固定条件 |
| BR-09 | 削除済みサーバーのメンテナンス履歴は集計（直近一覧）から除外 | `selectRecentMaintenance` の JOIN 条件（§3） |
| Q4 | 最近のメンテナンスは直近 10 件 | `selectRecentMaintenance(10)`（Controller/Service で固定値。クエリパラメータ化しない） |
| F5 | タグ別は上位 10 件 + その他 | Service 側で分割（§2） |
| requirements §10.2.2 | 集計は N+1 を避け集計クエリで取得 | §1 のとおり 1 セクション 1 クエリ |

---

## 6. エラーケース一覧

`GET /dashboard/summary` は入力パラメータを持たない。`401`（未認証）以外の業務エラーはない。
データ 0 件でも `200` + 0 埋めのレスポンスで成立する（requirements FR-DASH-01）。

---

## 7. この文書で追加・確定した事項

| ID | 事項 | 根拠 |
|---|---|---|
| D-DASH-01 | 0 件区分の補完・上位10件+その他の切り出しは SQL でなく Service（Java）側で行う | enum 定義を「全区分」の唯一の情報源にする、SQL を複雑にしない |
| D-DASH-02 | `dashboard` は `server`/`maintenance` の enum 型への依存を許容する（DTO への依存とは区別） | 集計機能の性質上、安定した値型への依存は軽い結合 |
| D-DASH-03 | 「直近のメンテナンス」は削除済みサーバーを除外（フラグ付きで見せるのではなく JOIN で除外）。04-maintenance の一覧 DTO は再利用しない | BR-09、04-maintenance の全体一覧（F4）との役割の違いを型で表現 |

Phase 3 詳細設計はこの文書で最後（00-overview §5）。SQL ファイルの正確な列名は Phase 4 で最終化する。
