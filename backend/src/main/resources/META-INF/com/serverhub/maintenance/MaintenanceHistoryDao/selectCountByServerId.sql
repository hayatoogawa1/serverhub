select count(*)
from maintenance_histories m
where m.server_id = /* serverId */0
  and m.deleted_at is null
