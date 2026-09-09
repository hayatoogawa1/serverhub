---
name: spec-sync
description: コードを変更したときに、(1) 変更が既存テストで足りているか確認し、不足・ズレがあればテストを追加・修正し、(2) 関連する設計ドキュメント（docs/ 配下）と CLAUDE.md / README を同じ PR 内で追従させるための手順。「テストを新規に足す」ではなく「既存テストで十分か判断して過不足を直す」スキル。CLAUDE.md「7. 仕様変更時の手順」「テストなしで機能完成と判断しない」の運用。完了直前の全体検証は verify Skill。
---

# spec-sync — コード変更をテストとドキュメントに追従させる

「コードだけ変更してテストと設計書を放置しない」を担保する。1 つの実装 PR に、対応する
テストの追加/修正とドキュメント更新を含める。

## 流れ

1. **影響範囲を調査** — 変更したレイヤ / 機能と、変わったシンボル（DTO フィールド・
   エラーコード・エンドポイントのパス・SQL カラム・enum 値・表示ラベル / メッセージ等）を特定する。
2. **既存テストへの影響を確認** — 下記「変更タイプ → 見るテスト」で対象を絞り、変わった
   シンボルを `backend/src/test` と `frontend/src/**/*.test.*` から grep する。変更後の実態と
   食い違う assertion（rename・ラベル変更・エラーコード変更・JSON 形式変更で「通るが古い」に
   なったもの）を洗い出す。
3. **十分かを判断し、テストを追加/修正** — 「テストを足す」ではなく「この変更が既存テストで
   カバーされているか。されていなければ追加、ズレていれば修正」。判断基準は下記
   「『十分か』の確認ポイント」。
4. **テストを実行** — まず対象を絞って（`./gradlew test --tests "com.serverhub.<pkg>.<Name>*"` /
   `npx vitest run <path>`）green を確認する。落ちたらログを添えて報告（握り潰さない）。
5. **設計ドキュメントを同期** — 下記「変更箇所とドキュメントの対応」。
6. PR の説明に「変更内容」「追加/修正したテスト」「更新した設計書」を列挙する。

### verify Skill との責務分担

- **spec-sync（変更中）**: 変わったシンボルの洗い出し → 既存テストへの影響確認 → 不足していれば
  テストを追加/修正 → 設計ドキュメント同期。上の 4 はあくまで「触ったテストがまず通るか」の確認。
- **[verify](../verify/SKILL.md)（完了直前）**: `make check`（BE `./gradlew check` = compile +
  spotlessCheck + test、FE typecheck + lint + format:check + test）と `make fe-build` を通し切って
  「完了」と判断する最終ゲート。spec-sync でテストを整えた前提で verify を回す。

## 変更タイプ → 見るテスト（このプロジェクトの構成）

| 変更した箇所 | 主に見る / 足すテスト |
|---|---|
| Service の業務ロジック・業務ルール | `<Name>ServiceTest`（実装分離した Service は `<Name>ServiceImplTest`。例: `ServerServiceTest` / `CloudLinkServiceImplTest`）。`@ExtendWith(MockitoExtension.class)` で DAO をモック、JUnit 5 + AssertJ。新しい分岐・例外を 1 ケース以上 |
| スケジューラ / 非同期コンポーネント（Poller・Refresher 等） | `<Name>Test`（`CloudStatePollerTest` / `CloudStateRefresherTest`。Mockito 単体、`verify(...)` で副作用の呼び出し有無を確認） |
| API（エンドポイント / リクエスト / レスポンス / ステータス / エラー） | `<Name>ApiIntegrationTest`（`@SpringBootTest` + `@AutoConfigureMockMvc` + `@Testcontainers`。認証フローは `AuthIntegrationTest`）。正常系 + `401` + 主要なエラー（`400`/`404`/`409`/`503`）。レスポンス JSON の形を変えたら `jsonPath` を追加/修正 |
| DAO / SQL / マイグレーション | `<Name>DaoIntegrationTest`（Testcontainers 実 DB）で SQL の正しさ。既存の API 結合テストがそのマイグレーションを通ることも確認。**`db/prod` の本番専用マイグレーション**は `ProdMigrationIntegrationTest`（`@ActiveProfiles("prod")`）に検証を追加 |
| 設定 / プロファイル / `application*.yml` | 値だけなら `ProdProfileConfigTest` 方式（YAML を直接読んで検証、コンテキスト不要）。配線が絡むなら `ServerHubApplicationTests`（context load）で担保されるか確認 |
| バリデーション / 変換（validator / mapper / enum / record） | 純粋な `<Name>Test`（Mockito 不要）。正常 + 不正形式 + 境界 + 未知値 |
| FE: コンポーネント / hook / 画面 | 実装ファイルと同ディレクトリの `<Name>.test.tsx`（Vitest + React Testing Library、`renderWithProviders`）。表示・イベント・正常系・異常系。API 通信を伴うものは MSW でモック |
| FE: 新しい API 呼び出し・レスポンス形の変更 | **MSW ハンドラを追従させる**（無い / 古いと他の画面テストが unhandled request や古い JSON で落ちる）。ドメイン API のハンドラ工場は `src/mocks/serverFixtures.ts`（`serverHandlers()` / `cloudLinkHandlers()` / `maintenanceHandlers()` / `dashboardHandlers()` と各 `*Fixture`）、認証・セッション既定は `src/mocks/handlers.ts`（`authenticatedHandlers` / `loginHandler()`）。該当する工場に分岐・fixture を追加し、hook / 画面テストで成功・失敗（エラーコード）両方を確認 |
| FE: 表示文言・ラベル・エラーメッセージ | その文字列を assert している全テスト（`getByText` / `getByRole({ name })` / `findByText`）を grep して追従 |

