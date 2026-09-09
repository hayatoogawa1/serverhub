-- 本番デプロイ専用（prod プロファイルのみ適用。db/prod の説明は V100 参照）。
--
-- V4 で追加したデモ運用ユーザーのパスワードを、公開環境向けに
-- "password" → "serverhub-demo-2026" に変更する（V100 のデモ管理者と同じデモ資格情報）。
-- ローカル / CI（db/migration のみ）は "password" のまま。

UPDATE users
SET password_hash = '{bcrypt}$2a$10$HwMqZzOmRHAhDFhuUbL6du/A6aroMSddTHwetOnFlS7UTeCv.q9HO'
WHERE email = 'ops-a@serverhub.local';

UPDATE users
SET password_hash = '{bcrypt}$2a$10$YwXqtDYs.XWRLQeZx08ZjOECjeqlZ/mFo5pN3rt0BwC59G9GSJIRO'
WHERE email = 'ops-b@serverhub.local';
