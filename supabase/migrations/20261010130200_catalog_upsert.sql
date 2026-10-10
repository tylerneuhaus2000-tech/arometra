-- Explicit, rights-gated ingestion into unpublished catalog drafts.
-- This migration never approves facts or publishes catalog rows.

alter table private.import_records
  add column applied_at timestamptz,
  add column applied_by uuid references auth.users(id) on delete set null,
  add column applied_brand_id uuid references public.brands(id) on delete set null,
  add column applied_product_id uuid references public.products(id) on delete set null,
  add column applied_variant_id uuid references public.product_variants(id) on delete set null;

create unique index brands_import_identity_unique
  on public.brands (normalized_name, (coalesce(country_code, '')));

create unique index products_import_identity_unique
  on public.products (brand_id, normalized_name);

create unique index product_variants_import_identity_unique
  on public.product_variants (product_id, (coalesce(gtin, '')), (coalesce(volume_ml, 0)),
    (coalesce(market_country_code, '')), (coalesce(edition_label, '')), (coalesce(variant_code, '')));

create function private.upsert_catalog_import_record(target_import_record_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  staged private.import_records%rowtype;
  rights_value private.source_rights_reviews%rowtype;
  record_value jsonb;
  brand_value jsonb;
  product_value jsonb;
  variant_value jsonb;
  flavor_value jsonb;
  note_value jsonb;
  brand_id_value uuid;
  product_id_value uuid;
  variant_id_value uuid;
  category_id_value uuid;
  dimension_id_value uuid;
  source_id_value uuid;
  brand_name_value text;
  brand_current_name text;
  brand_current_country text;
  brand_normalized_value text;
  brand_country_value text;
  product_name_value text;
  product_normalized_value text;
  product_family_value text;
  origin_country_value text;
  origin_region_value text;
  age_years_value numeric(5,2);
  abv_value numeric(5,2);
  variant_gtin_value text;
  variant_volume_value integer;
  variant_market_value text;
  variant_abv_value numeric(5,2);
  variant_edition_value text;
  variant_code_value text;
  flavor_score_value numeric(4,2);
  flavor_method_value public.flavor_method;
  brand_slug_base text;
  product_slug_base text;
  conflict_paths jsonb := '[]'::jsonb;
  field_claim record;
  note_author_type public.note_author_type;
  note_author_label text;
  note_nose text;
  note_palate text;
  note_finish text;
  note_overall text;
  note_language text;
  note_tasted_at date;
  note_hash text;
begin
  select * into staged from private.import_records r where r.id = target_import_record_id for update;
  if not found then raise exception 'Unknown staged import record' using errcode = '22023'; end if;
  if staged.applied_at is not null then
    return jsonb_build_object('status', 'already_applied', 'importRecordId', staged.id,
      'brandId', staged.applied_brand_id, 'productId', staged.applied_product_id,
      'variantId', staged.applied_variant_id);
  end if;
  if staged.quality not in ('complete', 'incomplete') then
    raise exception 'Only validated staged records can be applied' using errcode = '22023';
  end if;

  select * into rights_value from private.source_rights_reviews r where r.source_id = staged.source_id;
  if rights_value.source_id is null or rights_value.data_rights_status is distinct from 'approved' or rights_value.terms_checked_at is null then
    raise exception 'Current source data rights approval is required to upsert catalog drafts' using errcode = '42501';
  end if;

  record_value := staged.normalized_record;
  brand_value := record_value->'brand';
  product_value := record_value->'product';
  variant_value := record_value->'variant';
  brand_name_value := brand_value->>'name';
  brand_normalized_value := brand_value->>'normalizedName';
  brand_country_value := nullif(brand_value->>'countryCode', '');
  product_name_value := product_value->>'name';
  product_normalized_value := product_value->>'normalizedName';
  product_family_value := nullif(product_value->>'family', '');
  origin_country_value := nullif(product_value->>'originCountryCode', '');
  origin_region_value := nullif(product_value->>'originRegion', '');
  age_years_value := nullif(product_value->>'ageYears', '')::numeric(5,2);
  abv_value := nullif(product_value->>'abvPercent', '')::numeric(5,2);
  variant_gtin_value := nullif(variant_value->>'gtin', '');
  variant_volume_value := nullif(variant_value->>'volumeMl', '')::integer;
  variant_market_value := nullif(variant_value->>'marketCountryCode', '');
  variant_abv_value := nullif(variant_value->>'abvPercentOverride', '')::numeric(5,2);
  variant_edition_value := nullif(variant_value->>'editionLabel', '');
  variant_code_value := nullif(variant_value->>'variantCode', '');
  select c.id into category_id_value from public.categories c
    where c.slug = product_value->>'categorySlug' and c.active;
  if not found then raise exception 'Catalog category is missing or inactive' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended('brand:' || brand_normalized_value || ':' || coalesce(brand_country_value, ''), 0));
  select b.id, b.name, b.country_code into brand_id_value, brand_current_name, brand_current_country from public.brands b
    where b.normalized_name = brand_normalized_value and b.country_code is not distinct from brand_country_value
    for update;
  if brand_id_value is null then
    brand_slug_base := regexp_replace(lower(brand_normalized_value), '[^a-z0-9]+', '-', 'g');
    brand_slug_base := coalesce(nullif(trim(both '-' from brand_slug_base), ''), 'brand');
    insert into public.brands (slug, name, normalized_name, country_code)
    values (left(brand_slug_base, 175) || '-' || left(md5(brand_normalized_value || ':' || coalesce(brand_country_value, '')), 12),
      brand_name_value, brand_normalized_value, brand_country_value)
    on conflict do nothing returning id, name, country_code into brand_id_value, brand_current_name, brand_current_country;
    if brand_id_value is null then
      select b.id, b.name, b.country_code into brand_id_value, brand_current_name, brand_current_country from public.brands b
        where b.normalized_name = brand_normalized_value and b.country_code is not distinct from brand_country_value
        for update;
    end if;
    if brand_id_value is null then raise exception 'Brand identity conflicts with an existing catalog slug' using errcode = '23505'; end if;
  end if;
  if brand_current_name is distinct from brand_name_value then
    conflict_paths := conflict_paths || jsonb_build_array('brand.name');
  else
    insert into public.brand_field_provenance (brand_id, field_path, source_id, raw_value_hash, verification_status)
    values (brand_id_value, 'name', staged.source_id, md5(brand_current_name), 'pending')
    on conflict (brand_id, field_path, source_id) do nothing;
  end if;
  if brand_country_value is not null then
    if brand_current_country is distinct from brand_country_value then
      conflict_paths := conflict_paths || jsonb_build_array('brand.countryCode');
    else
      insert into public.brand_field_provenance (brand_id, field_path, source_id, raw_value_hash, verification_status)
      values (brand_id_value, 'country_code', staged.source_id, md5(brand_current_country), 'pending')
      on conflict (brand_id, field_path, source_id) do nothing;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('product:' || brand_id_value::text || ':' || product_normalized_value, 0));
  select p.id into product_id_value from public.products p
    where p.brand_id = brand_id_value and p.normalized_name = product_normalized_value for update;
  if product_id_value is null then
    product_slug_base := regexp_replace(lower(product_normalized_value), '[^a-z0-9]+', '-', 'g');
    product_slug_base := coalesce(nullif(trim(both '-' from product_slug_base), ''), 'product');
    insert into public.products
      (brand_id, primary_category_id, slug, name, normalized_name, product_family, origin_country_code,
       origin_region, age_years, abv_percent)
    values
      (brand_id_value, category_id_value,
       left(product_slug_base, 190) || '-' || left(md5(brand_id_value::text || ':' || product_normalized_value), 12),
       product_name_value, product_normalized_value, product_family_value, origin_country_value,
       origin_region_value, age_years_value, abv_value)
    on conflict do nothing returning id into product_id_value;
    if product_id_value is null then
      select p.id into product_id_value from public.products p
        where p.brand_id = brand_id_value and p.normalized_name = product_normalized_value for update;
    end if;
    if product_id_value is null then raise exception 'Product identity conflicts with an existing catalog slug' using errcode = '23505'; end if;
  else
    update public.products p set
      product_family = coalesce(p.product_family, product_family_value),
      origin_country_code = coalesce(p.origin_country_code, origin_country_value),
      origin_region = coalesce(p.origin_region, origin_region_value),
      age_years = coalesce(p.age_years, age_years_value),
      abv_percent = coalesce(p.abv_percent, abv_value),
      updated_at = now()
    where p.id = product_id_value;
  end if;

  if variant_gtin_value is not null then
    perform pg_advisory_xact_lock(hashtextextended('gtin:' || variant_gtin_value, 0));
  end if;
  if variant_code_value is not null then
    perform pg_advisory_xact_lock(hashtextextended('variant-code:' || variant_code_value, 0));
  end if;
  if variant_gtin_value is not null then
    select v.id into variant_id_value from public.product_variants v where v.gtin = variant_gtin_value for update;
    if variant_id_value is not null and not exists (
      select 1 from public.product_variants v where v.id = variant_id_value and v.product_id = product_id_value
    ) then
      conflict_paths := conflict_paths || jsonb_build_array('variant.gtin');
      variant_id_value := null;
    end if;
  elsif variant_code_value is not null then
    select v.id into variant_id_value from public.product_variants v where v.variant_code = variant_code_value for update;
    if variant_id_value is not null and not exists (
      select 1 from public.product_variants v where v.id = variant_id_value and v.product_id = product_id_value
    ) then
      conflict_paths := conflict_paths || jsonb_build_array('variant.variantCode');
      variant_id_value := null;
    end if;
  end if;
  if variant_id_value is null and (variant_gtin_value is not null or variant_volume_value is not null
    or variant_market_value is not null or variant_abv_value is not null or variant_edition_value is not null
    or variant_code_value is not null) then
    select v.id into variant_id_value from public.product_variants v
      where v.product_id = product_id_value and v.gtin is not distinct from variant_gtin_value
        and v.volume_ml is not distinct from variant_volume_value
        and v.market_country_code is not distinct from variant_market_value
        and v.edition_label is not distinct from variant_edition_value
        and v.variant_code is not distinct from variant_code_value
      for update;
  end if;
  if variant_id_value is null and (variant_gtin_value is not null or variant_volume_value is not null
    or variant_market_value is not null or variant_abv_value is not null or variant_edition_value is not null
    or variant_code_value is not null) and not ('variant.gtin' = any(array(select jsonb_array_elements_text(conflict_paths))))
    and not ('variant.variantCode' = any(array(select jsonb_array_elements_text(conflict_paths)))) then
    insert into public.product_variants
      (product_id, gtin, volume_ml, market_country_code, abv_percent_override, edition_label, variant_code)
    values
      (product_id_value, variant_gtin_value, variant_volume_value, variant_market_value,
       variant_abv_value, variant_edition_value, variant_code_value)
    on conflict do nothing returning id into variant_id_value;
    if variant_id_value is null then
      select v.id into variant_id_value from public.product_variants v
        where v.product_id = product_id_value and v.gtin is not distinct from variant_gtin_value
          and v.volume_ml is not distinct from variant_volume_value
          and v.market_country_code is not distinct from variant_market_value
          and v.edition_label is not distinct from variant_edition_value
          and v.variant_code is not distinct from variant_code_value
        for update;
    end if;
    if variant_id_value is null then conflict_paths := conflict_paths || jsonb_build_array('variant.identity'); end if;
  end if;

  for field_claim in
    select p.field_path, p.current_value, p.input_value from public.products current_product
    cross join lateral (values
      ('name', current_product.name::text, product_name_value),
      ('brand_id', current_product.brand_id::text, brand_id_value::text),
      ('primary_category_id', current_product.primary_category_id::text, category_id_value::text),
      ('product_family', current_product.product_family::text, product_family_value),
      ('origin_country_code', current_product.origin_country_code::text, origin_country_value),
      ('origin_region', current_product.origin_region::text, origin_region_value),
      ('age_years', current_product.age_years::text, age_years_value::text),
      ('abv_percent', current_product.abv_percent::text, abv_value::text)
    ) as p(field_path, current_value, input_value)
    where current_product.id = product_id_value and p.input_value is not null
  loop
    if field_claim.current_value is distinct from field_claim.input_value then
      conflict_paths := conflict_paths || jsonb_build_array('product.' || field_claim.field_path);
    else
      insert into public.product_field_provenance (product_id, field_path, source_id, raw_value_hash, verification_status)
      values (product_id_value, field_claim.field_path, staged.source_id, md5(field_claim.current_value), 'pending')
      on conflict (product_id, field_path, source_id) do nothing;
    end if;
  end loop;

  if variant_id_value is not null then
    update public.product_variants v set
      gtin = coalesce(v.gtin, variant_gtin_value),
      volume_ml = coalesce(v.volume_ml, variant_volume_value),
      market_country_code = coalesce(v.market_country_code, variant_market_value),
      abv_percent_override = coalesce(v.abv_percent_override, variant_abv_value),
      edition_label = coalesce(v.edition_label, variant_edition_value),
      variant_code = coalesce(v.variant_code, variant_code_value),
      updated_at = now()
    where v.id = variant_id_value;

    for field_claim in
      select v.field_path, v.current_value, v.input_value from public.product_variants current_variant
      cross join lateral (values
        ('gtin', current_variant.gtin::text, variant_gtin_value),
        ('volume_ml', current_variant.volume_ml::text, variant_volume_value::text),
        ('market_country_code', current_variant.market_country_code::text, variant_market_value),
        ('abv_percent_override', current_variant.abv_percent_override::text, variant_abv_value::text),
        ('edition_label', current_variant.edition_label::text, variant_edition_value),
        ('variant_code', current_variant.variant_code::text, variant_code_value)
      ) as v(field_path, current_value, input_value)
      where current_variant.id = variant_id_value and v.input_value is not null
    loop
      if field_claim.current_value is distinct from field_claim.input_value then
        conflict_paths := conflict_paths || jsonb_build_array('variant.' || field_claim.field_path);
      else
        insert into public.variant_field_provenance (variant_id, field_path, source_id, raw_value_hash, verification_status)
        values (variant_id_value, field_claim.field_path, staged.source_id, md5(field_claim.current_value), 'pending')
        on conflict (variant_id, field_path, source_id) do nothing;
      end if;
    end loop;
  end if;

  for flavor_value in select value from jsonb_array_elements(record_value->'flavors')
  loop
    select d.id into dimension_id_value from public.flavor_dimensions d where d.code = flavor_value->>'code' and d.active;
    flavor_score_value := (flavor_value->>'value')::numeric(4,2);
    flavor_method_value := (flavor_value->>'method')::public.flavor_method;
    perform pg_advisory_xact_lock(hashtextextended('flavor:' || product_id_value::text || ':' || dimension_id_value::text || ':' || staged.source_id::text || ':' || flavor_method_value::text, 0));
    insert into public.product_flavor_values
      (product_id, dimension_id, value, source_id, method, verification_status, raw_value_hash)
    values
      (product_id_value, dimension_id_value, flavor_score_value, staged.source_id, flavor_method_value,
       'pending', md5(flavor_score_value::text))
    on conflict (product_id, dimension_id, source_id, method) do nothing;
    if not exists (
      select 1 from public.product_flavor_values fv
      where fv.product_id = product_id_value and fv.dimension_id = dimension_id_value
        and fv.source_id = staged.source_id and fv.method = flavor_method_value
        and fv.value = flavor_score_value
    ) then
      conflict_paths := conflict_paths || jsonb_build_array('flavor.' || flavor_value->>'code');
    end if;
  end loop;

  note_value := record_value->'tastingNotes';
  if note_value is not null and note_value <> 'null'::jsonb then
    if rights_value.text_rights_status <> 'approved' or rights_value.terms_checked_at is null then
      raise exception 'Current source text rights approval is required for tasting note upsert' using errcode = '42501';
    end if;
    note_author_type := (note_value->>'authorType')::public.note_author_type;
    note_author_label := nullif(note_value->>'authorLabel', '');
    note_nose := nullif(note_value->>'nose', '');
    note_palate := nullif(note_value->>'palate', '');
    note_finish := nullif(note_value->>'finish', '');
    note_overall := nullif(note_value->>'overall', '');
    note_language := coalesce(nullif(note_value->>'language', ''), 'de');
    note_tasted_at := nullif(note_value->>'tastedAt', '')::date;
    note_hash := md5(concat_ws(E'\n', coalesce(note_author_label, ''), note_author_type::text,
      coalesce(note_nose, ''), coalesce(note_palate, ''), coalesce(note_finish, ''), coalesce(note_overall, ''),
      staged.source_id::text, coalesce(note_tasted_at::text, ''), note_language));
    if not exists (select 1 from public.tasting_notes n where n.product_id = product_id_value
      and n.source_id = staged.source_id and n.raw_content_hash = note_hash) then
      insert into public.tasting_notes
        (product_id, author_label, author_type, nose_text, palate_text, finish_text, overall_text,
         source_id, text_license_status, review_status, raw_content_hash, tasted_at, language)
      values
        (product_id_value, note_author_label, note_author_type, note_nose, note_palate, note_finish, note_overall,
         staged.source_id, 'approved', 'pending', note_hash, note_tasted_at, note_language);
    end if;
  end if;

  update private.import_records set applied_at = now(), applied_by = auth.uid(),
    applied_brand_id = brand_id_value, applied_product_id = product_id_value, applied_variant_id = variant_id_value
    where id = staged.id;
  return jsonb_build_object('status', case when jsonb_array_length(conflict_paths) > 0 then 'upserted_with_conflicts' else 'upserted' end,
    'importRecordId', staged.id, 'brandId', brand_id_value, 'productId', product_id_value,
    'variantId', variant_id_value, 'conflicts', conflict_paths);
