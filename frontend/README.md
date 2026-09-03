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
├── app/          エントリ近傍（App / router / queryClient / theme）
├── pages/        ルーティング単位の画面
├── features/     画面機能のまとまり（feature ごとに component / hook / api / types）
├── components/   共通表示部品（2 箇所目で必要になったら切り出す）
├── hooks/        共通 hook
├── api/          HTTP 通信。apiClient（Axios インスタンス）と API 関数群
├── types/        アプリ横断の型
├── utils/        純粋なユーティリティ
├── mocks/        MSW（handlers / server / browser）
└── test/         テストセットアップ・共通ユーティリティ
```

### 方針（詳細は CLAUDE.md §3）

- **Axios を各コンポーネントから直接呼ばない。** `src/api/` 経由（ESLint で `axios` の直接 import を禁止）。
- 共通部品は「似ているから」ではなく 2 箇所目で必要になった時点で切り出す。
- API 通信は TanStack Query でラップした hook 経由。queryKey は階層構造。
