# AWS 連携（EC2 実行状態の参照）

ServerHub の「AWS 連携」機能（FR-CLOUD-01、設計 [07-aws-ec2-integration](../../docs/design/basic/07-aws-ec2-integration.md)）を
本番で有効化するための IAM 設定とデプロイ手順。

> **既定は無効。** ローカル開発・CI では `serverhub.cloud.enabled=false`（`DisabledCloudStateProviderImpl`）で
> 動作し、AWS には一切アクセスしない。有効化しなくても ServerHub の全機能（台帳・検索・メンテ履歴・
> ダッシュボード）は動く。

---

## 1. できること / できないこと

| できること | できないこと（設計上の禁止事項） |
|---|---|
| 紐付けた EC2 インスタンスの**実行状態を参照**（`running` / `stopped` 等） | EC2 の**起動・停止・再起動・終了**（`ec2:StartInstances` 等は使わない） |
| 定期ポーリング（既定 5 分）＋ 明細画面からの手動更新 | 構成情報の自動取得・`servers` 属性の自動更新 |
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
| ローカルで実 AWS を試す開発者 | `SERVERHUB_CLOUD_ENABLED=true` + `AWS_PROFILE` など SDK 標準の方法（`~/.aws/credentials`）。キーはリポジトリ・`.env`（コミット対象）に置かない |
| CI / 自動テスト | `enabled=false`（既定）。フェイク／Disabled provider。AWS を呼ばない |

- ServerHub は AWS のアクセスキー・シークレットを **DB にもソースにも保存しない**（`BR-11` / requirements §10.1.9）。
- `DescribeInstances` のレスポンスのうち ServerHub が保存するのは **`state` / `state_raw` のみ**（最小取得）。

### 3.1 IAM ロール作成の手順（例: マネジメントコンソール）

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
| `SERVERHUB_CLOUD_POLL_INTERVAL` | `PT5M` | ポーリング間隔（ISO-8601 Duration） |
| `SERVERHUB_CLOUD_STALENESS_THRESHOLD` | `PT15M` | これを超えて未取得なら UI で「情報が古い可能性」を表示 |

> `SERVERHUB_CLOUD_POLL_INTERVAL` / `SERVERHUB_CLOUD_STALENESS_THRESHOLD` は
> `serverhub.cloud.poll-interval` / `serverhub.cloud.staleness-threshold` に対応（Spring のリラックスバインディング）。

---

## 5. 有効化の手順（本番）

1. §3.1 で IAM ロールを作成し、ServerHub の計算リソースにアタッチする。
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
