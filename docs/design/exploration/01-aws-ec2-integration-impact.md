# 探索: AWS EC2 連携が既存設計に与える影響（Phase 9 事前調査）

- 位置づけ: **Phase 9 で正式設計・実装する前提の事前調査**。ここでは既存設計（Phase 1〜8）への
  影響と、Phase 9 の設計で確定すべき論点の洗い出しに留める。**本番コードは追加しない。**
- 関連: [open-issues E1](../../requirements/open-issues.md)（実サーバー連携＝MVP 後の独立フェーズ）/
  [open-issues E2](../../requirements/open-issues.md)（本調査）/
  [03-data-model](../basic/03-data-model.md) §5 / [01-architecture](../basic/01-architecture.md) §4.3 /
  [requirements §14](../../requirements/requirements.md)
- 最終更新: 2026-09-08

---

## 0. 前提と非目標

- ServerHub は「サーバー**台帳**」。台帳の一元化・検索・変更履歴が中核価値で、これは AWS 連携の
  有無と独立している（E1）。
- AWS 連携で**やりたいこと（Phase 9）**: EC2 インスタンスの**実行状態を参照表示**する（読み取り専用）。
- **やらないこと**: EC2 の起動/停止などの操作、構成の自動反映、`servers` の属性上書き、
  ServerHub の管理 `status` の自動更新。
- 前提条件（E1 由来、変更なし）: 認証情報の値は保存しない（`BR-11` / §10.1.9）。AWS へのアクセスは
  IAM ロール（M2M）で行い、ユーザーセッションとは分離する。

---

## 1. EC2 インスタンスと ServerHub の Server をどのキーで紐付けるか

### 候補

| キー | 安定性 | 一意性 | 備考 |
|---|---|---|---|
| **EC2 インスタンス ID**（`i-0abc…`） | インスタンス生存中は不変。終了で再利用されない | 1 パーティション内で一意 | 最有力。ARN の末尾要素 |
| インスタンス ARN（`arn:aws:ec2:<region>:<account>:instance/i-…`） | 同上 | リージョン・アカウントまで含み完全 | マルチアカウント/リージョンで曖昧さがない。冗長 |
| Private IP / Private DNS | 可変・再利用される | × | 紐付けキーにしない |
| EC2 タグ（例 `serverhub:id`） | 運用次第 | 運用次第 | 逆引き（AWS 側から ServerHub を指す）には有用。主キーにはしない |

### 推奨

- 紐付けは **`(provider, external_id)`** の組で保持する。`provider = "aws_ec2"`、
  `external_id = インスタンス ID`。
- リージョン・アカウントは **別カラムで併せて保持**（`region` / `account_id`）。
  API 呼び出しに必要で、マルチアカウント運用時の識別にも使う。ARN を 1 本で持つ案もあるが、
  分解して持つ方が provider 非依存にしやすい（§5）。
- 紐付けは**任意**。未設定の Server は「手動管理／オンプレ」を意味する（`ip_address` が任意なのと同じ思想、B3）。
- 紐付け方法（Phase 9 で確定）: まずは編集フォームでインスタンス ID を手入力。将来
  「EC2 一覧から取り込み（discover/import）」を足せるが、スコープは Phase 9 判断。

### 既存設計への影響

- `servers.id` は代理キーで、新テーブルの FK 先にできる（[03-data-model §5](../basic/03-data-model.md) が
  この拡張パターンを既に想定）。**MVP スキーマの変更は不要**。

---

## 2. AWS 実行状態を DB に保持するか、画面表示時に取得するか

### モデル

| 案 | 長所 | 短所 |
|---|---|---|
| **A. 表示時に都度ライブ取得** | 常に最新。バックグラウンド基盤不要 | 一覧・ダッシュボードの全行で `DescribeInstances` が要る。レイテンシ・レート制限・AWS 障害が画面に直結 |
| **B. DB キャッシュ + 定期ポーリング** | 読み取りが速い。AWS 断でも「HH:MM 時点」で表示継続。ダッシュボード集計が可能 | スケジューラ／ワーカーが要る。消えたインスタンス（terminated）の扱いが要る（E1 が言う「非同期基盤」コスト） |
| **C. B + 明細画面の「今すぐ更新」ボタン** | 通常は速い。ピンポイントで最新化できる | B に手動リフレッシュ経路を足すだけ |

