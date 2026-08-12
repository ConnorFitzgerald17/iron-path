alter table public.characters
  add column collection_log_obtained_count integer,
  add column collection_log_total_count integer,
  add constraint characters_collection_log_totals_valid check (
    (collection_log_obtained_count is null and collection_log_total_count is null)
    or (
      collection_log_obtained_count >= 0
      and collection_log_total_count > 0
      and collection_log_obtained_count <= collection_log_total_count
    )
  );

