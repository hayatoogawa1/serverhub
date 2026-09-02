# ADR 0001: Backend の技術スタックとバージョン確定

- ステータス: Accepted
- 日付: 2026-09-03
- フェーズ: Phase 0-3（Backend 初期化）

## 背景

CLAUDE.md で技術の方向性（Java 17 / Spring Boot 4.1 系 / Doma / Flyway / springdoc / PostgreSQL 16）は
決定済みだった。Phase 0-3 で実際に依存関係を解決し、ビルドが通る正確なバージョンの組み合わせを確定する。

## 決定

| 項目 | バージョン | 補足 |
|---|---|---|
| Java | 17 | Gradle toolchain で固定。Spring Boot 4.1 の baseline |
| Spring Boot | **4.1.1** | 2026-08 リリースの最新パッチ。3.x 系は全て OSS EOL のため 4.x 必須 |
| Spring Security | 4.1.1 同梱（7.x） | フォームログイン + セッション。`SecurityFilterChain` Bean で構成 |
| Gradle | **8.14.5**（Wrapper） | Spring Boot 4.1 プラグインの要件は「8.14 以降 or 9.x」。9.x は各プラグインの追随を待って見送り |
| ビルドスクリプト | Kotlin DSL + `io.spring.dependency-management` 1.1.7 | |
| Doma | `doma-spring-boot-starter` **3.0.0** + `doma-processor` **3.11.1** | starter 3.0.0 が想定する Doma バージョンが 3.11.1（starter の親 POM の `doma.version`）。processor を明示的にそれへ固定 |
| Doma ビルド補助 | `org.domaframework.doma.compile` **4.0.3** | アノテーション処理・SQL リソース配置の Gradle 構成を肩代わりする公式プラグイン |
| Flyway | Spring Boot 管理バージョン | Spring Boot 4 でモジュール化されたため `org.springframework.boot:spring-boot-starter-flyway` が必須（`flyway-core` 単体では auto-config が起動しない）。方言モジュール `org.flywaydb:flyway-database-postgresql` を追加 |
| springdoc-openapi | `springdoc-openapi-starter-webmvc-ui` **3.1.0** | v3.x が Spring Boot 4.x 対応。3.1.0 は Spring Boot 4.1 をターゲット |
| PostgreSQL | 16（`postgres:16-alpine`） | Spring Boot 4.0/4.1 同梱 Flyway が PostgreSQL 18 系で "Unsupported Database" になる報告があるため 16 で固定 |
| JDBC ドライバ | `org.postgresql:postgresql`（Spring Boot 管理） | |
| テスト | JUnit 5 + Spring Boot Test + **Testcontainers 2.0.5** | Spring Boot 4.1.1 が管理。**2.x でモジュール名が `testcontainers-*` にリネーム**（`testcontainers-junit-jupiter` / `testcontainers-postgresql`）、PostgreSQL のコンテナクラスは `org.testcontainers.postgresql.PostgreSQLContainer`（非ジェネリック）へ移動。`@ServiceConnection` で datasource を自動接続 |

## 補足・注意点

- **Testcontainers 2.x の破壊的変更**: 1.x の `org.testcontainers:junit-jupiter` / `org.testcontainers:postgresql`、
  `org.testcontainers.containers.PostgreSQLContainer<SELF>` は使わない（前者は 404、後者は deprecated 互換クラス）。
- **`io.spring.dependency-management` は当面維持**。Spring Boot 4 では Gradle ネイティブ BOM（`platform()`）も選択肢だが、
  既存の知見が多い前者を採用。移行する場合は別 ADR。
- **DB 接続情報のデフォルト値を `application.yml` に記載**（`jdbc:postgresql://localhost:5432/serverhub` /
  `serverhub` / `changeme`）。これは `.env.example` のローカル開発用ダミー値と一致させたもので、
  本番等では `SPRING_DATASOURCE_*` 環境変数で上書きする。実シークレットはコミットしない。
- **Doma の naming は `SNAKE_LOWER_CASE`** に設定（DB は snake_case 命名のため）。dialect は `POSTGRES` を明示。

## 検証状況（Phase 0-3 時点）

- [x] `./gradlew build -x test` 成功（コンパイル・依存解決・bootJar）
- [x] `./gradlew compileTestJava` 成功
- [ ] `./gradlew bootRun` で実 PostgreSQL へ接続・Flyway 実行（Docker 環境で実施）
- [ ] `./gradlew test`（Testcontainers、Docker 必須）

`bootRun` / `test` の実起動確認は、Docker Desktop の WSL 統合が有効な環境で Phase 0-3 の
締めくくりとして実施する。

## 影響

- CLAUDE.md「2. 技術スタック」、README「技術スタック」「よく使うコマンド」を本 ADR に合わせて更新済み。
- Flyway マイグレーションの配置先を `backend/src/main/resources/db/migration/` に確定（当初案のリポジトリ
  ルート `db/migration/` は、Spring Boot の classpath スキャンと jar 同梱の都合で不採用）。
