select
  id,
  name,
  created_at
from tags
where name in /* names */('x')
