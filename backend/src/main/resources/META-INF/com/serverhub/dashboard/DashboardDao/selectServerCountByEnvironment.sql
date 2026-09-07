select
  environment,
  count(*) as count
from servers
where deleted_at is null
group by environment
