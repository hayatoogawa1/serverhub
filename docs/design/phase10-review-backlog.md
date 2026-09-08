# Phase 10 — レビュー・改善バックログ

Phase 1〜9（MVP + コンテナ化 + AWS EC2 実行状態の参照）完了後、コードベース全体を
レビュー観点（保守性・セキュリティ・ドキュメント整合・性能・テスト・アクセシビリティ）で
通した結果の改善候補一覧。

> 棚卸し実施日: 2026-09-08。対象: Backend 112 ファイル / 約 4,300 行、Frontend 82 ファイル / 約 5,700 行、
> BE 142 テスト・FE 19 テストファイル。`npm audit`: 脆弱性 0 件。
>
> 全体的にコード品質は良好（N+1 なし、例外の握り潰しなし、統一エラーレスポンスで内部情報リークなし、
> `Impl` 分離・横スライス構成を遵守）。改善は「仕上げ」レベル。

## 凡例

- 優先度: **P1**（確定仕様とのズレ / 公開リポジトリの信頼性）、**P2**（意味のある改善）、**P3**（軽微 / 判断待ち）
- 工数: XS（〜30 分）/ S（〜半日）/ M（〜2 日）
- 状態: `未着手` / `対応中` / `完了(PR #)` / `見送り`

---

## P1

| # | 項目 | 根拠 | 工数 | 状態 |
|---|---|---|---|---|
| 1 | セッションタイムアウトを明示設定（`server.servlet.session.timeout=30m`） | open-issues S4「確定: 30 分」だが `application.yml` / `SecurityConfig` に無く Tomcat 既定に暗黙依存 | XS | 対応中（PR-A） |
| 2 | `README.md` 冒頭の進捗表記が「Phase 4 完了 → Phase 5 へ」のまま | `README.md` | XS | 対応中（PR-A） |
| 3 | ドキュメント整合スイープ（README ロードマップ / 各設計書の陳腐化） | `README.md` の Recharts「未確定」表記等。`CLAUDE.md` は Phase 9 完了済みで最新 | S | 対応中（PR-A） |

## P2

| # | 項目 | 根拠 | 工数 | 状態 |
|---|---|---|---|---|
| 4 | Frontend のルート単位コード分割（`React.lazy` + vite `manualChunks`） | `npm run build` が「chunk > 500KB」警告。`index.js` 1.16MB（gzip 358KB）。`router.tsx` が全ページ eager import。特に Dashboard の `recharts` が重い | M | **完了（#57）**。初期 JS gzip 358KB→約240KB、`recharts` は Dashboard ルートのみ、`react`/`mui` を安定チャンク化、500KB 警告解消 |
| 5 | 本番 Spring プロファイル（`application-prod.yml`）の追加 | 不在。`logging.level.com.serverhub: DEBUG` が既定のまま。セッション Cookie `secure`、Swagger 認証必須（`serverhub.security.swagger-permit-all=false`）も本番向けに束ねたい | M | **完了（#60 + PR-F）**。`application-prod.yml`（`SPRING_PROFILES_ACTIVE=neon,prod`）: Secure/HttpOnly Cookie・`forward-headers-strategy`・Swagger 認証必須・INFO ログ・`db/prod` マイグレーション |
| 6 | アクセシビリティ点検 | フォームのバリデーション失敗時に最初のエラー項目へフォーカス移動が無い。トーストの `aria-live`、キーボード操作、コントラスト | M | **完了（PR-D）**。`utils/a11y.ts` の `focusFirstInvalid` を 4 フォーム（Server / Maintenance / CloudLink / Login）に導入。トーストは error→`role="alert"` / success・info→`role="status"`。MUI Dialog のフォーカストラップ・`aria-modal`・`aria-describedby`（エラー文言）は既存で担保済み。コントラスト・キーボード全項目監査は視覚ツールが必要なため別途 |
| 7 | dev DB ポートを `127.0.0.1` バインドに限定 | `infra/docker/docker-compose.yml` が `${DB_PORT:-5432}:5432`（全 IF 公開）。open-issues S2 の推奨は `127.0.0.1:${DB_PORT}:5432` | XS | **完了（PR-D と同時／#58）**。`127.0.0.1:${DB_PORT:-5432}:5432` に変更、S2 を確定に |
| 8 | テストカバレッジの穴の棚卸し | `vite.config.ts` に v8 カバレッジ設定済みだが未計測。異常系・境界値の抜けを洗い出す | S〜M | **完了（PR-D）**。FE カバレッジは stmts 86.9% / branch 85.8%（BE 142 テスト）。低い残りは起動配線（`main.tsx` / `App.tsx` / `routePages.ts` → coverage 除外に追加）と単純ラッパー（`CopyButton` / `TagInput` 40%台）のみで、重大な穴なし。ビジネスロジック（`validation` 96% / `hooks` 96% / `url` 93%）は十分 |

