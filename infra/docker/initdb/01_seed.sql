-- ServerHub オフラインデモ用シードデータ
--
-- 実行経路:
--   1) `docker-entrypoint-initdb.d` として初回コンテナ起動時に自動実行される。
--      この時点ではまだ Flyway マイグレーション前でテーブルが無いため、下記ガードにより
--      「何もしない」。初回起動を壊さない。
--   2) アプリ起動（= Flyway 適用）後に `make db-seed` で再実行すると、実際に投入される。
--
-- 方針:
--   - 実在しないダミーデータのみ（本物のホスト名・IP・認証情報は含めない）。
--   - 冪等（ON CONFLICT DO NOTHING / WHERE NOT EXISTS）。何度実行しても安全。
--   - カラム名は Phase 4 物理設計（docs/db/01-schema.md）/ V1__init.sql と整合確認済み。
--   - デモユーザーのパスワードは "password"（bcrypt ハッシュ）。デモ専用。

\set ON_ERROR_STOP on

SELECT to_regclass('public.servers') IS NOT NULL
   AND to_regclass('public.users') IS NOT NULL
   AND to_regclass('public.tags') IS NOT NULL
   AND to_regclass('public.server_tags') IS NOT NULL
   AND to_regclass('public.maintenance_histories') IS NOT NULL AS schema_ready \gset

\if :schema_ready

BEGIN;

-- ユーザー（ログイン: admin@serverhub.local / password）は Flyway
-- V2__seed_admin_user.sql で全環境共通にシードするため、ここでは投入しない。

-- ── タグ ──────────────────────────────────────────────────────────────
INSERT INTO tags (name) VALUES
  ('web'), ('db'), ('batch'), ('monitoring'), ('customer-a')
ON CONFLICT (name) DO NOTHING;

-- ── サーバー ──────────────────────────────────────────────────────────
INSERT INTO servers (hostname, ip_address, environment, status, description, os, os_version, virtualization_type, location, owner)
VALUES
  ('web-prod-01',   '10.0.1.11', 'production',  'active',      '本番 Web フロント',      'Ubuntu', '22.04', 'virtual',  'ap-northeast-1a', 'demo-team'),
  ('web-prod-02',   '10.0.1.12', 'production',  'active',      '本番 Web フロント',      'Ubuntu', '22.04', 'virtual',  'ap-northeast-1c', 'demo-team'),
  ('db-prod-01',    '10.0.2.21', 'production',  'active',      '本番 DB プライマリ',     'Rocky Linux', '9', 'physical', 'dc-tokyo-1',    'demo-team'),
  ('db-prod-02',    '10.0.2.22', 'production',  'maintenance', '本番 DB スタンバイ',     'Rocky Linux', '9', 'physical', 'dc-tokyo-1',    'demo-team'),
  ('batch-stg-01',  '10.1.3.31', 'staging',     'active',      'ステージング バッチ',    'Ubuntu', '22.04', 'virtual',  'ap-northeast-1a', 'demo-team'),
  ('web-dev-01',    '10.2.1.41', 'development',  'active',      '開発 Web',               'Ubuntu', '24.04', 'virtual',  'local',          'demo-team'),
  ('legacy-01',     '10.0.9.91', 'production',  'retired',     '旧課金バッチ（廃止）',   'CentOS', '7',     'physical', 'dc-tokyo-2',     'demo-team')
ON CONFLICT DO NOTHING;

-- ── サーバー ⇔ タグ ──────────────────────────────────────────────────
INSERT INTO server_tags (server_id, tag_id)
SELECT s.id, t.id
FROM (VALUES
  ('web-prod-01', 'web'), ('web-prod-01', 'customer-a'),
  ('web-prod-02', 'web'),
  ('db-prod-01',  'db'),  ('db-prod-01', 'customer-a'),
  ('db-prod-02',  'db'),
  ('batch-stg-01','batch'),
  ('web-dev-01',  'web'),
  ('legacy-01',   'batch')
) AS v(hostname, tag_name)
JOIN servers s ON s.hostname = v.hostname AND s.deleted_at IS NULL
JOIN tags t    ON t.name = v.tag_name
ON CONFLICT (server_id, tag_id) DO NOTHING;

-- ── メンテナンス履歴 ─────────────────────────────────────────────────
INSERT INTO maintenance_histories (server_id, performed_date, type, worker, content, impact, result)
SELECT s.id, v.performed_date::date, v.type, v.worker, v.content, v.impact, v.result
FROM (VALUES
  ('db-prod-01', '2026-08-10', 'patch',    'demo-team', 'PostgreSQL マイナーバージョン適用', '約 5 分の停止', '正常完了'),
  ('web-prod-01','2026-08-20', 'config',   'demo-team', 'nginx 設定変更（タイムアウト調整）', 'なし',        '正常完了'),
  ('db-prod-02', '2026-09-01', 'hardware', 'demo-team', 'ディスク交換のためスタンバイを停止', 'スタンバイ停止中', '作業中')
) AS v(hostname, performed_date, type, worker, content, impact, result)
JOIN servers s ON s.hostname = v.hostname
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_histories m
  WHERE m.server_id = s.id AND m.performed_date = v.performed_date::date AND m.content = v.content
);

COMMIT;

\echo 'ServerHub demo seed applied.'

\else
\echo 'ServerHub schema not found - skipping seed. Start the app (Flyway) first, then run: make db-seed'
\endif
