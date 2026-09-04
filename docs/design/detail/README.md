# 詳細設計（Phase 3）

基本設計（[docs/design/basic/](../basic/) v1.0）を入力に、機能単位の Request/Response DTO・
Entity・DAO・SQL・バリデーション・エラーコードの正式化（Q3）を定義する。
物理 DB 設計（DDL・マイグレーション）は Phase 4、実装は Phase 5（Backend）/ Phase 6（Frontend）。

**文書構成・進め方は確定済み**（2026-09-04 オーナー承認、[00-overview §5](00-overview.md)）。

| # | ドキュメント | 内容 | 状態 |
|---|---|---|---|
| 00 | [00-overview.md](00-overview.md) | Phase 3 の位置づけ・入力・範囲・Q3・文書構成 | ✅ 確定（v1.0） |
| 01 | [01-common.md](01-common.md) | 共通 DTO 実体・共通バリデーション・エラーコード正式化（Q3） | ✅ 確定（v1.0、PR #20） |
| 02 | [02-auth.md](02-auth.md) | 認証系 Entity/DAO/DTO・ハンドラ詳細 | ✅ 確定（v1.0、PR #21） |
| 03 | [03-server.md](03-server.md) | サーバー・タグ Entity/DAO/SQL/DTO、タグ付け・サジェスト | 🚧 レビュー待ち（v1.0 ドラフト） |
| 04 | maintenance | メンテナンス履歴 Entity/DAO/SQL/DTO | 未着手 |
| 05 | dashboard | 集計 DAO/SQL/DTO | 未着手 |

## 進め方

Phase 1/2 と同じサイクル（叩き台 → 採用理由/メリデメ → レビュー → 修正 → 確定）。
確定に伴い `CLAUDE.md` の TODO と `docs/requirements/open-issues.md` を同 PR で更新する。
