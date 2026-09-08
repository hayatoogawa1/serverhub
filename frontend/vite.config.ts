/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // 変わりにくい大きめの依存を安定チャンクに固定し、リピート訪問のキャッシュ効率を上げる。
        // recharts はルート分割（DashboardPage のみ）で別チャンクになるためここには含めない。
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react'
          }
          if (/[\\/](@mui|@emotion)[\\/]/.test(id)) return 'mui'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 開発時は Backend(8080) へプロキシし、SPA を同一オリジンで動かす
    // （セッション Cookie / CSRF を素直に扱うため）
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/mocks/**',
        // 起動配線・宣言のみ（ロジックを持たない。E2E 相当でしか通らない）
        'src/main.tsx',
        'src/app/App.tsx',
        'src/app/routePages.ts',
        'src/**/*.d.ts',
      ],
    },
  },
})
