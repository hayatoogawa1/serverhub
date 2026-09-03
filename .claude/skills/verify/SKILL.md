---
name: verify
description: 変更を「完了」と判断する前に実行する検証手順。Backend / Frontend で何をどこまで確認するかを定義する。CLAUDE.md「テストなしで機能完成と判断しない」の運用。
---

# verify — 完了前の検証

コードを変更したら、影響のある側について以下を実行し、**すべて green** を確認してから
完了扱いにする。落ちたらログを添えて報告する（握り潰さない）。

## Backend を変更したとき

```
make be-check          # = ./gradlew check（compile + spotlessCheck + test）
```

- `./gradlew test` は Testcontainers で PostgreSQL を起動するため Docker が必要。
  Docker が使えない環境では、その旨を明記し `./gradlew build -x test` までを確認する。
- 新しい振る舞いを追加/変更したのに対応するテストが無い場合は未完了。

## Frontend を変更したとき

```
make fe-check          # typecheck + lint + format:check + test
make fe-build          # 本番ビルドが通ること
```

- コンポーネント/hook/画面の変更は、観点（正常系・異常系・境界値）に照らしてテストを追加する。
- API 通信を伴う変更は MSW でモックしたテストを用意する。

## 両方に触れたとき

```
make check
```

## 報告に含めること

- 実行したコマンドと結果（pass / fail）
- スキップした検証と理由（例: Docker 不在で BE テスト未実行）
- 追加/変更したテストの概要
