select id
from servers
where hostname = /* hostname */'x'
  and deleted_at is null
