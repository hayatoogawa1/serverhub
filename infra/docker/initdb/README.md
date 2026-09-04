# initdb

このディレクトリは PostgreSQL コンテナの `/docker-entrypoint-initdb.d` にマウントされる。

- ここに置いた `*.sql` / `*.sh` は **データディレクトリが空の初回起動時のみ**、
  ファイル名の昇順で自動実行される。
- **アプリのスキーマ（テーブル等）は Flyway で管理する。** ここには書かない。

## ファイル

| ファイル | 役割 |
|---|---|
| `01_seed.sql` | オフラインデモ用のダミーシードデータ（ユーザー・サーバー・タグ・履歴） |

## `01_seed.sql` の実行タイミング

Flyway より前に自動実行されるとテーブルが無いため、`01_seed.sql` は
**スキーマが存在するときだけ INSERT する**ガード（`\if`）を持つ。

1. `make db-up`（初回）→ 自動実行されるが**スキーマ未適用なので何もしない**
2. `make be-run`（アプリ起動 = Flyway 適用）
3. `make db-seed` → `01_seed.sql` を `psql` で流し込み、ダミーデータが投入される（冪等）

`make db-reset` はデータを破棄するので、その後は 2〜3 をやり直す。

## その他ここに置いてよいもの

- PostgreSQL 拡張の有効化（例: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`）
- アプリ用の低権限ロール作成（Phase 4〜5、接続ユーザーを分離する場合。requirements S1）