テスト命名の慣習: `<Name>ServiceTest` / `<Name>ServiceImplTest` = Mockito 単体、
`<Name>ApiIntegrationTest`（認証は `AuthIntegrationTest`）= MockMvc + Testcontainers、
`<Name>DaoIntegrationTest` = 実 DB、`<Name>Test` = 純粋単体（record / validator / mapper / enum /
Poller / Refresher）。FE は実装ファイルと同ディレクトリの `<Name>.test.tsx`。
迷ったら `backend/src/test` / `frontend/src` の既存ファイル名を grep して倣う。

## 「十分か」の確認ポイント

- 変更した振る舞いに対応するテストが**ある**か。無ければ未完了（CLAUDE.md §5）。
- 観点（CLAUDE.md §5）に照らして抜けが無いか: 正常系 / 異常系（必須未入力・不正形式・
  不存在 ID・重複・認証/権限・DB/API エラー）/ 境界値（最小・最大・最大文字数・0件・1件・
  ページ先頭/末尾/存在しないページ）。**変更でこれらの条件が増減した箇所のみ**追加/修正する
  （関係ない観点まで網羅しようとしない）。
- 既存テストの assertion が変更後の実態と一致しているか（rename・ラベル・エラーコード・
  日時フォーマット等で「通るが内容が古い」を放置しない）。
- 回帰: 既存テストは緑のまま。件数を減らさない（PR 説明で BE/FE テスト件数の推移を書く慣習）。
- 「既存 API / 画面仕様を壊さない」変更は、既存テストが**修正なしで**通ることが確認になる。
  既存テストの assertion を直す必要が出たら、それは破壊的変更の可能性 — 意図をオーナーに確認する。
- テストを**通すために消さない / 弱めない**（`assert` を削る、`expect` を緩めるだけの変更は禁止）。
  変更した仕様に合わせて assertion を書き換えるのは可、その場合は PR 説明に「何を・なぜ変えたか」を書く。
- DTO フィールド名・表示ラベル・エラーコード・日時フォーマット（`OffsetDateTime` 化等）を変えたら、
  その文字列 / キーを assert している既存テストが「通るが古い」状態で残っていないか grep で確認する。

## 変更箇所とドキュメントの対応

| 変更した箇所 | 見直すドキュメント |
|---|---|
| 技術スタック / バージョン / ビルド設定 | `docs/adr/`（新規 ADR を追加）、`CLAUDE.md` §2、`README.md` 技術スタック |
| API（エンドポイント / DTO / ステータス / エラー） | `docs/design/basic/02-api.md`、`docs/design/detail/`、エラーコードは `docs/design/detail/01-common.md` の一覧、OpenAPI（コード側アノテーション） |
| DB スキーマ / マイグレーション | `docs/db/`、`docs/design/basic/03-data-model.md` の ER 図・テーブル一覧 |
| 画面 / 画面遷移 | `docs/design/basic/06-ui.md` 画面一覧・遷移図、`docs/design/detail/` 画面詳細 |
| 認証 / 認可 / セキュリティ方針 | `CLAUDE.md` §3、`docs/design/basic/04-security.md`、`docs/design/detail/02-auth.md` |
| 横断（ログ / 例外 / トランザクション） | `docs/design/basic/05-cross-cutting.md` §4 |
| 監査列（`created_at` / `updated_at`）・日時の扱い | `docs/design/detail/01-common.md` §4（Doma `EntityListener`・`Timestamps#toOffset`・D-API-05）、`docs/design/basic/03-data-model.md` の監査列項目 |
| エラーコードの追加 / 変更 | `docs/design/detail/01-common.md` §3.3 コード一覧 + §3.2 追加ルール、`ErrorCode` enum、対応する `*ExceptionHandler` |
| コマンド / 開発手順 / デプロイ | `README.md` よく使うコマンド、`CLAUDE.md` §10、`Makefile`、`infra/aws/README.md` |
| 用語 / 業務ルール / スコープ / 未決事項 | `docs/requirements/`（`requirements.md` / `open-issues.md`） |
| フェーズ進行中の作業項目 | `docs/design/phase10-review-backlog.md` 等のフェーズ作業リスト |

実体は表を起点に grep で確認する（表を鵜呑みにしない）。

## 注意

- **このプロジェクトで実際に使っているテスト手法のみ**を使う（BE: JUnit 5 / Mockito / MockMvc /
  Testcontainers / AssertJ、FE: Vitest / React Testing Library / MSW / jsdom）。E2E ツール・
  契約テスト・ミューテーションテスト等は導入されていないので勝手に足さない。
- ドキュメントが未作成のフェーズは「後続フェーズで反映」と PR に明記すれば可。ただし ADR と
  CLAUDE.md / README は常に同期する。
- 決定を変える場合、既存 ADR は書き換えず新しい ADR を追加して旧 ADR に `Superseded` を追記。
