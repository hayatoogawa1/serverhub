select
  m.id,
  m.server_id,
  s.hostname as server_hostname,
  m.performed_date,
  m.type
from maintenance_histories m
join servers s on s.id = m.server_id and s.deleted_at is null
where m.deleted_at is null
order by m.performed_date desc, m.id desc
limit /* limit */10
