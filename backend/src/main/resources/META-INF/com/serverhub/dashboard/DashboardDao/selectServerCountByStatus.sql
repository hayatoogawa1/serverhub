select
  status,
  count(*) as count
from servers
where deleted_at is null
group by status
