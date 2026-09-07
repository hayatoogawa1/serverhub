select
  st.server_id,
  t.name as tag_name
from server_tags st
join tags t on t.id = st.tag_id
where st.server_id in /* serverIds */(1)
order by st.server_id, t.name
