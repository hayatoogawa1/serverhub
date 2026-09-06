select
  s.id,
  s.hostname,
  s.ip_address,
  s.environment,
  s.status,
  s.description,
  s.os,
  s.os_version,
  s.virtualization_type,
  s.location,
  s.owner,
  s.version,
  s.created_at,
  s.updated_at,
  s.deleted_at
from servers s
where s.deleted_at is null
/*%if criteria.keyword != null && !criteria.keyword.isEmpty() */
  and (
    s.hostname like /* @infix(criteria.keyword) */'x' escape '$'
    or s.description like /* @infix(criteria.keyword) */'x' escape '$'
  )
/*%end*/
/*%if criteria.environment != null */
  and s.environment = /* criteria.environment */'production'
/*%end*/
/*%if criteria.status != null */
  and s.status = /* criteria.status */'active'
/*%end*/
/*%if criteria.tagIds != null && !criteria.tagIds.isEmpty() */
  and s.id in (
    select st.server_id
    from server_tags st
    where st.tag_id in /* criteria.tagIds */(1, 2)
    group by st.server_id
    having count(distinct st.tag_id) = /* criteria.tagIds.size() */2
  )
/*%end*/
order by
/*%if sort == @com.serverhub.server.ServerSortKey@HOSTNAME */
  s.hostname
/*%elseif sort == @com.serverhub.server.ServerSortKey@ENVIRONMENT */
  s.environment
/*%elseif sort == @com.serverhub.server.ServerSortKey@STATUS */
  s.status
/*%elseif sort == @com.serverhub.server.ServerSortKey@CREATED_AT */
  s.created_at
/*%else*/
  s.updated_at
/*%end*/
/*%if order == @com.serverhub.common.page.SortDirection@ASC */ asc /*%else*/ desc /*%end*/
, s.id asc
limit /* pageRequest.size() */10 offset /* pageRequest.offset() */0
