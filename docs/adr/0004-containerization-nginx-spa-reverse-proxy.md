# ADR 0004: コンテナ化 — nginx が SPA を配信し `/api` を Backend へリバースプロキシ

- ステータス: Accepted（2026-09-08、Phase 8）
- 関連: [01-architecture](../design/basic/01-architecture.md) §1 / [ADR 0003](0003-database-neon-with-local-docker-fallback.md)（DB）/
  [04-security](../design/basic/04-security.md)（CSP・同一オリジン）
- 補足（Phase 10）: **本番デプロイはこの構成を土台にした非 Docker 版**（EC2 上に nginx を OS
  パッケージで、backend jar を systemd で）に確定 → [ADR 0005](0005-deployment-ec2-single-instance.md)。
  本 ADR のコンテナ構成はローカルのフルスタック確認・将来の基盤移行用に維持する（同一オリジン・
  「nginx が SPA 配信、backend は静的配信しない」という判断は両方に共通）。

## 背景

Phase 8 で ServerHub をコンテナ化する。基本設計（01-architecture §1.1、requirements §10.1.17）は
**SPA と Backend を同一オリジンで配信**すると決めている（CORS 全拒否、セッション Cookie + CSRF を
素直に扱うため）。コンテナでこれをどう実現するかを決める。

## 決定

### 1. 3 コンテナ構成（db / backend / frontend）

| コンテナ | 中身 | 公開 |
|---|---|---|
| `frontend` | nginx。ビルド済み SPA を静的配信 + `/api`・`/actuator/health` を `backend:8080` へリバースプロキシ | **唯一のエントリポイント**（ホスト `${APP_PORT:-8080}` → 80） |
| `backend` | Spring Boot fat jar（`eclipse-temurin:17-jre`） | コンテナネットワーク内のみ |
| `db` | `postgres:16-alpine` | コンテナネットワーク内のみ |

- ブラウザ / API クライアントは nginx だけを見る。`/api/v1/*` は nginx が Backend へ中継するので
  **同一オリジン**が成立し、CORS 設定は不要。
- 開発時（Vite dev server）の `proxy` と同じ役割を、本番相当では nginx が担う（01-architecture §1.2 との対称性）。

### 2. Backend は SPA を配信しない

Spring Security の `appFilterChain` は `anyRequest().authenticated()`。Backend が静的リソースを
返す設計にすると `index.html` に認証が要ることになり不整合。**静的配信は nginx の責務**とし、
Backend は `/api/**` `/actuator/**` `/swagger-ui/**` のみを扱う（現状のまま）。

### 3. マルチステージビルド・非 root・ヘルスチェック

- `backend/Dockerfile`: `17-jdk` でリポジトリの Gradle Wrapper を使い `bootJar` → `17-jre` で実行。
  実行ユーザー `app`（非 root）。`HEALTHCHECK` は `/actuator/health` の `"status":"UP"` を確認（`curl` を同梱）。
  **テストはイメージビルドで回さない**（CI の責務、`./gradlew check`）。
- `frontend/Dockerfile`: `node:24` で `npm ci && npm run build` → `nginx:1.27-alpine` で `dist/` を配信。
  ヘルスは `GET /healthz`（nginx が 200 を返すだけの内部エンドポイント）。
- nginx は Backend の `APP_CSP`（[04-security](../design/basic/04-security.md) D-SEC-01/03）と同等の
  CSP / `X-Content-Type-Options` / `Referrer-Policy` / `X-Frame-Options` を静的レスポンスに付与する。
- ハッシュ付きアセット（`/assets/`）は長期キャッシュ（`immutable`）、`index.html` は `no-cache`。

### 4. 起動オーケストレーション

- `frontend` は `backend` が healthy、`backend` は `db` が healthy になってから起動
  （compose の `depends_on: condition: service_healthy`）。
- nginx の `proxy_pass` は変数 + Docker 埋め込み DNS（`127.0.0.11`）で**実行時解決**。Backend が
  一時的に落ちても nginx 自体は起動でき、復旧後に再解決する。
- スキーマ・管理ユーザーは Backend 起動時に Flyway が適用（V1/V2）。デモデータは `make app-seed`。

### 5. 改行コードの固定（`.gitattributes`）

`gradlew` / `*.sh` / `Dockerfile` / `*.conf` / `.env*` を `eol=lf` に固定。Windows チェックアウト
（`core.autocrlf=true`）で CRLF になると `docker build`（`./gradlew: not found`）や
`docker compose`（`.env` の値に `\r` 混入 → DB 認証失敗）が壊れるため。
`backend/Dockerfile` 内でも `gradlew` の改行を正規化する二重の防御を入れる。

## 却下した案

- **Backend に SPA を同梱（単一コンテナ）**: デプロイは単純だが、静的配信の認証整合を崩す・
  FE/BE のビルドとリリースが密結合になる・スケール単位を分けられない。
- **SPA と API を別オリジン + CORS**: 基本設計（同一オリジン前提）に反する。CSRF・Cookie の
  取り回しが複雑化。
- **Caddy / Traefik**: nginx で十分。学習・運用コストを増やさない。
- **Gradle レイヤードジャー抽出**: イメージ再ビルドのキャッシュ効率は上がるが、Spring Boot 4 での
  `jarmode` 仕様変更リスクに対して MVP では割に合わない。将来最適化の余地として残す。

## 影響

- `infra/docker/docker-compose.app.yml`（フルスタック）を追加。既存の `docker-compose.yml`（db 単体、
  ローカル開発用）は変更しない。
- Makefile に `app-build` / `app-up` / `app-seed` / `app-down` / `app-logs` を追加。
- Phase 9（AWS）は本 ADR の構成を土台にする（ALB → nginx コンテナ / Backend コンテナ、DB は N2 で確定）。
  AWS EC2 連携（[open-issues E2](../requirements/open-issues.md)）の本番コードは Phase 8 では追加しない。

## 検証（2026-09-08、ローカル Docker Desktop）

- `docker compose -f infra/docker/docker-compose.app.yml up -d --build` で 3 コンテナが healthy。
- nginx 経由（`http://localhost:<APP_PORT>`）で: SPA 配信・ディープリンクのフォールバック・
  静的アセットのキャッシュヘッダ・セキュリティヘッダ・`/healthz`・`/actuator/health`・
  CSRF Cookie 発行 → ログイン → `/auth/me` → 一覧 → 登録(201) → dashboard → ログアウト(204) を確認。
- イメージサイズ: backend ≈ 456 MB、frontend ≈ 75 MB。
