import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', 'public/mockServiceWorker.js'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      reactRefresh.configs.vite,
      prettier,
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Axios を直接コンポーネントから呼ばせない（api/ 層経由を強制）
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                'axios は src/api/apiClient.ts 経由で使うこと。コンポーネントから直接呼ばない。',
            },
          ],
        },
      ],
    },
  },
  {
    // 設定ファイル・テスト・モック・apiClient 自体では制約を緩める
    files: ['*.{js,ts}', 'src/test/**', 'src/mocks/**', 'src/api/apiClient.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
    languageOptions: {
      globals: { ...globals.node },
    },
  },
)
