-- デモ/開発用の管理者ユーザーをシードする（B1: サインアップ画面なし、Flyway シードで作成）。
-- Neon・CI（Testcontainers）・ローカル Docker のすべてで一貫してログインできるようにする
-- （infra/docker/initdb/01_seed.sql はローカル Docker 専用のオフラインデモデータのため、
-- ユーザーだけは全環境共通としてここで作成する）。
--
-- パスワードは "password"（bcrypt ハッシュ）。ポートフォリオ/デモ用のダミーアカウントであり、
-- 実在の秘密情報ではない（requirements §10.1.18）。
INSERT INTO users (email, password_hash, display_name)
VALUES ('admin@serverhub.local',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'デモ管理者')
ON CONFLICT (email) DO NOTHING;
