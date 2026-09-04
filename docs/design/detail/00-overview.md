# 00. 詳細設計 概要

- バージョン: 1.0（確定）
- 最終更新: 2026-09-04

Phase 3（詳細設計）の位置づけ・入力・扱う範囲・残る未決事項（Q3）・文書構成をまとめる。
文書構成・進め方はオーナー確認済み（2026-09-04、§5）。

---

## 1. 本書群の位置づけ

| フェーズ | 扱う内容 | 場所 |
|---|---|---|
| Phase 1 要件定義 | 何を作るか | `docs/requirements/` |
| Phase 2 基本設計 | どう作るか（構成・API 契約・論理データ・非機能の設計・画面設計） | `docs/design/basic/` |
| **Phase 3 詳細設計（本書群）** | 機能単位の Request/Response DTO・Entity・DAO・SQL・バリデーション・エラーコードの正式化 | `docs/design/detail/` |
| Phase 4 DB 設計 | 物理スキーマ・DDL・Flyway マイグレーション・Index | `docs/db/` |

## 2. 入力（前提として従うもの）

- 要件定義書 [docs/requirements/requirements.md](../../requirements/requirements.md) v1.0
- 基本設計 [docs/design/basic/](../basic/) 00〜06（すべて v1.0 確定、PR #12〜#17）
  - 特に参照が多いもの：
    - [02-api](../basic/02-api.md)：エンドポイント一覧・レスポンス形式・命名規約（本書群はこれの DTO 実体を作る）
    - [03-data-model](../basic/03-data-model.md)：論理 ER・属性・Doma マッピング方針（本書群はこれの Entity/DAO/SQL 実体を作る）
    - [05-cross-cutting](../basic/05-cross-cutting.md)：例外体系・エラーコード暫定集合（本書群で正式化、Q3）
    - [04-security](../basic/04-security.md)：認証まわりの DTO・ハンドラの詳細
  - ADR [0001](../../adr/0001-backend-technology-versions.md)（Doma / Bean Validation の版）

## 3. Phase 3 で扱う範囲・扱わない範囲

**扱う（本書群で確定する）**:

- 機能単位の **Entity**（フィールド・Doma アノテーション方針・enum マッピング）
- **DAO**（メソッドシグネチャ・対応する外部 SQL ファイルの一覧・Doma の SQL コメント条件の使い方）
- **Request / Response DTO**（フィールド・型・Bean Validation アノテーション・02-api の JSON 契約との対応）
- 機能固有のバリデーション・業務ルールの実装配置（BR-xx がどのレイヤのどこで担保されるか）
- 機能固有のエラーケース一覧（400/404/409 の具体的な発生条件、05-cross-cutting の例外体系との対応）
- **エラーコード体系の正式化**（Q3）：命名規則・コード追加時のルール・一覧の管理場所

**扱わない（他フェーズ）**:

- 物理カラム型・長さ・`CHECK` 制約式・Index・Flyway マイグレーションファイルの実体 → **Phase 4**
- Java/TypeScript の実コード・単体/結合テストコード → **Phase 5（Backend）/ Phase 6（Frontend）**
- Frontend の Props・具体的なフォーム実装（react-hook-form 等の採否含む） → 06-ui で Phase 3/6 に送られた事項。
  必要ならこの詳細設計内で軽く触れるが、本体は Frontend 実装フェーズ

## 4. 残る未決事項：Q3（エラーコード体系）

[open-issues Q3](../../requirements/open-issues.md) の対象。05-cross-cutting §3 の暫定集合
（`VALIDATION_ERROR` / `RESOURCE_NOT_FOUND` / `DUPLICATE_HOSTNAME` / `OPTIMISTIC_LOCK_CONFLICT` /
`AUTH_REQUIRED` / `AUTH_BAD_CREDENTIALS` / `INTERNAL_ERROR`）を土台に、Phase 3 で機能横断の
命名規則（プレフィックスの要否、複数形/単数形、追加時のレビュー観点）と全コードの一覧管理場所
（本書群内の 1 文書に集約する想定）を確定する。

## 5. 文書構成（確定、2026-09-04 オーナー承認）

機能単位で切る。認証は他機能と依存が薄く独立、タグは単独の CRUD API を持たず
サーバー登録/編集の一部（FR-TAG-01）+ サジェスト（FR-TAG-02）のみのため、
**タグはサーバーの文書に同居**させる。

| # | ドキュメント | 内容 | 対応 FR | 状態 |
|---|---|---|---|---|
| 00 | overview（本書） | 位置づけ・入力・進め方・Q3 | — | ✅ 確定 |
| 01 | common | 共通 DTO 実体（`PageRequest`/`PageResponse`/`ApiError`/`FieldError`）、共通バリデーション実装パターン（ソートホワイトリスト・IP/ホスト名バリデータ選定）、**エラーコード正式化（Q3）** | 横断 | 次に着手 |
| 02 | auth | ログイン/ログアウト/現在ユーザーの DTO、`UserDetailsService`、成功/失敗ハンドラの詳細 | FR-AUTH-01〜03 | 未着手 |
| 03 | server（タグ同居） | `Server`/`Tag` Entity、DAO・SQL、登録/編集/削除/検索の Request/Response DTO、タグ付け・サジェスト | FR-SRV-01〜06、FR-TAG-01/02 | 未着手 |
| 04 | maintenance | `MaintenanceHistory` Entity、DAO・SQL、一覧/登録の DTO | FR-MNT-01〜03 | 未着手 |
| 05 | dashboard | 集計 DAO・SQL（GROUP BY・上位 N 件+その他の実装方針）、Response DTO | FR-DASH-01 | 未着手 |

**進め方**: Phase 2 と同じ「1 文書 = 1 ブランチ = 1 PR」。**01-common を最初に固め**、`ApiError`/
エラーコード/共通 DTO を 02 以降の前提にする。02〜05 の順序は依存が薄いため着手順は問わない。

**記述粒度**: Entity のフィールド列挙・DAO メソッドシグネチャ・DTO 定義まで書き、
Phase 5 実装時にコードへ機械的に落とせる程度を目安にする（オーナー確認済み）。

## 6. 記述テンプレート（機能文書 1 本あたりの想定構成）

02〜05 の各文書は以下の型で揃える想定（03-data-model / 02-api の言葉を再利用し、重複記載は避ける）：

1. 対応する FR / BR / UC / D-XXX（トレーサビリティ）
2. Entity（フィールド、Doma アノテーション方針、03-data-model からの参照）
3. DAO（メソッド一覧、対応する外部 SQL ファイル名、Doma の動的条件の使い方）
4. Request / Response DTO（フィールド、Bean Validation、02-api の JSON 例との対応）
5. 業務ルール・バリデーションの実装配置（BR-xx → Controller/Service/DAO/DB のどこで担保するか）
6. エラーケース一覧（この機能固有の 400/404/409 の発生条件、05-cross-cutting の例外クラスとの対応）
7. この文書で追加・確定した事項（D-DETAIL-xx）