end;
$$;

create function public.upsert_catalog_import_job(p_job_id uuid, p_limit integer default 5000)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  actor_id uuid := auth.uid();
  import_row record;
  outcome jsonb;
  outcomes jsonb := '[]'::jsonb;
  row_limit integer := least(greatest(coalesce(p_limit, 5000), 1), 5000);
begin
  if actor_id is null or not exists (
    select 1 from public.admin_members m
    where m.user_id = actor_id and m.is_active and m.role in ('owner', 'editor')
  ) then
    raise exception 'Catalog upsert requires an active owner or editor' using errcode = '42501';
  end if;
  if not exists (select 1 from private.import_jobs j where j.id = p_job_id) then
    raise exception 'Unknown import job' using errcode = '22023';
  end if;

  for import_row in
    select r.id from private.import_records r
    where r.job_id = p_job_id
    order by r.row_number
    limit row_limit
    for update
  loop
    outcome := private.upsert_catalog_import_record(import_row.id);
    outcomes := outcomes || jsonb_build_array(outcome);
  end loop;
  return jsonb_build_object('jobId', p_job_id, 'processedCount', jsonb_array_length(outcomes), 'outcomes', outcomes);
end;
$$;

revoke all on function private.upsert_catalog_import_record(uuid) from public, anon, authenticated;
revoke all on function public.upsert_catalog_import_job(uuid, integer) from public, anon, authenticated;
grant execute on function public.upsert_catalog_import_job(uuid, integer) to authenticated;