### 推奨: **C（DB キャッシュ + オンデマンド更新）**

- 実行状態と「取得時刻」を DB に保持。一覧・ダッシュボードはキャッシュを読む。
- 明細画面はキャッシュ値 + 「最終取得 HH:MM」+ 更新ボタン（その 1 台だけライブ取得）。
- ポーリング間隔は設定値（例 5 分）。**Phase 9 までは無効（ポーラー未起動）**。
- フロントに `refetchInterval` を持たせない既存方針（S8）と整合。鮮度管理はサーバー側に閉じる。

### 既存設計への影響

- 新しい状態はすべて**新テーブル側**に置く（§5）。`servers` 本体・`version`・`updated_at` には触れない。
  → **ポーラーの書き込みが楽観ロックや「更新日時」を汚さない**ことが設計条件。
- スケジューラを同一 Spring アプリに置くか別ワーカーにするかは、セッションストア（S6）・
  スケールアウト方針と一緒に Phase 9 で判断。

---

## 3. AWS API 障害時の表示

- キャッシュに「取得時刻」があるため、UI は常に「HH:MM 時点」と明示できる。古い値でも正直に見える。
- **更新（ポーリング/手動）が失敗**: 直近の既知値を出し続け、「取得できませんでした（最終取得 HH:MM）」を
  併記。値を空にしない。`status` にフォールバックしない。
- **インスタンスが見つからない**（terminated / 削除済み）: エラーではなく独立した状態
  （`gone` / `terminated`）として明示表示。
- AWS 障害は**サーバー一覧・明細・ダッシュボードを壊してはならない**。実行状態は台帳データに対する
  独立した「付加情報」であり、取得可否と無関係に台帳は読める（D-UI-03 の画面レジリエンス方針と同じ）。
- ポーラーのエラーは構造化ログ（`traceId` 付き、[05-cross-cutting](../basic/05-cross-cutting.md)）へ。
  ユーザーには出さない。
- 新エラーコード（例 `CLOUD_PROVIDER_UNAVAILABLE`）は Phase 9 で必要になった時点で
  [01-common §3](../detail/01-common.md) に追記（Q3 の運用）。

---

## 4. AWS 状態と ServerHub の管理 status をどう分離するか

**これは本調査の主眼。以下を確定事項として提案する。**

| | `servers.status`（既存） | クラウド実行状態（新規） |
|---|---|---|
| 意味 | 台帳エントリの**管理ライフサイクル**（B2）: `active`（運用中）/ `maintenance`（計画停止中）/ `retired`（廃止） | インスタンスの**観測された実行状態**: `running` / `stopped` / `pending` / `stopping` / `shutting-down` / `terminated` |
| 誰が決めるか | **人が手動で設定**。外部同期は一切書かない | **AWS からの取得のみ**。アプリ・ユーザーは書けない（read-only） |
| 格納先 | `servers.status`（`varchar` + CHECK、Java `Status`） | 新テーブルの `state` 列（別 `varchar` + 別 Java enum） |
| 命名 | `status` | `status` と呼ばない。`cloud_state` / `instance_state` / `runtime_state` |

- 両者を **CHECK 制約や enum で結び付けない**。別カラム・別型。
- 画面では**並べて表示**（例 明細: 「管理ステータス: メンテナンス中」＋「EC2 状態: stopped（最終取得 10:32）」）。
- 不一致（`status=active` かつ `EC2=stopped` 等）は**運用者への情報**。Phase 9 でダッシュボードに
  「要確認」パネルを置く案はあるが、**システムは自動整合させない**。
- `Status` enum（`ACTIVE`/`MAINTENANCE`/`RETIRED`）は**一切変更しない**。

### 既存設計への影響

- **コード変更は不要**。ただし業務ルールとして「**`status` は外部状態から導出・上書きしない**」を
  明文化する（本 PR で B2 / [03-data-model §5](../basic/03-data-model.md) に注記）。
- Phase 6〜8 で `status` に自動更新ロジックを足さないこと（今後の実装ガード）。

---

## 5. AWS 以外の環境にも対応できるデータモデルか

### 現状

`servers` にクラウド関連カラムは無い。[03-data-model §5](../basic/03-data-model.md) は
「複数 IP → 別テーブル」「認証情報 → Secret Manager の識別子のみ」を既に予約済み。
クラウド連携は**新しい次元**であり、この延長で足せる。

