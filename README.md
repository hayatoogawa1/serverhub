# ServerHub

インフラチーム向けのサーバー管理・運用支援ツール。

管理対象サーバーの情報とメンテナンス情報を一元管理し、検索・確認・更新・履歴確認などの
運用業務を効率化することを目的とする。ポートフォリオ用途も兼ねる。

> ⚠️ 本プロジェクトは開発初期（Phase 0: 開発環境・ルール整備）です。
> 記載内容は各フェーズの進行に伴い更新されます。`docs/` 配下の設計書も参照してください。

---

## 目次

- [技術スタック](#技術スタック)
- [リポジトリ構成](#リポジトリ構成)
- [開発環境セットアップ](#開発環境セットアップ)
- [よく使うコマンド](#よく使うコマンド)
- [開発ルール](#開発ルール)
- [ドキュメント](#ドキュメント)

---

## 技術スタック

| 層 | 技術 | バージョン |
|---|---|---|
| Backend | Java | 17 |
| | Spring Boot | 4.1.1 |
| | Spring Security | 7.x（Spring Boot 4.1.1 同梱） |
| | Doma | doma-processor 3.11.1 / doma-spring-boot-starter 3.0.0 |
| | Flyway | Spring Boot 管理バージョン（`spring-boot-starter-flyway` + `flyway-database-postgresql`） |
| | springdoc-openapi | 3.1.0（`springdoc-openapi-starter-webmvc-ui`） |
| | PostgreSQL | 16 |
| ビルド | Gradle（Kotlin DSL）＋ Wrapper | 8.14.5 |
| Frontend | React | 18 |
| | TypeScript | 5.x |
| | Vite | 5.x |
| | MUI | 5.x |
| | React Router | 6.x |
| | Axios | 1.x |
| | TanStack Query | 5.x |
| | グラフ | Recharts（候補・未確定） |
| テスト(BE) | JUnit 5 / AssertJ / Mockito / Testcontainers | - |
| テスト(FE) | Vitest / React Testing Library / MSW | - |
| コンテナ | Docker / Docker Compose | - |
| クラウド | AWS（Phase 9 で詳細化） | - |

> バージョン選定の根拠は [docs/adr/](docs/adr/)（Architecture Decision Record）に記録する。

---

## リポジトリ構成

```
serverhub/
├── backend/      Spring Boot アプリケーション（Gradle Wrapper 同梱）
│   └── src/main/resources/db/migration/   Flyway マイグレーション SQL
├── frontend/     React + Vite アプリケーション
├── infra/
│   └── docker/   開発用 docker-compose（PostgreSQL 等）
├── docs/
│   ├── requirements/  要件定義（Phase 1）
│   ├── design/basic/  基本設計（Phase 2）
│   ├── design/detail/ 詳細設計（Phase 3）
│   ├── db/            DB 設計（Phase 4）
│   └── adr/           設計判断ログ
├── .claude/      Claude Code 設定（hooks / skills）
├── .env.example  環境変数のテンプレート（実値は書かない）
├── CLAUDE.md     Claude Code / 開発者向けのプロジェクト規約
└── README.md
```

---

## 開発環境セットアップ

### 前提ツール

| ツール | バージョン | 導入方法 |
|---|---|---|
| Java | 17 | sdkman 等（`java -version` で確認） |
| Node.js | 20 以上 | `.nvmrc` に準拠 |
| Docker Desktop | - | **WSL 2 統合を有効化**（Windows + WSL の場合） |

#### Docker Desktop の WSL 2 統合（Windows + WSL 環境）

1. Docker Desktop → Settings → Resources → WSL Integration
2. 使用中の WSL ディストロのトグルを ON → Apply & Restart
3. WSL を再起動し、以下が通ることを確認：

   ```bash
   docker version
   docker compose version
   ```

### セットアップ手順

> 🚧 Phase 0 進行中。Backend/Frontend は各コンポーネント追加時に追記する。

すべてリポジトリルートで実行する。

```bash
# 1. リポジトリ取得
git clone https://github.com/<owner>/serverhub.git serverhub && cd serverhub

# 2. 環境変数ファイルを作成（.env は Git 管理外）
cp .env.example .env
#   → .env を編集。ローカルに別の PostgreSQL が動いている場合は DB_PORT を変更する。

# 3. 開発用 DB 起動
docker compose --env-file .env -f infra/docker/docker-compose.yml up -d
#   起動確認（healthy になるまで待つ）:
docker compose --env-file .env -f infra/docker/docker-compose.yml ps

# 4. Backend 起動（DB が起動している前提）
cd backend && ./gradlew bootRun
#   http://localhost:8080/actuator/health   → {"status":"UP"}
#   http://localhost:8080/swagger-ui.html   → API ドキュメント
cd ..

# 5. Frontend 起動（Phase 0-4 以降）
#   cd frontend && npm ci && npm run dev
```

> `--env-file .env` を必ず付ける。`-f` で compose ファイルを指定すると `.env` の
> 探索先が `infra/docker/` になり、ルートの `.env` が読まれないため。

> Backend は `.env` を直接読まない。既定値（`localhost:5432` / `serverhub` / `changeme`）は
> `.env.example` と一致させてあるので、既定のまま `docker compose` を起動していれば
> `./gradlew bootRun` はそのまま繋がる。DB 接続情報を変えた場合は
> `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`
> を環境変数で渡す。

### DB の初期化

- **スキーマ（テーブル等）**: Flyway で管理する（Phase 4 以降。Backend 起動時に自動適用予定）。
- **初回起動時のみの初期化**（拡張の有効化・ロール作成など）: `infra/docker/initdb/` に
  `*.sql` / `*.sh` を置く。データボリュームが空のときだけ実行される。詳細は
  [infra/docker/initdb/README.md](infra/docker/initdb/README.md)。
- **シードデータ（ログインユーザー等）**: Flyway のシード用マイグレーションで投入予定（Phase 4〜5 で確定）。
- **DB を完全に作り直す**:

  ```bash
  docker compose --env-file .env -f infra/docker/docker-compose.yml down -v
  docker compose --env-file .env -f infra/docker/docker-compose.yml up -d
  ```

### DB への接続確認

```bash
docker exec -it serverhub-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
# または任意の GUI クライアントから localhost:${DB_PORT} へ接続
```

---

## よく使うコマンド

> 🚧 Backend/Frontend は各コンポーネント追加時に追記。すべてリポジトリルートで実行。
> `DC` は `docker compose --env-file .env -f infra/docker/docker-compose.yml` の略。

| 目的 | コマンド |
|---|---|
| DB 起動 | `$DC up -d` |
| DB 状態確認 | `$DC ps` |
| DB ログ | `$DC logs -f db` |
| DB 停止 | `$DC down` |
| DB 破棄（データ含む） | `$DC down -v` |
| DB へ psql 接続 | `docker exec -it serverhub-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"` |
| Backend 起動 | `cd backend && ./gradlew bootRun` |
| Backend ビルド | `cd backend && ./gradlew build` |
| Backend テスト | `cd backend && ./gradlew test`（Testcontainers を使うため Docker が必要） |
| Backend 静的検査＋テスト | `cd backend && ./gradlew check` |
| Frontend テスト | `cd frontend && npm run test` |

---

## 開発ルール

詳細は [CLAUDE.md](CLAUDE.md) を参照。要点：

- **ブランチ運用**: `main` への直接コミットは原則禁止。`feature/*` ブランチ → PR → 自己レビュー → `main` へマージ。
- **コミット**: 1 コミット 1 目的。小さく、意味のあるメッセージ。
- **設計とコードの同期**: コードを変更したら関連する `docs/` も更新する。
- **セキュリティ**: シークレットをコミットしない。`.env` は Git 管理外。

---

## ドキュメント

| ドキュメント | 場所 | フェーズ |
|---|---|---|
| 要件定義書 | [docs/requirements/](docs/requirements/) | Phase 1 |
| 基本設計書 | [docs/design/basic/](docs/design/basic/) | Phase 2 |
| 詳細設計書 | [docs/design/detail/](docs/design/detail/) | Phase 3 |
| DB 設計 | [docs/db/](docs/db/) | Phase 4 |
| ADR（設計判断ログ） | [docs/adr/](docs/adr/) | 随時 |
| API 仕様（Swagger UI） | `http://localhost:8080/swagger-ui.html`（起動後） | Phase 5 以降 |
