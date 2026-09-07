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

## ディレクトリ構成

```
src/
├── app/          合成ルート（App / router / queryClient / theme）
├── pages/        ルーティング単位の画面（SC-01〜08）
├── features/     ドメインごとの縦スライス（auth / servers / maintenance / dashboard / tags）
├── components/   2 画面以上で使う共通表示部品
├── hooks/        横断 hook（useDebouncedValue 等）
├── api/          apiClient（唯一の Axios インスタンス）/ errors（ApiError 正規化）/ queryKeys
├── constants/    共有定数
├── types/        アプリ横断の型（ドメイン enum / API エンベロープ）
├── utils/        純粋関数（format / validation）
├── mocks/        MSW（テスト専用）
└── test/         テストセットアップ
```

### レイヤ構造（機能ごとに繰り返す）

Backend の Controller/Service/DAO のような**横方向の層**ではなく、`features/<domain>/` の中に同じ層を並べる**縦スライス**。

| ファイル | 役割 | Backend 相当 |
|---|---|---|
| `features/<d>/types.ts` | DTO / ドメイン型 | DTO / Entity |
| `features/<d>/api.ts` | HTTP 関数（`getServers` …）→ `api/apiClient` | Controller のクライアント / DAO |
| `features/<d>/hooks.ts` | TanStack Query ラップ・キャッシュ・invalidate | Service（オーケストレーション） |
| `features/<d>/formValidation.ts` `searchParams.ts` | 入力検証・URL 変換などの業務ルール | Service（ルール） |
| `features/<d>/components/` | その機能専用の表示部品 | — |
| `pages/*Page.tsx` | 画面。features + 共通部品を組み立てる | Controller（画面遷移・イベント） |
| `api/errors.ts` + `apiClient` インターセプタ | エラー正規化・401 横断 | GlobalExceptionHandler |

**依存の向き**: `pages → features → {components, hooks, utils}`、`features/*/api → apiClient` の一方向。
例外は `AppHeader → features/auth`、`ServerPicker`/`TagInput` → `features/*` の「接続済み共通部品」のみ（[06-ui §3](../docs/design/basic/06-ui.md)）。

### 機能を追加/変更するときに触るファイル

例: サーバー一覧に列を足す → `features/servers/types.ts`（型）→ Backend の Summary DTO に無ければ**そこで止める**（FE で N+1 しない）。
新しい画面 → `pages/XxxPage.tsx` + `features/<d>/`（api・hooks・components）+ `app/router.tsx` にルート追加。

### 方針（詳細は CLAUDE.md §3）

- **Axios を各コンポーネントから直接呼ばない。** `src/api/` 経由（ESLint で `axios` の直接 import を禁止）。
- 共通部品は「似ているから」ではなく 2 箇所目で必要になった時点で切り出す。
- API 通信は TanStack Query でラップした hook 経由。queryKey は階層構造。