### 形の候補

| 案 | 内容 | 評価 |
|---|---|---|
| フラット列を `servers` に追加 | `cloud_provider` / `cloud_resource_id` / `cloud_region` / `cloud_account` / `cloud_state` / `cloud_state_at` | 単純。1 Server = 最大 1 リンク（単一 IP と同じ思想）。ただしポーラーが `servers` を UPDATE することになり、`version`/`updated_at` と干渉しやすい |
| **別テーブル**（例 `server_cloud_links`） | `server_id` FK / `provider` / `resource_id` / `region` / `account` / `state` / `state_raw` / `state_at`、`UNIQUE (provider, resource_id)` | `servers` を汚さない。ポーラーの書き込み経路を隔離できる。provider を増やせる。1:N 化も可能 |

### 推奨: **別テーブル**、キーは `(provider, external_id)`

- `provider` は文字列（`aws_ec2` → 将来 `gcp_gce` / `azure_vm` / `vmware` / `proxmox` …）。
- アプリは「外部システムの参照 ID ＋ 最後に観測した状態文字列 ＋ 取得時刻」として抽象的に扱う。
- `state_raw`（provider 生値）＋ `state`（provider 横断の粗い正規化 enum:
  `running` / `stopped` / `transitioning` / `unknown` / `gone`）の 2 段持ちにして、
  UI と将来のダッシュボードは正規化値に依存する。
- `virtualization_type`（`physical`/`virtual`）は現状維持。クラウドリンクは仮想を含意するが
  直交概念（ベアメタルクラウドもある）。

### 既存設計への影響

- **MVP スキーマ・Flyway の変更は不要**。Phase 9 で `V3__…` として新テーブルを追加するだけ。
- Doma のエンティティ／DAO を 1 セット足す。既存 Service には触れない
  （Controller↔Service 分離、[01-architecture §4.3](../basic/01-architecture.md)）。

---

## 6. 既存設計への影響まとめ

| 領域 | 影響 | Phase 9 までにやること |
|---|---|---|
| DB スキーマ（Flyway V1/V2） | **変更不要**。`server_cloud_links` を後から `V3` で追加 | なし |
| `servers` エンティティ / API | **変更不要**。明細レスポンスにクラウド状態を足すのは Phase 9 の加算的変更 | なし |
| `Status` enum / 管理ステータス | **変更不要**。ただし「外部状態から `status` を導出・上書きしない」を明文化 | 本 PR で B2 / 03-data-model §5 に注記 ✅ |
| Service 層 | 既存に触れず `CloudInstanceService`（仮）を追加できる（Controller↔Service 分離） | なし |
| 認証・セキュリティ | ユーザーセッションと分離した IAM ロール（M2M）。秘密情報は保存しない（E1 の前提を踏襲） | なし（Phase 9 で M2M 認証を設計） |
| 構造化ログ / traceId | ポーラーの診断に流用できる | なし |
| エラー設計 | 新コード（`CLOUD_PROVIDER_UNAVAILABLE` 等）は必要時に追記（Q3） | なし |
| フロントエンド | 実行状態は「付加情報」。取得可否と無関係に台帳画面は動く（D-UI-03 と同方針） | なし |
| Docker（Phase 8） | **影響なし**。Phase 8 では AWS 連携の本番コード・設定を入れない | なし |

**結論**: 既存設計は AWS EC2 連携を**破壊的変更なしに**受け入れられる。MVP 期間に守るべき不変条件は
1 点 —「**ServerHub の管理 `status` は外部（AWS）状態から自動更新しない**」。

---

## 7. Phase 9 で確定すべき論点（オーナー判断）

1. 紐付けの持ち方: **別テーブル `(provider, external_id)`**（推奨）か、`servers` フラット列か。
2. 実行状態の扱い: **DB キャッシュ + オンデマンド更新（案 C）**（推奨）か、ライブ取得か。
3. Phase 9 のスコープ: 手入力の紐付けのみか、EC2 discover/import まで含むか。
4. ポーラーの配置: 同一 Spring アプリ内スケジューラか、別ワーカーか（S6 / スケールアウトと関連）。
5. `status` と実行状態の不一致をダッシュボードで可視化するか（スコープ）。
6. 対象 provider の初期範囲（AWS EC2 のみで確定か、最初から汎用テーブルにするか — 推奨は汎用）。