## P3

| # | 項目 | 根拠 | 区分 | 状態 |
|---|---|---|---|---|
| 9 | `ServerServiceImpl.toDetail` の `com.serverhub.cloud.CloudLinkResponse` FQCN 直書きを import に統一 | `ServerServiceImpl.java` | 軽微リファクタ | **完了（#58）** |
| 10 | ダッシュボードの「AWS 実行状態」集計・「要確認」パネル | `07-aws-ec2-integration §3`「Phase 10 で検討」 | 要スコープ判断（MVP 拡張） | 保留 |
| 11 | 本番 DB を Neon 継続か AWS RDS か | open-issues N2「Phase 9 で判断」だが未決 | 要オーナー判断 | **確定（PR-F）**。Neon 継続 → [ADR 0005](../adr/0005-deployment-ec2-single-instance.md) / open-issues N2 |
| 12 | ServerHub 自体の AWS 実デプロイ | Phase 9 は「EC2 状態の参照機能」のみ。デプロイ基盤は未着手 | オーナー判断済み | **構成確定 + 資材作成（PR-F）**。EC2 1 台・非 Docker・DB は Neon → [ADR 0005](../adr/0005-deployment-ec2-single-instance.md)。資材: `infra/aws/{nginx-serverhub.conf,serverhub.service,serverhub.env.example,bootstrap.sh,deploy.sh}` + `.github/workflows/release.yml` + `infra/aws/README.md §7`。**実 AWS 側の作成・初回デプロイはオーナー作業**（手順は README §7） |
| 13 | 実サーバー連携（死活監視・構成自動取得） | open-issues E1「MVP 完了後の独立フェーズ」 | 別フェーズ・要承認 | 保留 |

---

## 実施計画（PR 分割）

| PR | 含む項目 | 概要 |
|---|---|---|
| **PR-A**（#56 マージ済） | #1, #2, #3, 本バックログ | 確定仕様のズレ修正 + ドキュメント整合。低リスク |
| **PR-B**（#57 マージ済） | #4 | Frontend コード分割（体感効果大） |
| **PR-C**（#58 マージ済） | #7, #9 | docker-compose ポートバインド + 軽微リファクタ |
| **PR-D**（#59 マージ済） | #6, #8 | アクセシビリティ改善 + テストカバレッジ棚卸し |
| **PR-E**（#60 マージ済） | #5（一部） | `application-prod.yml` |
| **PR-F** | #5（残）, #11, #12 | デプロイ資材（EC2 非 Docker）+ `release.yml` + `db/prod/V100`（デモパスワード変更）+ ADR 0005 + runbook |

## 残タスク

- **#12 実 AWS デプロイの実行**（オーナー作業）: EC2 / EIP / IAM ロール / SG 作成、ドメイン取得 →
  A レコード、`certbot`、初回 `deploy.sh`。手順は [infra/aws/README.md §7](../../infra/aws/README.md)
- #10 ダッシュボードの AWS 状態集計パネル（MVP 拡張の可否 → 要判断）
- #13 実サーバー連携（E1、別フェーズ）
- a11y の追加監査（コントラスト比・キーボード操作の全画面チェック）、`CopyButton` / `TagInput` の単体テスト追加
