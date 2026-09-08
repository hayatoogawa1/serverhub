# serverhub-frontend

ServerHub の Frontend（React + TypeScript + Vite）。

## セットアップ

```bash
nvm use            # .nvmrc（Node 24）
npm ci
npm run dev        # http://localhost:5173  （/api は :8080 へプロキシ）
```

Backend を先に起動しておくこと（リポジトリルート README 参照）。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック（`tsc -b`）＋ 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run typecheck` | 型チェックのみ |
| `npm run lint` | ESLint（型情報つき） |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run test` | Vitest（1 回実行） |
| `npm run test:watch` | Vitest（watch） |

## ディレクトリ構成（横スライス = レイヤ別）

```
src/
├── app/          合成ルート（App / router / routePages（遅延ロード）/ queryClient / theme）
├── pages/        ルーティング単位の画面（SC-01〜08）。components + hooks を組み立てる
├── components/
│   ├── common/       DataTable / Pagination / Modal / ConfirmDialog / StatusChip /
│   │                 EnvironmentChip / TagChip / TagList / TagInput / CopyButton /
│   │                 ServerPicker / StatePlaceholder / PageHeader
│   ├── layout/       AppLayout / AppHeader / AppSidebar
│   ├── feedback/     FeedbackProvider（トースト）
│   ├── auth/         LoginForm / AuthGuard
│   ├── servers/      ServerListTable / ServerSearchBar / ServerDetailView / ServerFormModal
│   └── maintenance/  MaintenanceHistoryListTable / MaintenanceHistoryFormModal /
│                     ServerMaintenanceHistorySection
├── hooks/        TanStack Query ラップ。auth.ts / servers.ts / maintenance.ts / tags.ts
│                 + useDebouncedValue.ts
├── api/          client.ts（Axios 唯一のインスタンス）/ errors.ts / queryKeys.ts
│                 + auth.ts / servers.ts / maintenance.ts / tags.ts（各 interface + Impl + singleton）
├── types/        api.ts（Page / ApiError / SortOrder）/ domain.ts（enum）/ auth.ts / server.ts / maintenance.ts
├── validation/   server.ts / maintenance.ts（フォーム検証 + フォーム値→ボディ変換）
├── url/          serverListParams.ts / maintenanceListParams.ts（URL クエリ ⇔ 型付きパラメータ）
├── constants/    pagination.ts
├── utils/        format.ts / validation.ts（純粋関数）
├── mocks/        MSW（テスト専用）
└── test/         テストセットアップ
```

### レイヤと Backend の対応

| レイヤ | 役割 | Backend 相当 |
|---|---|---|
| `pages/*Page.tsx` | 画面。イベント・画面遷移 | Controller（画面） |
| `components/<domain>/` | ドメイン固有の UI 部品 | — |
| `hooks/<domain>.ts` | TanStack Query ラップ・キャッシュ・invalidate | Service（オーケストレーション） |
| `validation/<domain>.ts` `url/*.ts` | 入力検証・URL 変換 | Service（ルール） |
| `api/<domain>.ts` | `interface XxxApi` + `class XxxApiImpl` + `export const xxxApi`。HTTP 呼び出し | DAO |
| `api/client.ts` + インターセプタ + `api/errors.ts` | Axios 設定・401 横断・エラー正規化 | 設定 + GlobalExceptionHandler |
| `types/` | API DTO / ドメイン enum | DTO / Entity |

**依存の向き**: `pages → components / hooks → api → client` の一方向。逆流させない。
例外は `AppHeader → hooks/auth`、`ServerPicker` / `TagInput` → `hooks/*` の「接続済み共通部品」のみ。

**命名規約（[CLAUDE.md](../CLAUDE.md) §4）**: 実装クラスは `Impl` 末尾。FE では api 層のみ該当。

### 機能を追加/変更するときに触るファイル

- 一覧に列を足す → `types/server.ts`。Backend の Summary DTO に無ければ**そこで止める**（FE で N+1 しない）
- 新しい API を呼ぶ → `api/<domain>.ts`（interface にメソッド追加 + Impl）→ `hooks/<domain>.ts` でラップ
- 新しい画面 → `pages/XxxPage.tsx` + 必要なら `components/<domain>/` + `app/routePages.ts` に
  `lazy()` エントリ追加 + `app/router.tsx` にルート追加（画面はルート単位で遅延ロード。読み込み中は
  `router.tsx` の `Suspense` 境界がスピナーを表示する）

### 方針（詳細は CLAUDE.md §3）

- **Axios を各コンポーネントから直接呼ばない。** `src/api/` 経由（ESLint で `axios` の直接 import を禁止）。
- 共通部品は「似ているから」ではなく 2 箇所目で必要になった時点で切り出す。
- API 通信は TanStack Query でラップした hook 経由。queryKey は階層構造。
