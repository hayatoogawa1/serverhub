# AWS — EC2 実行状態の参照 + ServerHub 本体のデプロイ

このディレクトリは 2 つを扱う:

1. **§1〜6**: 「AWS 連携」機能（FR-CLOUD-01、[07-aws-ec2-integration](../../docs/design/basic/07-aws-ec2-integration.md)）の
   IAM 設定と有効化手順。**既定は無効**。ローカル / CI では `serverhub.cloud.enabled=false`
   （`DisabledCloudStateProviderImpl`）で動作し、AWS に一切アクセスしない。有効化しなくても
   ServerHub の全機能（台帳・検索・メンテ履歴・ダッシュボード）は動く。
2. **§7**: ServerHub 本体を AWS へデプロイする手順（EC2 1 台・非 Docker・DB は Neon。
   [ADR 0005](../../docs/adr/0005-deployment-ec2-single-instance.md)）。IAM ロールは §1〜6 の
   `DescribeInstances` ポリシーをそのまま流用する。

---

## 1. できること / できないこと

| できること | できないこと（設計上の禁止事項） |
|---|---|
| 紐付けた EC2 インスタンスの**実行状態を参照**（`running` / `stopped` 等） | EC2 の**起動・停止・再起動・終了**（`ec2:StartInstances` 等は使わない） |
| 定期ポーリング（既定 1 分）＋ 画面からの手動更新 | 構成情報の自動取得・`servers` 属性の自動更新 |
| — | ServerHub の管理ステータス（`servers.status`）の自動更新（**絶対にしない**） |

使う AWS API は **`ec2:DescribeInstances` の 1 つだけ**。

---

## 2. IAM ポリシー（最小権限）

[`iam-policy-serverhub-ec2-readonly.json`](iam-policy-serverhub-ec2-readonly.json):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ServerHubDescribeEc2ReadOnly",
      "Effect": "Allow",
      "Action": ["ec2:DescribeInstances"],
      "Resource": "*",
      "Condition": { "StringEquals": { "aws:RequestedRegion": ["ap-northeast-1"] } }
    }
  ]
}
```

- `ec2:DescribeInstances` は**リソースレベルの絞り込みに非対応**なので `Resource: "*"` + リージョン条件で限定する。
- リージョンを変える場合は `aws:RequestedRegion` の値と、アプリ側 `SERVERHUB_CLOUD_AWS_REGION` を合わせる。
- 書き込み系アクションは**一切含めない**。将来 discover（タグでの絞り込み取り込み）を実装する場合のみ
  `ec2:DescribeInstances` に `ec2:ResourceTag` 条件を足すことを検討する（Phase 9 では不要）。

---

## 3. クレデンシャル戦略

| 環境 | 方法 |
|---|---|
| **本番**（Phase 9 の AWS デプロイ） | **IAM ロール**を計算リソースにアタッチ（ECS タスクロール / EC2 インスタンスプロファイル）。AWS SDK 既定のクレデンシャルチェーンが自動取得する。**静的アクセスキーは使わない** |
| **ローカルで実 AWS を試す** | **IAM Identity Center（SSO）プロファイル**が推奨（§3.2）。または `AWS_PROFILE` で名前付きプロファイル。静的キーの直貼りはしない |
| CI / 自動テスト | `enabled=false`（既定）。Disabled provider。AWS を呼ばない |

- ServerHub は AWS のアクセスキー・シークレットを **DB にもソースにも保存しない**（`BR-11` / requirements §10.1.9）。
- `DescribeInstances` のレスポンスのうち ServerHub が保存するのは **`state` / `state_raw` のみ**（最小取得）。
- SDK は `sso` / `ssooidc` モジュールを同梱済み（`build.gradle.kts`）。SSO プロファイルをそのまま解決できる。

### 3.2 IAM Identity Center（SSO）をローカルで使う

```bash
# 1) 一度だけ: SSO プロファイルを作る
aws configure sso
#   SSO start URL / SSO Region を入力 → 許可するアカウント・権限セット（ServerHubEc2ReadOnly）を選択
#   CLI profile name は例えば  serverhub-read-only  にする

# 2) セッションを開始（期限切れのたびに実行。ブラウザで承認）
aws sso login --profile serverhub-read-only

