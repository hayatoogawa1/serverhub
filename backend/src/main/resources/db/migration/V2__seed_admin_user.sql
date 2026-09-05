-- デモ/開発用の管理者ユーザーをシードする（B1: サインアップ画面なし、Flyway シードで作成）。
-- Neon・CI（Testcontainers）・ローカル Docker のすべてで一貫してログインできるようにする
-- （infra/docker/initdb/01_seed.sql はローカル Docker 専用のオフラインデモデータのため、
-- ユーザーだけは全環境共通としてここで作成する）。
--
-- パスワードは "password"（bcrypt ハッシュ）。ポートフォリオ/デモ用のダミーアカウントであり、
-- 実在の秘密情報ではない（requirements §10.1.18）。
-- `{bcrypt}` プレフィックスは Spring Security の DelegatingPasswordEncoder が
-- エンコード方式を識別するために必須（無いと "no password encoding prefix" で認証時に例外、
-- 結合テストで判明）。
-- このハッシュは Python の bcrypt.checkpw(b"password", hash) で "password" と一致することを
-- 確認済み（旧ハッシュは一致しないダミー値だったため、結合テストで実際にログインを試して判明・
-- 再生成した）。
INSERT INTO users (email, password_hash, display_name)
VALUES ('admin@serverhub.local',
        '{bcrypt}$2a$10$VSgzUF8bjIqoiGs9fixqWuurGeiY.k9x8Hrgv9ta3ELs7aZDRUGiS',
        'デモ管理者')
ON CONFLICT (email) DO NOTHING;
