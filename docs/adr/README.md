# ADR (Architecture Decision Record)

設計上の意思決定を 1 決定 = 1 ファイルで記録する。

- ファイル名: `NNNN-<英語ケバブケース>.md`（連番はゼロ埋め 4 桁）
- ステータス: `Proposed` / `Accepted` / `Superseded by ADR-XXXX` / `Deprecated`
- 決定を変更する場合は既存 ADR を書き換えず、新しい ADR を追加して旧 ADR に `Superseded` を追記する。

| # | タイトル | ステータス |
|---|---|---|
| [0001](0001-backend-technology-versions.md) | Backend の技術スタックとバージョン確定 | Accepted |
