update server_cloud_links
set
  last_error = /* lastError */null,
  last_error_at = /* lastErrorAt */null,
  updated_at = now()
where id = /* id */0
