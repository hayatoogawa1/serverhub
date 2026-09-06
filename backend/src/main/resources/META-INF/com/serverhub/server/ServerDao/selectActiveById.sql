select
  id,
  hostname,
  ip_address,
  environment,
  status,
  description,
  os,
  os_version,
  virtualization_type,
  location,
  owner,
  version,
  created_at,
  updated_at,
  deleted_at
from servers
where id = /* id */0
  and deleted_at is null
