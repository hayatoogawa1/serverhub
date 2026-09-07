select
  m.id,
  m.server_id,
  s.hostname as server_hostname,
  (s.deleted_at is not null) as server_deleted,
  m.performed_date,
  m.type,
  m.worker
from maintenance_histories m
join servers s on s.id = m.server_id
where m.deleted_at is null
/*%if criteria.serverId != null */
  and m.server_id = /* criteria.serverId */0
/*%end*/
order by
/*%if sort == @com.serverhub.maintenance.MaintenanceSortKey@CREATED_AT */
  m.created_at
/*%else*/
  m.performed_date
/*%end*/
/*%if order == @com.serverhub.common.page.SortDirection@ASC */ asc /*%else*/ desc /*%end*/
, m.id desc
limit /* pageRequest.size() */10 offset /* pageRequest.offset() */0