# 3) 対象インスタンスがこのプロファイルで“見える”ことを確認（重要）
aws ec2 describe-instances \
  --profile serverhub-read-only --region ap-northeast-1 \
  --instance-ids i-xxxxxxxxxxxxxxxxx \
  --query "Reservations[].Instances[].[InstanceId,State.Name]" --output table
```

> `describe-instances` が `Reservations: []` や `InvalidInstanceID.NotFound` を返すなら、その
> インスタンスは **この SSO プロファイルのアカウント / リージョンに居ない**。ServerHub も同じ結果になる
> （= 「見つかりません（gone）」になる）。まず CLI で見えるようにする。

### 3.3 Backend の起動（ローカル）

`AWS_PROFILE` は **Backend を起動する JVM に届いている**必要がある。Gradle デーモンが古い環境を
保持していることがあるので、確実なのは次のいずれか:

```bash
# 方式A: jar を直接起動（デーモンの影響を受けない・おすすめ）
cd backend && ./gradlew --no-daemon bootJar
SERVERHUB_CLOUD_ENABLED=true \
AWS_PROFILE=serverhub-read-only \
AWS_REGION=ap-northeast-1 \
java -jar build/libs/*.jar

# 方式B: bootRun を no-daemon で（同じシェルで env をセット）
cd backend && SERVERHUB_CLOUD_ENABLED=true AWS_PROFILE=serverhub-read-only AWS_REGION=ap-northeast-1 \
  ./gradlew --no-daemon bootRun

# 方式C: make be-run（リポジトリルートの .env を読む）
#   .env に SERVERHUB_CLOUD_ENABLED=true / AWS_PROFILE=serverhub-read-only / AWS_REGION=ap-northeast-1 を書く
#   ※ .env は git 管理外。ただしプロファイル名だけなので機密ではない
make be-run
```

### 3.4 効いているかの確認（ログ）

起動直後の INFO ログに 1 行出る:

```
cloud integration: enabled=true, provider=Ec2CloudStateProviderImpl, region=ap-northeast-1, pollInterval=PT1M, ...
```

- `enabled=false` または `provider=DisabledCloudStateProviderImpl` → **環境変数が JVM に届いていない**。
  → §3.3 の方式A / B（`--no-daemon`）で起動し直す。`refresh` は 503 `CLOUD_PROVIDER_UNAVAILABLE` になる。
- `provider=Ec2CloudStateProviderImpl` なのに実行状態が出ない → AWS 呼び出し自体は行っている。
  画面「AWS 連携」の「最新の取得に失敗しました: …」に理由が出る（`refresh` は 200 で返る）。
  よくある理由: `aws sso login` の期限切れ / プロファイル名違い / インスタンスが別アカウント・別リージョン。
  Backend ログにも `Ec2CloudStateProviderImpl` / `CloudStatePoller` の WARN が出る。

### 3.5 IAM ロール作成の手順（本番デプロイ時・例: マネジメントコンソール）

1. IAM → ポリシー → 「ポリシーを作成」→ JSON に本ディレクトリの `iam-policy-serverhub-ec2-readonly.json` を貼り付け →
   名前 `serverhub-ec2-readonly`。
2. IAM → ロール → 「ロールを作成」→ 信頼されたエンティティ:
   - ECS Fargate の場合: 「AWS のサービス」→ 「Elastic Container Service」→ 「Elastic Container Service Task」
   - EC2 の場合: 「AWS のサービス」→ 「EC2」
3. 上で作ったポリシー `serverhub-ec2-readonly` をアタッチ → 名前 `serverhub-app-role`。
4. デプロイ先にロールを割り当てる:
   - ECS: タスク定義の `taskRoleArn` に `serverhub-app-role` を指定。
   - EC2: インスタンスプロファイルとして `serverhub-app-role` をアタッチ。

CDK / Terraform で管理する場合も同じポリシー JSON をそのまま使える（`aws_iam_policy` / `PolicyDocument`）。

---

## 4. アプリ側の設定（環境変数）

`application.yml` の `serverhub.cloud.*` は環境変数で上書きする（[07-aws-ec2-integration §6.4](../../docs/design/basic/07-aws-ec2-integration.md)）。

| 環境変数 | 既定 | 説明 |
|---|---|---|
| `SERVERHUB_CLOUD_ENABLED` | `false` | `true` で AWS 連携を有効化（`Ec2CloudStateProviderImpl` + ポーラー） |
| `SERVERHUB_CLOUD_AWS_REGION` | `ap-northeast-1` | 問い合わせるリージョン。IAM ポリシーの `aws:RequestedRegion` と合わせる |
| `SERVERHUB_CLOUD_POLL_INTERVAL` | `PT1M` | ポーリング間隔（ISO-8601 Duration）。数百台規模なら間隔を伸ばす |
| `SERVERHUB_CLOUD_STALENESS_THRESHOLD` | `PT5M` | これを超えて未取得なら UI で「情報が古い可能性」を表示（ポーリング約 5 回分） |
| `SPRING_PROFILES_ACTIVE` | （未設定） | 本番デプロイでは `prod` を設定。`application-prod.yml` が Secure Cookie・`forward-headers-strategy`（前段プロキシの `X-Forwarded-*` 信頼）・Swagger 認証必須・`com.serverhub` ログを INFO に切り替える |

> `SERVERHUB_CLOUD_POLL_INTERVAL` / `SERVERHUB_CLOUD_STALENESS_THRESHOLD` は
> `serverhub.cloud.poll-interval` / `serverhub.cloud.staleness-threshold` に対応（Spring のリラックスバインディング）。

---

## 5. 有効化の手順（本番）

1. §3.5 で IAM ロールを作成し、ServerHub の計算リソースにアタッチする。
2. デプロイ環境に `SERVERHUB_CLOUD_ENABLED=true`（必要なら `SERVERHUB_CLOUD_AWS_REGION`）を設定する。
3. Backend を再デプロイ / 再起動する。
4. ServerHub の各サーバー詳細画面「AWS 連携」で EC2 インスタンス ID を登録する。
5. 数分（ポーリング間隔）で実行状態が表示される。すぐ確認したい場合は「今すぐ更新」。

### 障害時の挙動

- AWS への問い合わせが失敗しても、**ServerHub の一覧・詳細・ダッシュボードは通常どおり動く**。
- 実行状態は「最後に取得できた値」を「最終取得 HH:MM」付きで表示し、取得失敗を明示する。
- 取得できないことを理由に `servers.status` を変更することはない。

---

## 6. 無効化 / ロールバック

- `SERVERHUB_CLOUD_ENABLED=false`（または未設定）にして再起動するだけ。
- テーブル `server_cloud_links` の紐付けデータは残るが、参照・更新されなくなる（画面には「AWS 未連携」ではなく
  最後の状態が「情報が古い」状態で残る点に注意。完全に消すなら各サーバーで「連携を解除」）。
- IAM ロールは残しておいて問題ない（`DescribeInstances` の読み取り専用のみ）。

---

## 7. ServerHub 本体のデプロイ（EC2 1 台・非 Docker）

構成の決定は [ADR 0005](../../docs/adr/0005-deployment-ec2-single-instance.md)。

```
[EC2 1台]  Amazon Linux 2023 / t3.small
  ├─ nginx（OS パッケージ）        :443  TLS 終端 + SPA 配信 + /api → 127.0.0.1:8080
  └─ serverhub-backend.jar（systemd）  :8080（ループバックのみ）
        └─→ Neon（managed PostgreSQL, SSL）
IAM インスタンスプロファイル: AmazonSSMManagedInstanceCore + serverhub-ec2-readonly
運用アクセス: SSM Session Manager（SSH ポートは開けない）
```

配置ファイル（このディレクトリ）:

| ファイル | 置き場所 | 役割 |
|---|---|---|
| `nginx-serverhub.conf` | `/etc/nginx/conf.d/serverhub.conf` | SPA 配信 + `/api` プロキシ + TLS（certbot が 443 を追記） |
| `serverhub.service` | `/etc/systemd/system/serverhub.service` | backend jar の systemd unit |
| `serverhub.env.example` | `/etc/serverhub/serverhub.env`（実値を入れる） | DB 接続先・プロファイル・cloud 設定 |
| `bootstrap.sh` | — | 初回セットアップ（root で 1 回） |
| `deploy.sh` | — | 更新デプロイ（Release から取得して差し替え） |

### 7.1 AWS 側の準備（コンソール / CLI）

1. **IAM ロール**: §2 のポリシー `serverhub-ec2-readonly` と AWS 管理ポリシー
   `AmazonSSMManagedInstanceCore` をアタッチしたロール `serverhub-app-role`（信頼: EC2）を作成。
2. **EC2 インスタンス**: Amazon Linux 2023 / t3.small / gp3 20GiB。上記ロールをインスタンスプロファイルに指定。
3. **Elastic IP** を割り当て。
4. **セキュリティグループ**: インバウンドは **80 / 443 のみ**（`0.0.0.0/0`）。**22 は開けない**。
5. **Neon**: 本番用ブランチ / DB / ロールを作り、JDBC 接続文字列（`?sslmode=require`）を控える。
6. **ドメイン**: A レコードを Elastic IP へ（TLS の前提。未取得なら 7.3 まで進めて 7.4 は後回し）。

### 7.2 EC2 初回セットアップ

SSM Session Manager で接続し:

```bash
sudo dnf install -y git
git clone https://github.com/hayatoogawa1/serverhub.git
cd serverhub
sudo bash infra/aws/bootstrap.sh <your-domain>     # 例: serverhub.example.com
```

`bootstrap.sh` がやること: パッケージ導入（Java 17 / nginx / certbot / git）、`serverhub` システムユーザー、
`/opt/serverhub` `/var/www/serverhub` `/etc/serverhub` 作成、systemd unit 配置、nginx server block（80 番）配置、
SELinux `httpd_can_network_connect` 有効化。

### 7.3 設定値を入れる

```bash
sudo vi /etc/serverhub/serverhub.env
#   SPRING_PROFILES_ACTIVE=neon,prod
#   SPRING_DATASOURCE_URL/USERNAME/PASSWORD = Neon の値
#   SERVERHUB_CLOUD_ENABLED=true / SERVERHUB_CLOUD_AWS_REGION=ap-northeast-1
```

### 7.4 TLS 証明書（ドメインがある場合）

```bash
sudo certbot --nginx -d <your-domain> --redirect --agree-tos -m <your-email> -n
sudo systemctl enable --now certbot-renew.timer      # 自動更新
```

### 7.5 初回デプロイ

先に GitHub でタグを打つと Actions（`release.yml`）が jar とフロント dist をビルドして Release に添付する:

```bash
git tag v1.0.0 && git push origin v1.0.0     # 手元 or GitHub UI で
```

EC2 上で:

```bash
cd ~/serverhub && git pull
bash infra/aws/deploy.sh v1.0.0
```

`deploy.sh`: Release からアーティファクト取得 → `SHA256SUMS` 検証 → jar 配置 + シンボリックリンク →
`dist` 配置 → `systemctl restart serverhub` → `/actuator/health` を待つ → `nginx -s reload`。
ヘルスチェックに失敗したら前バージョンの jar に戻す。

### 7.6 動作確認

- `https://<domain>/` → ログイン画面 + 証明書有効、HTTP→HTTPS リダイレクト
- ログイン: `admin@serverhub.local` / **`serverhub-demo-2026`**（`prod` プロファイルの `db/prod/V100` で
  `password` から変更される。デモ用でありポートフォリオ公開を想定した固定値）
- サーバー CRUD / 検索 / メンテ履歴 / ダッシュボード
- Swagger UI（`/swagger-ui.html`）が**認証必須**になっている
- サーバー詳細「AWS 連携」で実 EC2 の Instance ID を登録 →「今すぐ更新」→ 実行状態が出る（IAM ロール経由）
- DevTools でセッション Cookie に `Secure` 属性

### 7.7 更新 / ロールバック

```bash
# 更新: 新しいタグを push → Release 生成を待つ → EC2 で
bash infra/aws/deploy.sh v1.1.0

# ロールバック（アプリのみ）: 直前の jar に戻す
sudo ln -sfn /opt/serverhub/serverhub-backend-<前のバージョン>.jar /opt/serverhub/serverhub-backend.jar
sudo systemctl restart serverhub
```

- **DB マイグレーションは前方のみ**。スキーマ変更を含むリリースのロールバックは、jar を戻すだけでは
  不整合になりうる。`db/migration` の差分を確認し、必要なら手動で対応する。
- ログ: `journalctl -u serverhub -f`（構造化 JSON）。nginx: `/var/log/nginx/`。

### 7.8 運用メモ

- **バックアップ**: Neon の PITR（自動）。EC2 側にアプリの状態は持たない。
- **OS 更新**: `sudo dnf upgrade` を定期的に。`dnf-automatic` 任意。
- **再起動耐性**: `serverhub` / `nginx` は `systemctl enable` 済み。EC2 の Auto Recovery を有効に。
- **監視**: 最低限 `/actuator/health`。CloudWatch agent（メモリ / ディスク）は任意。
