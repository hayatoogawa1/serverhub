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
| | Spring Boot | 4.1.x（※ Phase 0 セットアップ時に最新パッチを確定） |
| | Spring Security | 7.x（Spring Boot 4.1 同梱） |
| | Doma 2/3 | 3.x |
| | doma-spring-boot-starter | 3.0.x |
| | Flyway | Spring Boot 管理バージョン（`spring-boot-starter-flyway` 経由） |
| | springdoc-openapi | 3.1.x |
| | PostgreSQL | 16 |
| ビルド | Gradle（Kotlin DSL）＋ Wrapper | 8.x |
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
├── frontend/     React + Vite アプリケーション
├── infra/
│   └── docker/   開発用 docker-compose（PostgreSQL 等）
├── db/
│   └── migration/  Flyway マイグレーション SQL
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

> 🚧 Phase 0 進行中。各コンポーネント追加時に追記する。

```bash
# 1. リポジトリ取得
git clone <REPO_URL> serverhub && cd serverhub

# 2. 環境変数ファイルを作成（.env は Git 管理外）
cp .env.example .env
#   → .env を編集して DB パスワード等を設定

# 3. 開発用 DB 起動（Phase 0-2 以降）
#   docker compose -f infra/docker/docker-compose.yml up -d

# 4. Backend 起動（Phase 0-3 以降）
#   cd backend && ./gradlew bootRun

# 5. Frontend 起動（Phase 0-4 以降）
#   cd frontend && npm ci && npm run dev
```

### DB の初期化

> 🚧 Phase 0-2 / Phase 4 で記載。
> Flyway によるマイグレーション適用手順、シードデータ（ユーザー等）の投入方法をここに書く。

---

## よく使うコマンド

> 🚧 各コンポーネント追加時に追記。

| 目的 | コマンド |
|---|---|
| DB 起動 | `docker compose -f infra/docker/docker-compose.yml up -d` |
| DB 停止 | `docker compose -f infra/docker/docker-compose.yml down` |
| DB 破棄（データ含む） | `docker compose -f infra/docker/docker-compose.yml down -v` |
| Backend テスト | `cd backend && ./gradlew check` |
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
