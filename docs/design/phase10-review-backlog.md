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
| 4 | Frontend のルート単位コード分割（`React.lazy` + vite `manualChunks`） | `npm run build` が「chunk > 500KB」警告。`index.js` 1.16MB（gzip 358KB）。`router.tsx` が全ページ eager import。特に Dashboard の `recharts` が重い | M | 未着手（PR-B） |
| 5 | 本番 Spring プロファイル（`application-prod.yml`）の追加 | 不在。`logging.level.com.serverhub: DEBUG` が既定のまま。セッション Cookie `secure`、Swagger 認証必須（`serverhub.security.swagger-permit-all=false`）も本番向けに束ねたい | M | 見送り（オーナー指示、今回はスコープ外） |
| 6 | アクセシビリティ点検 | フォームのバリデーション失敗時に最初のエラー項目へフォーカス移動が無い。トーストの `aria-live`、キーボード操作、コントラスト | M | 未着手（PR-D） |
| 7 | dev DB ポートを `127.0.0.1` バインドに限定 | `infra/docker/docker-compose.yml` が `${DB_PORT:-5432}:5432`（全 IF 公開）。open-issues S2 の推奨は `127.0.0.1:${DB_PORT}:5432` | XS | 未着手（PR-C） |
| 8 | テストカバレッジの穴の棚卸し | `vite.config.ts` に v8 カバレッジ設定済みだが未計測。異常系・境界値の抜けを洗い出す | S〜M | 未着手（PR-D） |

## P3

| # | 項目 | 根拠 | 区分 | 状態 |
|---|---|---|---|---|
| 9 | `ServerServiceImpl.toDetail` の `com.serverhub.cloud.CloudLinkResponse` FQCN 直書きを import に統一 | `ServerServiceImpl.java` | 軽微リファクタ | 未着手（PR-C） |
| 10 | ダッシュボードの「AWS 実行状態」集計・「要確認」パネル | `07-aws-ec2-integration §3`「Phase 10 で検討」 | 要スコープ判断（MVP 拡張） | 保留 |
| 11 | 本番 DB を Neon 継続か AWS RDS か | open-issues N2「Phase 9 で判断」だが未決 | 要オーナー判断 | 保留 |
| 12 | ServerHub 自体の AWS 実デプロイ（ECS/EC2 プロビジョニング・IaC・本番稼働） | Phase 9 は「EC2 状態の参照機能」のみ。デプロイ基盤は未着手 | 別フェーズ・要承認（コスト発生） | 保留 |
| 13 | 実サーバー連携（死活監視・構成自動取得） | open-issues E1「MVP 完了後の独立フェーズ」 | 別フェーズ・要承認 | 保留 |

---

## 実施計画（PR 分割）

| PR | 含む項目 | 概要 |
|---|---|---|
| **PR-A** | #1, #2, #3, 本バックログ | 確定仕様のズレ修正 + ドキュメント整合。低リスク |
| **PR-B** | #4 | Frontend コード分割（体感効果大） |
| **PR-C** | #7, #9 | docker-compose ポートバインド + 軽微リファクタ（#5 本番プロファイルはオーナー指示で今回スコープ外） |
| **PR-D** | #6, #8 | アクセシビリティ改善 + テストカバレッジ棚卸し |

#10〜#13 は着手前に方針確認。
