update servers
set deleted_at = /* deletedAt */'2000-01-01 00:00:00'
where id = /* id */0
  and deleted_at is null
