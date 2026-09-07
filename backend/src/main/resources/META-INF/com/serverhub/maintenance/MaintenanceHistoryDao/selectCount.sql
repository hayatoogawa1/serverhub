select count(*)
from maintenance_histories m
where m.deleted_at is null
/*%if criteria.serverId != null */
  and m.server_id = /* criteria.serverId */0
/*%end*/
