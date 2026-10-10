-- Keep only descriptors accepted by the product's configured sensory profile.
-- Unsupported input tags remain visible in the private import issue report.

create or replace function public.filter_import_job_category_tags(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  actor_id uuid := auth.uid();
  staged private.import_records%rowtype;
  product_category_id uuid;
  profile_category_id uuid;
  accepted jsonb;
  rejected jsonb;
  rejected_count integer := 0;
  filtered_records integer := 0;
begin
  if actor_id is null or not exists (
    select 1 from public.admin_members m
    where m.user_id = actor_id and m.is_active and m.role in ('owner', 'editor')
  ) then
    raise exception 'Category tag filtering requires an active owner or editor' using errcode = '42501';
  end if;
  if not exists (select 1 from private.import_jobs j where j.id = p_job_id) then
    raise exception 'Unknown import job' using errcode = '22023';
  end if;

  for staged in
    select r.* from private.import_records r
    where r.job_id = p_job_id and r.applied_product_id is not null
    order by r.row_number
    for update
  loop
    select p.primary_category_id into product_category_id from public.products p where p.id = staged.applied_product_id;
    profile_category_id := private.resolve_sensory_profile_category(product_category_id);
    select coalesce(jsonb_agg(input.descriptor order by input.ordinality)
             filter (where exists (
               select 1 from public.category_sensory_tag_rules rule
               where rule.category_id = profile_category_id and rule.tag_code = input.descriptor->>'tagCode'
             )), '[]'::jsonb),
           coalesce(jsonb_agg(jsonb_build_object(
             'code', 'CATEGORY_PROFILE_TAG_SKIPPED',
             'tagCode', input.descriptor->>'tagCode',
             'severity', 'warning'
           ) order by input.ordinality)
             filter (where not exists (
               select 1 from public.category_sensory_tag_rules rule
               where rule.category_id = profile_category_id and rule.tag_code = input.descriptor->>'tagCode'
             )), '[]'::jsonb)
      into accepted, rejected
    from jsonb_array_elements(coalesce(staged.normalized_record->'sensoryDescriptors', '[]'::jsonb))
      with ordinality as input(descriptor, ordinality);

    if jsonb_array_length(rejected) > 0 then
      update private.import_records
      set normalized_record = jsonb_set(normalized_record, '{sensoryDescriptors}', accepted, true),
          issues = issues || rejected
      where id = staged.id;
      rejected_count := rejected_count + jsonb_array_length(rejected);
      filtered_records := filtered_records + 1;
    end if;
  end loop;
  return jsonb_build_object('filteredDescriptors', rejected_count, 'updatedImportRecords', filtered_records);
end;
$$;
revoke all on function public.filter_import_job_category_tags(uuid) from public, anon, authenticated;
grant execute on function public.filter_import_job_category_tags(uuid) to authenticated;
