# initdb

このディレクトリは PostgreSQL コンテナの `/docker-entrypoint-initdb.d` にマウントされる。

- ここに置いた `*.sql` / `*.sh` は **データディレクトリが空の初回起動時のみ**、
  ファイル名の昇順で自動実行される。
- **アプリのスキーマ（テーブル等）は Flyway で管理する。** ここには書かない。
- ここに置くのは Flyway 実行より前に必要なもの限定：
  - PostgreSQL 拡張の有効化（例: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`）
  - アプリ用の低権限ロール作成（将来、接続ユーザーを分離する場合）
  - データベースレベルの設定

初回起動後に内容を変更しても再実行されない。反映するにはボリュームごと破棄する：

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml down -v
```
