# ServerHub

インフラチーム向けのサーバー管理・運用支援ツール。

管理対象サーバーの情報とメンテナンス情報を一元管理し、検索・確認・更新・履歴確認などの
運用業務を効率化することを目的とする。ポートフォリオ用途も兼ねる。

> 開発中（Phase 1 要件定義完了 → Phase 2 基本設計へ）。記載内容は各フェーズの進行に伴い更新されます。
> 要件は [docs/requirements/](docs/requirements/)、設計判断は [docs/adr/](docs/adr/) を参照。

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
| | PostgreSQL | Neon（クラウド、主）/ Docker `postgres:16-alpine`（ローカル・オフライン用） |
| ビルド | Gradle（Kotlin DSL）＋ Wrapper | 8.14.5 |
| Frontend | React | 19.2 |
| | TypeScript | 6.0.x |
| | Vite | 8.2 |
| | MUI | 9.4 |
| | React Router | 7.18 |
| | Axios | 1.x |
| | TanStack Query | 5.x |
| | Lint / Format | ESLint 10 flat + typescript-eslint / Prettier 3 |
| | Node.js | 24（`.nvmrc`、Active LTS） |
| | グラフ | Recharts（候補・未確定） |
| テスト(BE) | JUnit 5 / AssertJ / Mockito / Testcontainers 2.x | - |
| テスト(FE) | Vitest 4 / React Testing Library / MSW 2 / jsdom | - |
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
| Node.js | 24（Active LTS） | `.nvmrc` に準拠（`nvm install 24`） |
| Docker Desktop | - | **WSL 2 統合を有効化**（Windows + WSL の場合） |

#### Docker Desktop の WSL 2 統合（Windows + WSL 環境）

1. Docker Desktop → Settings → Resources → WSL Integration
2. 使用中の WSL ディストロのトグルを ON → Apply & Restart
3. WSL を再起動し、以下が通ることを確認：

   ```bash
   docker version
   docker compose version
   ```

### DB 構成（Neon / ローカル Docker）

DB は環境変数で接続先を切り替える（[docs/adr/0003](docs/adr/0003-database-neon-with-local-docker-fallback.md)）。

| 系統 | 用途 | 切り替え |
|---|---|---|
| **Neon**（クラウド PostgreSQL） | 通常開発・機能検証（DB ブランチ活用） | `.env` に `SPRING_PROFILES_ACTIVE=neon` と `SPRING_DATASOURCE_*`（`?sslmode=require` 付き URL）を設定 |
| **ローカル Docker**（`postgres:16-alpine`） | **既定**。オフラインデモ、CI、Neon を使わない場合 | 何も設定しない（`.env.example` のまま）。`make db-up` で起動 |

### セットアップ手順

> Backend/Frontend の実装は Phase 5〜6。

すべてリポジトリルートで実行する。

```bash
# 1. リポジトリ取得 & 初回セットアップ
git clone https://github.com/<owner>/serverhub.git serverhub && cd serverhub
make setup           # .env 作成 / git hooks 有効化 / フロント依存インストール

# 2. DB を用意する（どちらか）
#   2a. Neon を使う（通常）: .env の NEON ブロックを有効化し接続情報を設定
#   2b. ローカル Docker を使う（オフライン / 既定）:
make db-up
#      healthy 確認: docker compose --env-file .env -f infra/docker/docker-compose.yml ps

# 3. Backend 起動（.env の接続先を使用）
make be-run
#   http://localhost:8080/actuator/health   → {"status":"UP"}
#   http://localhost:8080/swagger-ui.html   → API ドキュメント

# 4. （ローカル Docker のみ）オフラインデモ用シードを投入
make db-seed
#   ログイン: admin@serverhub.local / password

# 5. Frontend 起動（Backend が起動している前提）
make fe-dev
#   http://localhost:5173   （/api リクエストは :8080 へプロキシ）
```

> Frontend の詳細は [frontend/README.md](frontend/README.md)。Node は `.nvmrc`（24）。

