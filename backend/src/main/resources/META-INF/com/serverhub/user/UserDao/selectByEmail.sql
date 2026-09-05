select
  id,
  email,
  password_hash,
  display_name,
  created_at,
  updated_at
from users
where email = /* email */'x'
