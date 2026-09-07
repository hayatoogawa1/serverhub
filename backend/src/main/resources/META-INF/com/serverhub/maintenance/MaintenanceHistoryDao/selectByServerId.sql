select
  m.id,
  m.server_id,
  m.performed_date,
  m.type,
  m.worker,
  m.content,
  m.impact,
  m.result,
  m.created_at,
  m.updated_at,
  m.deleted_at
from maintenance_histories m
where m.server_id = /* serverId */0
  and m.deleted_at is null
order by m.performed_date desc, m.id desc
limit /* pageRequest.size() */10 offset /* pageRequest.offset() */0