> Backend は `make be-run` 経由だと `.env` を読み込んでから起動する。直接
> `./gradlew bootRun` する場合は `SPRING_DATASOURCE_*` を自分でエクスポートする。
> 何も設定しなければ `application.yml` の既定値（`localhost:5432` / `serverhub` / `changeme`、
> `.env.example` と一致）でローカル Docker に繋がる。

### DB の初期化

- **スキーマ（テーブル等）**: Flyway で管理する（Neon / ローカルとも同じ。Backend 起動時に自動適用予定）。
- **オフラインデモ用シードデータ**（デモユーザー・サーバー・タグ・履歴）:
  `infra/docker/initdb/01_seed.sql`。Flyway 適用後に `make db-seed` で投入する（冪等）。
  詳細は [infra/docker/initdb/README.md](infra/docker/initdb/README.md)。
- **Flyway 以前に必要な初期化**（拡張・低権限ロール等）: `infra/docker/initdb/` に `*.sql` を追加。
- **ローカル DB を完全に作り直す**: `make db-reset` → その後 `make be-run` → `make db-seed`。

### DB への接続確認

```bash
docker exec -it serverhub-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
# または任意の GUI クライアントから localhost:${DB_PORT} へ接続
```

---

## よく使うコマンド

すべてリポジトリルートから `make <target>`。`make help` で一覧。

| 目的 | コマンド | 生のコマンド |
|---|---|---|
| 初回セットアップ | `make setup` | `.env` 作成 + git hooks 有効化 + `npm ci` |
| ローカル DB 起動 / 停止 / 作り直し | `make db-up` / `make db-down` / `make db-reset` | `docker compose --env-file .env -f infra/docker/docker-compose.yml ...` |
| オフラインデモ用シード投入 | `make db-seed` | `psql < infra/docker/initdb/01_seed.sql`（Flyway 適用後） |
| オフラインデモ準備（手順表示） | `make demo` | `db-up` + 手順の案内 |
| DB へ psql 接続 | `make db-psql` | `docker exec -it serverhub-db psql ...` |
| Backend 起動 | `make be-run` | `.env` を読み込んで `./gradlew bootRun` |
| Backend ビルド / テスト / 整形 | `make be-build` / `make be-test` / `make be-format` | `./gradlew build -x test` / `test` / `spotlessApply` |
| Frontend 開発サーバー | `make fe-dev` | `cd frontend && npm run dev` |
| Frontend チェック / ビルド / 整形 | `make fe-check` / `make fe-build` / `make fe-format` | typecheck+lint+format+test / build / prettier |
| 全チェック（push 前相当） | `make check` | `be-check` + `fe-check` |

> `make be-test` は Testcontainers で PostgreSQL を起動するため Docker が必要。

---

## 開発ルール

詳細は [CLAUDE.md](CLAUDE.md) を参照。要点：

- **ブランチ運用**: `main` への直接コミットは原則禁止。`feature/*` ブランチ → PR → 自己レビュー → `main` へマージ。
- **コミット**: 1 コミット 1 目的。小さく、意味のあるメッセージ。
- **設計とコードの同期**: コードを変更したら関連する `docs/` も更新する。
- **セキュリティ**: シークレットをコミットしない。`.env` は Git 管理外。

### 自動チェック

| 仕組み | タイミング | 内容 |
|---|---|---|
| Claude Code フック | ファイル編集後 | Frontend の変更ファイルを Prettier 整形（`.claude/hooks/format-file.py`） |
| git `pre-commit` | コミット時 | 変更ファイルのみ Prettier `--check` + ESLint、Java は `spotlessCheck`、`.env` 混入検知（`.githooks/`） |
| git `pre-push` | プッシュ時 | 変更のあった側の `./gradlew check` / `npm run typecheck+lint+test+build`（Docker 不在時は BE テストをスキップし CI に委ねる） |
| GitHub Actions | push / PR（`main`） | Backend `./gradlew check`（Testcontainers 含む）、Frontend typecheck+lint+format+test+build |

git hooks は `make setup`（または `make hooks`）で有効化する。緊急時は `git commit/push --no-verify`。

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
