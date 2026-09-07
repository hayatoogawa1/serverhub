# syntax=docker/dockerfile:1
#
# ServerHub Frontend（React 19 / Vite 8）。
# マルチステージ: Node でビルド → nginx で静的配信 + /api リバースプロキシ。
# API のベース URL は相対（/api/v1）なので、ビルド時の環境変数は不要。
# コンテキストは frontend/。

# ---- build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime

# 既定サイトを差し替え
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/serverhub.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx 公式イメージの既定 CMD（daemon off）をそのまま使う
