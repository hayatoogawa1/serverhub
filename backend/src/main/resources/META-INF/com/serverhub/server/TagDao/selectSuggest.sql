select name
from tags
where name like /* @prefix(prefix) */'x' escape '$'
order by name asc
limit /* limit */10
