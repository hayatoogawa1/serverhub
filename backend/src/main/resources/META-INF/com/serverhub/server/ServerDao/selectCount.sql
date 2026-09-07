select count(*)
from servers s
where s.deleted_at is null
/*%if criteria.keyword != null && !criteria.keyword.isEmpty() */
  and (
    s.hostname like /* @infix(criteria.keyword) */'x' escape '$'
    or s.ip_address like /* @infix(criteria.keyword) */'x' escape '$'
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
