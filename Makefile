# ServerHub 開発タスク集約
#
# すべてリポジトリルートから `make <target>` で実行する。
# 生の docker compose / gradlew / npm コマンドの長い呼び出しをここに隠蔽する。

DC := docker compose --env-file .env -f infra/docker/docker-compose.yml
GRADLEW := ./gradlew
NPM := npm
SEED_SQL := infra/docker/initdb/01_seed.sql

# .env があればシェルにエクスポートしてからレシピを実行するためのプレフィックス。
# Backend の接続先（SPRING_DATASOURCE_* / SPRING_PROFILES_ACTIVE）はこれ経由で渡る。
DOTENV := set -a; [ -f .env ] && . ./.env; set +a;

.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# セットアップ
# ---------------------------------------------------------------------------

.PHONY: setup
setup: ## 初回セットアップ（.env 作成 / git hooks 有効化 / フロント依存インストール）
	@test -f .env || (cp .env.example .env && echo "created .env from .env.example")
	git config core.hooksPath .githooks
	@echo "git hooks path -> .githooks"
	cd frontend && $(NPM) ci

.PHONY: hooks
hooks: ## git hooks を有効化する
	git config core.hooksPath .githooks

# ---------------------------------------------------------------------------
# 開発用 DB
# ---------------------------------------------------------------------------

# 通常開発は Neon（クラウド）を推奨。ここの db-* は「ローカル Docker（オフラインデモ用）」向け。
# Neon を使う場合は .env に SPRING_PROFILES_ACTIVE=neon と SPRING_DATASOURCE_* を設定する（docs/adr/0003）。

.PHONY: db-up
db-up: ## ローカル PostgreSQL(Docker) を起動
	$(DC) up -d

.PHONY: db-down
db-down: ## ローカル PostgreSQL(Docker) を停止
	$(DC) down

.PHONY: db-reset
db-reset: ## ローカル PostgreSQL(Docker) をデータごと作り直す（再度 be-run → db-seed が必要）
	$(DC) down -v
	$(DC) up -d

.PHONY: db-seed
db-seed: ## ローカル DB にオフラインデモ用シードを投入（Flyway 適用後に実行）
	@$(DOTENV) docker exec -i serverhub-db psql -v ON_ERROR_STOP=1 -U "$${POSTGRES_USER:-serverhub}" -d "$${POSTGRES_DB:-serverhub}" < $(SEED_SQL)

.PHONY: demo
demo: ## オフラインデモ準備: ローカル DB 起動 → シード手順を表示
	$(DC) up -d
	@echo ""
	@echo "  ローカル DB を起動しました。次を実行してください:"
	@echo "    1) make be-run     # 別ターミナルで。Flyway がスキーマを適用します"
	@echo "    2) make db-seed    # スキーマ適用後にデモデータを投入"
	@echo "    3) make fe-dev     # フロントエンド"
	@echo "  ログイン: admin@serverhub.local / password"
	@echo ""

.PHONY: db-logs
db-logs: ## DB のログを追う
	$(DC) logs -f db

.PHONY: db-psql
db-psql: ## ローカル DB に psql で接続
	@$(DOTENV) docker exec -it serverhub-db psql -U "$${POSTGRES_USER:-serverhub}" -d "$${POSTGRES_DB:-serverhub}"

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------

.PHONY: be-run
be-run: ## Backend を起動（.env の接続先を使用。既定はローカル Docker、Neon は SPRING_* を設定）
	@$(DOTENV) cd backend && $(GRADLEW) bootRun

.PHONY: be-build
be-build: ## Backend をビルド（テスト除く）
	cd backend && $(GRADLEW) build -x test

.PHONY: be-test
be-test: ## Backend のテスト（Testcontainers。Docker が必要）
	cd backend && $(GRADLEW) test

.PHONY: be-check
be-check: ## Backend の静的検査 + テスト
	cd backend && $(GRADLEW) check

.PHONY: be-format
be-format: ## Backend を google-java-format で整形
	cd backend && $(GRADLEW) spotlessApply

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------

.PHONY: fe-dev
fe-dev: ## Frontend の開発サーバー（Backend が必要）
	cd frontend && $(NPM) run dev

.PHONY: fe-build
fe-build: ## Frontend をビルド
	cd frontend && $(NPM) run build

.PHONY: fe-test
fe-test: ## Frontend のテスト
	cd frontend && $(NPM) run test

.PHONY: fe-lint
fe-lint: ## Frontend の lint
	cd frontend && $(NPM) run lint

.PHONY: fe-format
fe-format: ## Frontend を Prettier で整形
	cd frontend && $(NPM) run format

.PHONY: fe-check
fe-check: ## Frontend の型 + lint + フォーマット + テスト
	cd frontend && $(NPM) run typecheck && $(NPM) run lint && $(NPM) run format:check && $(NPM) run test

# ---------------------------------------------------------------------------
# 横断
# ---------------------------------------------------------------------------

.PHONY: check
check: be-check fe-check ## Backend + Frontend の全チェック（push 前相当）

.PHONY: help
help: ## このヘルプを表示
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
