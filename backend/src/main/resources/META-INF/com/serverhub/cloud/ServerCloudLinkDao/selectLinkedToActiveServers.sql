select
  l.id,
  l.server_id,
  l.provider,
  l.external_id,
  l.region,
  l.account_id,
  l.state,
  l.state_raw,
  l.state_fetched_at,
  l.last_error,
  l.last_error_at,
  l.created_at,
  l.updated_at
from server_cloud_links l
join servers s on s.id = l.server_id and s.deleted_at is null
order by l.state_fetched_at asc nulls first, l.id asc
