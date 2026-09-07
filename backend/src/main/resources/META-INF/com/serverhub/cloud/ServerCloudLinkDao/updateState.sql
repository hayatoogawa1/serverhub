update server_cloud_links
set
  state = /* state */null,
  state_raw = /* stateRaw */null,
  state_fetched_at = /* stateFetchedAt */null,
  last_error = null,
  last_error_at = null,
  updated_at = now()
where id = /* id */0
