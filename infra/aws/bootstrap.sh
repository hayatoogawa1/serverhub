#!/usr/bin/env bash
# ServerHub — EC2 の初回セットアップ（非 Docker デプロイ）。Amazon Linux 2023 想定。
#
# 前提: このリポジトリを EC2 上にクローン済みで、root で実行する。
#   sudo bash infra/aws/bootstrap.sh serverhub.example.com
#
# やること: パッケージ導入 / serverhub ユーザー / ディレクトリ / systemd unit /
#           nginx server block（80 番）。TLS 証明書と最初のデプロイは後続（README 参照）。
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "usage: sudo bash $0 <domain>   (例: serverhub.example.com)" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_USER="serverhub"

echo "==> パッケージ導入"
dnf install -y \
  java-17-amazon-corretto-headless \
  nginx certbot python3-certbot-nginx \
  git tar

echo "==> ${APP_USER} ユーザー / ディレクトリ"
id "$APP_USER" &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" /opt/serverhub
install -d -o "$APP_USER" -g "$APP_USER" /var/www/serverhub
install -d -o root -g "$APP_USER" -m 750 /etc/serverhub

echo "==> 環境変数ファイル（未作成なら雛形をコピー。実値は後で編集）"
if [[ ! -f /etc/serverhub/serverhub.env ]]; then
  install -o root -g "$APP_USER" -m 640 "$REPO_DIR/infra/aws/serverhub.env.example" /etc/serverhub/serverhub.env
  echo "    -> /etc/serverhub/serverhub.env を編集して Neon 接続情報を入れること"
fi

echo "==> systemd unit"
install -o root -g root -m 644 "$REPO_DIR/infra/aws/serverhub.service" /etc/systemd/system/serverhub.service
systemctl daemon-reload
systemctl enable serverhub   # 起動は最初のデプロイ後

echo "==> nginx server block（80 番。certbot が後で 443 を追記）"
sed "s/__SERVERHUB_DOMAIN__/${DOMAIN}/g" \
  "$REPO_DIR/infra/aws/nginx-serverhub.conf" > /etc/nginx/conf.d/serverhub.conf
# AL2023 の既定 server(_ :80) と衝突しないよう無効化
[[ -f /etc/nginx/nginx.conf ]] && sed -i 's/^\(\s*\)listen\s*80 default_server;/\1# &/' /etc/nginx/nginx.conf || true
nginx -t

echo "==> SELinux: nginx から backend(127.0.0.1:8080) への接続を許可"
setsebool -P httpd_can_network_connect 1 || true

systemctl enable --now nginx
systemctl reload nginx

cat <<EOF

==> 完了。次の手順:
  1) sudo vi /etc/serverhub/serverhub.env        # Neon 接続情報を入れる
  2) sudo certbot --nginx -d ${DOMAIN} --redirect --agree-tos -m <your-email> -n
  3) bash infra/aws/deploy.sh <version>          # 例: v1.0.0（最初のデプロイ。jar を起動）
  4) https://${DOMAIN}/ で動作確認（デモ管理者: admin@serverhub.local / serverhub-demo-2026）

  ※ EC2 には IAM インスタンスプロファイル（AmazonSSMManagedInstanceCore +
     serverhub-ec2-readonly）をアタッチしておくこと。手順は infra/aws/README.md。
EOF
