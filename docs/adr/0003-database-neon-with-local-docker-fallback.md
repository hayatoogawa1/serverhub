# ADR 0003: 開発 DB は Neon を主とし、ローカル Docker をオフライン用フォールバックにする

- ステータス: Accepted
- 日付: 2026-09-04
- フェーズ: Phase 0（開発環境整備）への反映

## 背景

- 開発・機能検証で **DB ブランチ機能**（ブランチごとに独立した DB を即時に用意し、
  破棄できる）を活用したい。
- 一方、対面発表やネットワークのないオフライン環境でもデモを動かせるようにしたい。

## 決定

**接続先は環境変数で切り替える**構成とし、以下の 2 系統を用意する。

| 系統 | 用途 | 接続 |
|---|---|---|
| **Neon**（PostgreSQL、クラウド）| オーナーの通常開発、機能検証（ブランチ活用）、（将来）CI | `.env` の `SPRING_DATASOURCE_URL`（`?sslmode=require` 付き）+ `SPRING_PROFILES_ACTIVE=neon` |
| **ローカル Docker Compose**（`postgres:16-alpine`）| オフラインデモ、CI（Testcontainers）、Neon を使わない開発者 | 既定値（`jdbc:postgresql://localhost:5432/serverhub`）。`make db-up` で起動、`make db-seed` でシード投入 |

- **リポジトリの既定（ゼロ設定）はローカル Docker**。`git clone` 後に `make setup && make db-up && make be-run`
  でオフラインでも動く。Neon を使う場合のみ `.env` に接続情報を設定する。
- スキーマは引き続き **Flyway が管理**（[ADR 0001](0001-backend-technology-versions.md)）。
  Neon / ローカルのどちらでも同じマイグレーションを適用する。
- **シードデータ**（デモ用のユーザー・サーバー・タグ・履歴）は
  `infra/docker/initdb/01_seed.sql` に置き、`make db-seed`（Flyway 適用後に `psql` で流し込み）で投入する。
  同ファイルはスキーマ未適用時は安全に何もしない（`\if` ガード）ため、`docker-entrypoint-initdb.d`
  にマウントされていても初回起動を壊さない。実データは投入しない（ダミーのみ）。

## 根拠

- Neon は PostgreSQL 互換であり、Doma / Flyway / JDBC ドライバの変更は不要。
- ブランチ機能により「機能ごとに使い捨ての DB」でマイグレーションや破壊的変更を安全に試せる。
- ローカル Docker を残すことで、オフライン耐性・CI のhermetic性・新規参加者の zero-config を確保。
- 接続を環境変数に寄せることで、`application.yml` に実シークレットを持たせない
  （[ADR 0001](0001-backend-technology-versions.md) / requirements §10.1.16 の方針を維持）。

## 影響 / 注意点

- **Neon 接続時の Hikari 設定**: 無操作でのオートサスペンド・接続数上限を考慮し、
  `application-neon.yml` でプールを小さめ（`maximum-pool-size: 5`）、`max-lifetime` を
  短め（4 分）に設定する。
- **SSL**: Neon は SSL 必須。JDBC URL に `?sslmode=require` を含める（`application-neon.yml` でも明示）。
- **CI**: 現状の CI は Testcontainers（hermetic）で `./gradlew check` を実行しており、外部 DB に依存しない。
  Neon のブランチを PR ごとに作成して CI で使う構成は将来の拡張とする
  （`NEON_API_KEY` / `NEON_PROJECT_ID` を GitHub Actions Secrets に登録し、
  `neondatabase/create-branch-action` 等を使う。open-issues で追跡）。
- **本番（Phase 9）**: Neon をそのまま本番に使うか、AWS RDS にするかは Phase 9 で判断
  （どちらでも接続は環境変数で切り替わる）。
- **バックアップ**: Neon は PITR（Point-in-Time Restore）を持つ。ローカルはボリューム破棄で作り直し。

## 未決 / 追跡

- N1: Neon ブランチを PR ごとに CI で使うワークフロー（将来）
- N2: 本番 DB の最終決定（Neon 継続 or RDS）— Phase 9
