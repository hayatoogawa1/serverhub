select count(*)
from servers
where deleted_at is null
