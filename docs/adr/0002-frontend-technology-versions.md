# ADR 0002: Frontend の技術スタックとバージョン確定

- ステータス: Accepted
- 日付: 2026-09-03
- フェーズ: Phase 0-4（Frontend 初期化）

## 背景

CLAUDE.md には当初 React 18 / Vite 5 / MUI 5 / React Router 6 と記載していたが、これは
Phase 0 着手前の草案で、2026-09 時点ではいずれも数世代前。Backend で「サポート中の最新」を
採用したのと整合させ、Frontend も現行安定版へ更新することをオーナー承認のうえ決定した。

## 決定

| 項目 | バージョン | 補足 |
|---|---|---|
| React / React DOM | **19.2** | 19 系は 2 年以上安定。MUI・Router・Query いずれも対応済み |
| TypeScript | **~6.0.2**（6.0.x に固定） | 最新は 7.x（ネイティブ移植版）だが `typescript-eslint` の peer が `>=4.8.4 <6.1.0` のため 7.x は不可。6.0.x を採用 |
| Vite | **8.2** | `@vitejs/plugin-react` 6.1 |
| Node.js | **20.19 系（`.nvmrc`）** | ⚠️ Node 20 は 2026-04-30 に EOL。下記「未解決」参照 |
| MUI | **@mui/material 9.4** + `@emotion/react` / `@emotion/styled` 11 | |
| ルーティング | **react-router-dom 7.18** | SPA 用途。`createBrowserRouter` + `RouterProvider` |
| データ取得 | **@tanstack/react-query 5.102** | queryKey は階層構造。Axios を直接呼ばず api/ 層経由 |
| HTTP | **axios 1.20** | `apiClient`（単一インスタンス、`withCredentials: true`） |
| テスト | **Vitest 4.1** + `@testing-library/react` 16 + `@testing-library/jest-dom` 7 + `@testing-library/user-event` 14 + **jsdom 28** | jsdom 30 は Node 22.13+ 必須のため、Node 20 でも動く 28 系に固定 |
| API モック | **MSW 2.15** | `mockServiceWorker.js` を `public/` に配置済み。テストは `msw/node` |
| Lint | **ESLint 10 flat config** + `typescript-eslint` 8.69（型情報つき `recommendedTypeChecked` + `stylisticTypeChecked`）+ `eslint-plugin-react-hooks` 7 + `eslint-plugin-react-refresh` | Vite 8 テンプレート既定の oxlint は不採用（型認識ルールを優先）。`no-restricted-imports` で `axios` の直接 import を禁止 |
| フォーマット | **Prettier 3.9** + `eslint-config-prettier` | semi なし / single quote / trailing comma all / printWidth 100 |

## 補足・設計判断

- **ビルドツールのテンプレートは `npm create vite@latest -- --template react-ts`（create-vite 9）** を出発点にし、
  oxlint を ESLint + typescript-eslint に置き換え、tsconfig に strict / パスエイリアス（`@/*`）/ テスト型を追加。
- **開発時は Vite の proxy で `/api` → `http://localhost:8080` に転送**。SPA を Backend と同一オリジンで
  動かし、セッション Cookie / CSRF を素直に扱う（CLAUDE.md §3 の「SPA はバックエンドと同一ドメイン配信前提」）。
- **`apiClient` は `src/api/` に単一定義**。コンポーネント / hook からの `axios` 直接 import は ESLint で
  エラーにする。

## 検証状況（Phase 0-4 時点）

- [x] `npm run typecheck` 成功
- [x] `npm run lint` 成功（`axios` 直接 import 禁止ルールを含む型情報つき lint）
- [x] `npm run test` 成功（Vitest、HomePage の描画テスト 1 件）
- [x] `npm run build` 成功（`tsc -b` + `vite build`）
- [x] `npm run format:check` 成功（Prettier）

## 未解決 / 要対応

- **Node 20 は EOL（2026-04-30）**。ローカルは `v20.19.2`。現状は動作するが、早期に
  **Node 24（Active LTS、EOL 2028-04）** へ更新し、あわせて以下を戻す:
  - `.nvmrc` を `24` へ
  - `jsdom` を最新（30 系）へ
  - `package.json` の `engines.node` を更新
  → 別 PR で対応し、本 ADR に追記する。

## 影響

- CLAUDE.md「2. 技術スタック」、README「技術スタック」を本 ADR に合わせて更新。
- ルート `README.md` の Frontend セットアップ手順を記載。
