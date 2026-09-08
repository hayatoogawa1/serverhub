#!/usr/bin/env bash
# ServerHub — 更新デプロイ（非 Docker）。GitHub Release のアーティファクトを取得して差し替える。
#
#   bash infra/aws/deploy.sh v1.2.0
#   bash infra/aws/deploy.sh latest
#
# 前提: bootstrap.sh 済み。/etc/serverhub/serverhub.env に実値が入っている。
#       root か sudo 可能なユーザーで実行。
#
# やること: jar と フロント dist を Release から取得 → 配置 → serverhub 再起動 →
#           /actuator/health を待つ → nginx reload。ヘルスチェック失敗時は前 jar へ戻す。
set -euo pipefail

VERSION="${1:-latest}"
REPO="hayatoogawa1/serverhub"
APP_DIR="/opt/serverhub"
WWW_DIR="/var/www/serverhub"
JAR_LINK="${APP_DIR}/serverhub-backend.jar"
HEALTH_URL="http://127.0.0.1:8080/actuator/health"

SUDO=""
[[ $EUID -ne 0 ]] && SUDO="sudo"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

base="https://github.com/${REPO}/releases"
[[ "$VERSION" == "latest" ]] && base="${base}/latest/download" || base="${base}/download/${VERSION}"

echo "==> 取得: ${VERSION}"
curl -fsSL -o "$tmp/serverhub-backend.jar"          "${base}/serverhub-backend.jar"
curl -fsSL -o "$tmp/serverhub-frontend-dist.tar.gz" "${base}/serverhub-frontend-dist.tar.gz"
curl -fsSL -o "$tmp/SHA256SUMS"                     "${base}/SHA256SUMS"
( cd "$tmp" && sha256sum -c SHA256SUMS )

stamp="$(date +%Y%m%d%H%M%S)"
new_jar="${APP_DIR}/serverhub-backend-${VERSION}-${stamp}.jar"
prev_jar="$(readlink -f "$JAR_LINK" 2>/dev/null || true)"

echo "==> backend jar を配置"
$SUDO install -o serverhub -g serverhub -m 640 "$tmp/serverhub-backend.jar" "$new_jar"
$SUDO ln -sfn "$new_jar" "$JAR_LINK"

echo "==> フロント dist を配置"
rm -rf "$tmp/dist" && mkdir "$tmp/dist"
tar -xzf "$tmp/serverhub-frontend-dist.tar.gz" -C "$tmp/dist" --strip-components=1
$SUDO rsync -a --delete "$tmp/dist/" "$WWW_DIR/"
$SUDO chown -R serverhub:serverhub "$WWW_DIR"
$SUDO restorecon -R "$WWW_DIR" 2>/dev/null || true

echo "==> serverhub 再起動"
$SUDO systemctl restart serverhub

echo -n "==> ヘルスチェック待ち "
ok=""
for _ in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" 2>/dev/null | grep -q '"status":"UP"'; then ok=1; break; fi
  echo -n "."; sleep 2
done
echo

if [[ -z "$ok" ]]; then
  echo "!! ヘルスチェック失敗。前バージョンへロールバック" >&2
  if [[ -n "$prev_jar" && -e "$prev_jar" ]]; then
    $SUDO ln -sfn "$prev_jar" "$JAR_LINK"
    $SUDO systemctl restart serverhub
    echo "   -> $prev_jar に戻した（DB マイグレーションを伴う変更は手動確認が必要）" >&2
  fi
  $SUDO journalctl -u serverhub -n 50 --no-pager >&2 || true
  exit 1
fi

$SUDO systemctl reload nginx
echo "==> 完了: ${VERSION}（jar: $(basename "$new_jar")）"
