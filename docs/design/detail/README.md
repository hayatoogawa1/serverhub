# 詳細設計（Phase 3）

基本設計（[docs/design/basic/](../basic/) v1.0）を入力に、機能単位の Request/Response DTO・
Entity・DAO・SQL・バリデーション・エラーコードの正式化（Q3）を定義する。
物理 DB 設計（DDL・マイグレーション）は Phase 4、実装は Phase 5（Backend）/ Phase 6（Frontend）。

**現在: 00-overview のみ叩き台。文書構成・進め方はオーナーと相談中**（[00-overview §5](00-overview.md)）。

| # | ドキュメント | 内容 | 状態 |
|---|---|---|---|
| 00 | [00-overview.md](00-overview.md) | Phase 3 の位置づけ・入力・範囲・Q3・文書構成案 | 🚧 叩き台（要相談） |
| 01 | common（案） | 共通 DTO 実体・共通バリデーション・エラーコード正式化（Q3） | 未着手 |
| 02 | auth（案） | 認証系 DTO・ハンドラ詳細 | 未着手 |
| 03 | server（案、タグ同居） | サーバー Entity/DAO/SQL/DTO、タグ付け・サジェスト | 未着手 |
| 04 | maintenance（案） | メンテナンス履歴 Entity/DAO/SQL/DTO | 未着手 |
| 05 | dashboard（案） | 集計 DAO/SQL/DTO | 未着手 |

文書構成・番号・進め方は 00-overview のレビュー後に確定する。

## 進め方

Phase 1/2 と同じサイクル（叩き台 → 採用理由/メリデメ → レビュー → 修正 → 確定）。
確定に伴い `CLAUDE.md` の TODO と `docs/requirements/open-issues.md` を同 PR で更新する。
