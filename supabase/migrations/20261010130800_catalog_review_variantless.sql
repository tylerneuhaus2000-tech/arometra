-- Completes catalog review for products whose source does not establish a bottle variant.
-- The preceding review RPC handles records with evidenced variants. No placeholder GTIN,
-- size, barcode, or variant is created for records where that information is unknown.

create or replace function public.review_and_publish_catalog_import_job_v2(p_job_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  actor_id uuid := auth.uid();
  staged private.import_records%rowtype;
  brand_value public.brands%rowtype;
  product_value public.products%rowtype;
  rights_value private.source_rights_reviews%rowtype;
  descriptor jsonb;
  descriptor_code text;
  descriptor_stage text;
  profile_category_id uuid;
  dimension_code_value text;
  previous_result jsonb;
  published_count integer := 0;
  descriptor_count integer := 0;
begin
  if actor_id is null or not exists (
    select 1 from public.admin_members m
    where m.user_id = actor_id and m.is_active and m.role in ('owner', 'editor')
  ) then
    raise exception 'Catalog publication requires an active owner or editor' using errcode = '42501';
  end if;
  if p_note is null or char_length(btrim(p_note)) not between 10 and 1000 then
    raise exception 'Editorial review note is required' using errcode = '22023';
  end if;

  -- Reuse the guarded review for products with known variants.
  previous_result := public.review_and_publish_catalog_import_job(p_job_id, p_note);
  published_count := coalesce((previous_result->>'publishedProducts')::integer, 0);
  descriptor_count := coalesce((previous_result->>'approvedSensoryDescriptors')::integer, 0);

  for staged in
    select r.* from private.import_records r
    where r.job_id = p_job_id and r.applied_at is not null
      and r.applied_product_id is not null and r.applied_brand_id is not null and r.applied_variant_id is null
    order by r.row_number
    for update
  loop
    select * into rights_value from private.source_rights_reviews r where r.source_id = staged.source_id;
    if rights_value.source_id is null or rights_value.data_rights_status <> 'approved' or rights_value.terms_checked_at is null then
      raise exception 'Each product source needs an active data-rights decision' using errcode = '42501';
    end if;
    select * into brand_value from public.brands b where b.id = staged.applied_brand_id for update;
    select * into product_value from public.products p where p.id = staged.applied_product_id for update;
    if brand_value.id is null or product_value.id is null then
      raise exception 'Imported catalog identity is incomplete' using errcode = '22023';
    end if;

    update public.brand_field_provenance fp set verification_status = 'approved', verified_at = now(),
      verified_by = actor_id, verification_note = left(btrim(p_note), 1000)
    where fp.brand_id = brand_value.id and fp.source_id = staged.source_id and fp.field_path = 'name'
      and fp.raw_value_hash = md5(brand_value.name);
    update public.brands set status = 'published', verified_at = now() where id = brand_value.id;

    update public.product_field_provenance fp set verification_status = 'approved', verified_at = now(),
      verified_by = actor_id, verification_note = left(btrim(p_note), 1000)
    where fp.product_id = product_value.id and fp.source_id = staged.source_id
      and fp.raw_value_hash = case fp.field_path
        when 'name' then md5(product_value.name)
        when 'brand_id' then md5(product_value.brand_id::text)
        when 'primary_category_id' then md5(product_value.primary_category_id::text)
        when 'product_family' then case when product_value.product_family is null then null else md5(product_value.product_family) end
        when 'origin_country_code' then case when product_value.origin_country_code is null then null else md5(product_value.origin_country_code) end
        when 'origin_region' then case when product_value.origin_region is null then null else md5(product_value.origin_region) end
        when 'age_years' then case when product_value.age_years is null then null else md5(product_value.age_years::text) end
        when 'distillation_details' then case when product_value.distillation_details is null then null else md5(product_value.distillation_details) end
        when 'maturation_details' then case when product_value.maturation_details is null then null else md5(product_value.maturation_details) end
        when 'description' then case when product_value.description is null then null else md5(product_value.description) end
        when 'abv_percent' then case when product_value.abv_percent is null then null else md5(product_value.abv_percent::text) end
      end;
    update public.products set product_status = 'published', editorial_reviewed_at = now() where id = product_value.id;

    profile_category_id := private.resolve_sensory_profile_category(product_value.primary_category_id);
    for descriptor in
      select value from jsonb_array_elements(coalesce(staged.normalized_record->'sensoryDescriptors', '[]'::jsonb))
    loop
      descriptor_code := descriptor->>'tagCode';
      descriptor_stage := coalesce(descriptor->>'stage', 'unspecified');
      if descriptor_stage not in ('unspecified', 'nose', 'palate', 'finish') or profile_category_id is null then
        raise exception 'Sensory descriptor category or stage is invalid' using errcode = '22023';
      end if;
      select r.dimension_code into dimension_code_value from public.category_sensory_tag_rules r
      where r.category_id = profile_category_id and r.tag_code = descriptor_code;
      if dimension_code_value is null then
        raise exception 'Sensory tag is not allowed by the product category profile: %', descriptor_code using errcode = '22023';
      end if;
      insert into public.product_sensory_descriptors
        (product_id, category_id, dimension_code, tag_code, source_id, evidence_type, stage,
         verification_status, verified_at, raw_descriptor_hash, verification_note)
      values (product_value.id, profile_category_id, dimension_code_value, descriptor_code, staged.source_id,
        'manufacturer', descriptor_stage, 'approved', now(),
        md5(concat_ws(E'\n', profile_category_id::text, dimension_code_value, descriptor_code, 'manufacturer', descriptor_stage)),
        left(btrim(p_note), 1000))
      on conflict (product_id, category_id, dimension_code, tag_code, source_id, stage)
      do update set verification_status = 'approved', verified_at = now(),
        raw_descriptor_hash = excluded.raw_descriptor_hash, verification_note = excluded.verification_note;
      descriptor_count := descriptor_count + 1;
    end loop;

    if not private.product_has_public_evidence(product_value.id) then
      raise exception 'Published product did not pass current public evidence checks' using errcode = '42501';
    end if;
    insert into private.catalog_publication_review_events
      (import_job_id, product_id, reviewer_user_id, review_note)
    values (p_job_id, product_value.id, actor_id, btrim(p_note))
    on conflict (import_job_id, product_id) do nothing;
    published_count := published_count + 1;
  end loop;

  if published_count = 0 then raise exception 'No applied records were available for review' using errcode = '22023'; end if;
  return jsonb_build_object('publishedProducts', published_count, 'approvedSensoryDescriptors', descriptor_count,
    'reviewedBy', actor_id, 'reviewedAt', now());
end;
$$;
revoke all on function public.review_and_publish_catalog_import_job_v2(uuid, text) from public, anon, authenticated;
grant execute on function public.review_and_publish_catalog_import_job_v2(uuid, text) to authenticated;
