select
  t.name as tag_name,
  count(*) as count
from server_tags st
join servers s on s.id = st.server_id and s.deleted_at is null
join tags t on t.id = st.tag_id
group by t.name
order by count(*) desc, t.name asc
