# ADR 0005: 本番デプロイ — EC2 1 台（非 Docker）+ Neon

- ステータス: Accepted（2026-09-08、Phase 10）
- 関連: [ADR 0003](0003-database-neon-with-local-docker-fallback.md)（DB）/ [ADR 0004](0004-containerization-nginx-spa-reverse-proxy.md)（コンテナ topology）/
  [04-security](../design/basic/04-security.md)（同一オリジン・CSP）/ [open-issues N2](../requirements/open-issues.md)

## 背景

Phase 10 で ServerHub を実際に AWS へデプロイする。ポートフォリオ用途であり、
運用コストと手間を最小にしたい。open-issues N2（本番 DB を Neon か RDS か）と、
Phase 8 のコンテナ構成（ADR 0004）を本番でどう扱うかを確定する。

## 決定

### 1. 構成: EC2 1 台に直接配置（Docker を使わない）

```
[EC2 1台]  Amazon Linux 2023 / t3.small
  ├─ nginx（OS パッケージ）        :443  TLS 終端 + SPA 静的配信 + /api → 127.0.0.1:8080
  └─ serverhub-backend.jar（systemd serverhub.service）  :8080（ループバックのみ）
        └─→ Neon（managed PostgreSQL, SSL 必須）
IAM インスタンスプロファイル: AmazonSSMManagedInstanceCore + serverhub-ec2-readonly（ec2:DescribeInstances のみ）
運用アクセス: SSM Session Manager（22 番は開けない）
```

- **DB は Neon を継続**（N2 の決定）。バックアップ（PITR）を Neon に任せられ、EC2 に DB を載せない分
  インスタンスを小さくできる。接続は環境変数で切替（ADR 0003）で既に対応済み。
- **Docker を使わない**。jar を systemd サービスで起動、フロントは `npm run build` した `dist/` を
  nginx が配信するだけ。コンテナレジストリもイメージビルドも不要。
- ADR 0004 の topology（**nginx が SPA を配信、backend は静的配信しない、同一オリジン**）は維持する。
  コンテナ版（`frontend/nginx.conf`）と非コンテナ版（`infra/aws/nginx-serverhub.conf`）は同じ役割。

### 2. TLS はホスト nginx で終端（certbot / Let's Encrypt）

- `certbot --nginx -d <domain> --redirect` で証明書取得と 80→443 リダイレクトを設定。
  `certbot-renew.timer` で自動更新。
- backend は `application-prod.yml` の `server.forward-headers-strategy=framework` で nginx の
  `X-Forwarded-Proto` を信頼し、`request.isSecure()` / Secure Cookie を成立させる。
- ドメインが未確定の間は 80 番のみで動作確認（TLS は後入れ）。

### 3. 本番プロファイル `neon,prod`

- `neon`: 接続プール（`application-neon.yml`）。
- `prod`: `application-prod.yml` — Secure/HttpOnly セッション Cookie、`forward-headers-strategy`、
  Swagger 認証必須（D-SEC-02）、`com.serverhub` ログを INFO、**`spring.flyway.locations` に
  `classpath:db/prod` を追加**。
- `db/prod/V100__update_admin_password.sql`: 公開環境のデモ管理者パスワードを `password` から
  `serverhub-demo-2026` に変更（`{bcrypt}` ハッシュ固定。requirements §10.1.18 のデモ資格情報）。
  ローカル / CI（既定プロファイル）は `db/migration` のみを見るためこのファイルは適用されず、
  既存テストの `admin@serverhub.local / password` は不変。

### 4. リリースとデプロイ

- **GitHub Actions（`release.yml`）**: タグ `v*` で backend jar + フロント `dist.tar.gz` + `SHA256SUMS`
  をビルドして GitHub Release に添付。EC2 上で Node / Gradle を動かさない。
- **`infra/aws/deploy.sh <version>`**: Release からアーティファクトを取得 → チェックサム検証 →
  jar をバージョン付きで配置しシンボリックリンク差し替え → `dist` を配置 → `systemctl restart serverhub`
  → `/actuator/health` を待つ → `nginx -s reload`。ヘルスチェック失敗時は前 jar へ自動ロールバック。
- **`infra/aws/bootstrap.sh <domain>`**: 初回のみ。パッケージ導入・`serverhub` ユーザー・
  ディレクトリ・systemd unit・nginx server block・SELinux（`httpd_can_network_connect`）。
- Flyway が起動時にスキーマを自動適用。**ロールバックはスキーマ前方前提**（後方マイグレーションは無い）。

## 却下した案

- **EC2 + Docker Compose（ADR 0004 をそのまま本番へ）**: 動くが、1 台構成でイメージビルド・
  compose・（TLS 用の）Caddy 追加と、非 Docker 版より要素が多い。ポートフォリオには過剰。
- **フロントを S3 + CloudFront に分離**: 静的配信は安いが、オリジンが分かれて同一オリジン前提
  （04-security）が崩れる。CORS + `SameSite=None` Cookie が必要になり認証設計の変更。却下。
- **ECS Fargate + RDS + ALB**: 本番的だが ALB だけで月 $16〜、RDS でさらに増える。運用要素も多い。
- **AWS RDS（N2）**: Neon で PITR まで賄えており、EC2 に載せる理由もない。RDS なら VPC 内配置・
  サブネットグループ管理が増える。将来スケール時に再検討。
- **backend が SPA を同梱**: ADR 0004 の「静的配信は nginx」を崩す。認証整合の問題も同じ。

## 影響

- `infra/aws/` に `nginx-serverhub.conf` / `serverhub.service` / `serverhub.env.example` /
  `bootstrap.sh` / `deploy.sh` を追加。IAM ポリシー JSON（`iam-policy-serverhub-ec2-readonly.json`）は既存。
- `.github/workflows/release.yml` を追加（CI（`ci.yml`）は不変）。
- `backend/src/main/resources/application-prod.yml` に `spring.flyway.locations`、
  `backend/src/main/resources/db/prod/V100__update_admin_password.sql` を追加。
- `infra/aws/README.md` に「EC2 1 台（非 Docker）デプロイ」章。requirements N2 を確定。
- ADR 0004 は「コンテナ版のローカル/将来用途」として残す（本番は本 ADR）。

## 未実施（デプロイ実行時）

- 実 AWS アカウントでの EC2 / Elastic IP / IAM ロール / SG 作成、ドメイン取得と A レコード、
  `certbot` 実行、初回 `deploy.sh`。手順は `infra/aws/README.md`。
