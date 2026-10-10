-- Sprint 2: private, review-gated import staging. No catalog rows are created by this migration.

create type public.community_review_status as enum ('pending', 'approved', 'rejected', 'hidden');
create type public.community_review_origin as enum ('self_reported', 'verified_purchase');

create unique index sources_canonical_url_unique
  on public.sources (canonical_url)
  where canonical_url is not null;

alter table public.brand_field_provenance
  drop constraint if exists brand_field_provenance_field_path_check;
alter table public.brand_field_provenance
  add constraint brand_field_provenance_field_path_check check (field_path in ('name', 'country_code'));

alter table private.source_rights_reviews
  add column terms_url text check (terms_url is null or char_length(terms_url) <= 2048),
  add column reviewed_by uuid references auth.users(id) on delete set null;

create table private.source_rights_review_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  data_rights_status public.rights_review_status not null,
  text_rights_status public.rights_review_status not null,
  image_rights_status public.rights_review_status not null,
  license_id text,
  terms_url text,
  terms_checked_at timestamptz,
  notes text,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now()
);

create table private.import_jobs (
  id uuid primary key default gen_random_uuid(),
  input_digest char(64) not null check (input_digest ~ '^[a-f0-9]{64}$'),
  normalizer_version text not null check (char_length(normalizer_version) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  row_count integer not null check (row_count between 0 and 5000),
  staged_count integer not null check (staged_count between 0 and row_count),
  incomplete_count integer not null check (incomplete_count between 0 and row_count),
  created_at timestamptz not null default now(),
  unique (input_digest, normalizer_version)
);

create table private.import_job_sources (
  job_id uuid not null references private.import_jobs(id) on delete restrict,
  source_id uuid not null references public.sources(id) on delete restrict,
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),
  retrieved_at timestamptz not null,
  primary key (job_id, source_id)
);

-- One immutable row per accepted import row. The current head is a pointer; no history is overwritten.
create table private.import_records (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references private.import_jobs(id) on delete restrict,
  source_id uuid not null references public.sources(id) on delete restrict,
  row_number integer not null check (row_number > 0),
  record_key char(64) not null check (record_key ~ '^[a-f0-9]{64}$'),
  source_record_id text check (source_record_id is null or char_length(source_record_id) <= 240),
  quality text not null check (quality in ('complete', 'incomplete')),
  retrieved_at timestamptz not null,
  normalized_record jsonb not null check (jsonb_typeof(normalized_record) = 'object'),
  issues jsonb not null default '[]'::jsonb check (jsonb_typeof(issues) = 'array'),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (job_id, row_number)
);

create table private.import_record_heads (
  source_id uuid not null references public.sources(id) on delete restrict,
  record_key char(64) not null check (record_key ~ '^[a-f0-9]{64}$'),
  current_record_id uuid not null references private.import_records(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (source_id, record_key)
);

-- Community submissions are distinct from manufacturer/editorial tasting notes.
-- Public reads require explicit publication consent and moderation; public writes remain disabled.
create table public.community_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  rating smallint not null check (rating between 1 and 5),
  nose_text text check (nose_text is null or char_length(nose_text) <= 2000),
  palate_text text check (palate_text is null or char_length(palate_text) <= 2000),
  finish_text text check (finish_text is null or char_length(finish_text) <= 2000),
  overall_text text check (overall_text is null or char_length(overall_text) <= 2000),
  origin public.community_review_origin not null default 'self_reported',
  purchase_provider text check (purchase_provider is null or char_length(purchase_provider) <= 160),
  purchase_verified_at timestamptz,
  publication_consent_version text not null check (char_length(publication_consent_version) between 1 and 80),
  publication_consented_at timestamptz not null,
  moderation_status public.community_review_status not null default 'pending',
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((origin = 'self_reported' and purchase_provider is null and purchase_verified_at is null)
    or (origin = 'verified_purchase' and purchase_provider is not null and purchase_verified_at is not null)),
  check ((moderation_status = 'pending' and moderated_at is null and moderated_by is null)
    or (moderation_status <> 'pending' and moderated_at is not null and moderated_by is not null))
);

create index community_reviews_public_product_idx
  on public.community_reviews (product_id, created_at desc)
  where moderation_status = 'approved' and publication_consented_at is not null;

alter table private.source_rights_reviews enable row level security;
alter table private.source_rights_review_events enable row level security;
alter table private.import_jobs enable row level security;
alter table private.import_job_sources enable row level security;
alter table private.import_records enable row level security;
alter table private.import_record_heads enable row level security;
alter table public.community_reviews enable row level security;

revoke all on table private.source_rights_reviews, private.source_rights_review_events,
  private.import_jobs, private.import_job_sources, private.import_records, private.import_record_heads
  from public, anon, authenticated;
revoke all on table public.community_reviews from public, anon, authenticated;

create or replace function public.register_import_sources(p_sources jsonb)
returns table (source_id uuid, source_canonical_url text, created boolean)
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
#variable_conflict use_column
declare
  actor_id uuid := auth.uid();
  item jsonb;
  resolved_id uuid;
  source_name_value text;
  source_type_value public.source_type;
  source_url_value text;
  terms_url_value text;
  license_id_value text;
  attribution_value text;
  was_created boolean;
begin
  if actor_id is null or not exists (
    select 1 from public.admin_members m
    where m.user_id = actor_id and m.is_active and m.role in ('owner', 'editor')
  ) then
    raise exception 'Import source registration requires an active owner or editor' using errcode = '42501';
  end if;
  if p_sources is null or jsonb_typeof(p_sources) <> 'array' or jsonb_array_length(p_sources) < 1 or jsonb_array_length(p_sources) > 500 then
    raise exception 'Source registration requires an array with 1 to 500 entries' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_sources)
  loop
    if jsonb_typeof(item) <> 'object' or exists (
      select 1 from jsonb_object_keys(item) as keys(item_key)
      where item_key not in ('name', 'type', 'url', 'termsUrl', 'licenseId', 'attribution')
    ) then
      raise exception 'Source metadata has an invalid shape' using errcode = '22023';
    end if;
    source_name_value := btrim(item->>'name');
    source_type_value := (item->>'type')::public.source_type;
    source_url_value := btrim(item->>'url');
    terms_url_value := nullif(btrim(item->>'termsUrl'), '');
    license_id_value := nullif(btrim(item->>'licenseId'), '');
    attribution_value := nullif(btrim(item->>'attribution'), '');

    if source_name_value is null or char_length(source_name_value) not between 1 and 200
      or source_url_value is null or source_url_value !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]?#]*)?$'
      or (terms_url_value is not null and terms_url_value !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]?#]*)?$')
      or (license_id_value is not null and char_length(license_id_value) > 200)
      or (attribution_value is not null and char_length(attribution_value) > 1000) then
      raise exception 'Source metadata is invalid' using errcode = '22023';
    end if;

    insert into public.sources (source_name, source_type, canonical_url, attribution_text)
    values (source_name_value, source_type_value, source_url_value, attribution_value)
    on conflict (canonical_url) where canonical_url is not null do nothing
    returning id into resolved_id;
    was_created := found;

    if resolved_id is null then
      select s.id into resolved_id from public.sources s where s.canonical_url = source_url_value;
      if not found then raise exception 'Source registration did not return a source id'; end if;
      if exists (
        select 1 from public.sources s
        where s.id = resolved_id and (s.source_name <> source_name_value or s.source_type <> source_type_value)
      ) then
        raise exception 'Existing source identity conflicts with submitted metadata' using errcode = '22023';
      end if;
    end if;

    insert into private.source_rights_reviews (source_id, license_id, terms_url)
    values (resolved_id, license_id_value, terms_url_value)
    on conflict (source_id) do nothing;

    source_id := resolved_id;
    source_canonical_url := source_url_value;
    created := was_created;
    return next;
    resolved_id := null;
  end loop;
end;
$$;

create or replace function public.review_import_source_rights(p_source_id uuid, p_decision jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  actor_id uuid := auth.uid();
  existing private.source_rights_reviews%rowtype;
  next_data public.rights_review_status;
  next_text public.rights_review_status;
  next_image public.rights_review_status;
  next_license text;
  next_terms_url text;
  next_checked_at timestamptz;
  next_notes text;
begin
  if actor_id is null or not exists (
    select 1 from public.admin_members m
    where m.user_id = actor_id and m.is_active and m.role in ('owner', 'reviewer')
  ) then
    raise exception 'Source rights review requires an active owner or reviewer' using errcode = '42501';
  end if;
  if p_decision is null or jsonb_typeof(p_decision) <> 'object' then
    raise exception 'Rights decision must be a JSON object' using errcode = '22023';
  end if;

  select * into existing from private.source_rights_reviews r where r.source_id = p_source_id;
  if not found then raise exception 'Unknown import source' using errcode = '22023'; end if;
  next_data := coalesce((p_decision->>'dataRightsStatus')::public.rights_review_status, existing.data_rights_status);
  next_text := coalesce((p_decision->>'textRightsStatus')::public.rights_review_status, existing.text_rights_status);
  next_image := coalesce((p_decision->>'imageRightsStatus')::public.rights_review_status, existing.image_rights_status);
  next_license := coalesce(nullif(btrim(p_decision->>'licenseId'), ''), existing.license_id);
  next_terms_url := coalesce(nullif(btrim(p_decision->>'termsUrl'), ''), existing.terms_url);
  next_checked_at := coalesce(nullif(p_decision->>'termsCheckedAt', '')::timestamptz, existing.terms_checked_at);
  next_notes := coalesce(nullif(btrim(p_decision->>'notes'), ''), existing.notes);

  if (next_data = 'approved' or next_text = 'approved' or next_image = 'approved')
    and (next_license is null or next_terms_url is null
      or next_terms_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]?#]*)?$'
      or next_checked_at is null or next_checked_at > now()) then
    raise exception 'Approval requires a license/permission decision, checked HTTPS terms URL, and non-future check time' using errcode = '22023';
  end if;
  if next_notes is not null and char_length(next_notes) > 5000 then
    raise exception 'Review notes are too long' using errcode = '22023';
  end if;

  update private.source_rights_reviews
    set data_rights_status = next_data,
        text_rights_status = next_text,
        image_rights_status = next_image,
        license_id = next_license,
        terms_url = next_terms_url,
        terms_checked_at = next_checked_at,
        notes = next_notes,
        reviewed_at = now(),
        reviewed_by = actor_id
    where source_id = p_source_id;

  insert into private.source_rights_review_events
    (source_id, data_rights_status, text_rights_status, image_rights_status, license_id,
     terms_url, terms_checked_at, notes, reviewed_by)
  values
    (p_source_id, next_data, next_text, next_image, next_license,
     next_terms_url, next_checked_at, next_notes, actor_id);

  return jsonb_build_object('sourceId', p_source_id, 'reviewedBy', actor_id, 'reviewedAt', now());
end;
$$;

create or replace function public.stage_catalog_import(p_batch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  actor_id uuid := auth.uid();
  job_id_value uuid;
  item jsonb;
  source_id_value uuid;
  source_url_value text;
  retrieved_at_value timestamptz;
  record_key_value char(64);
  row_number_value integer;
  quality_value text;
  normalized_value jsonb;
  issues_value jsonb;
  source_record_id_value text;
  rights_value private.source_rights_reviews%rowtype;
  record_id_value uuid;
  inserted_count integer := 0;
  incomplete_count integer := 0;
  rows_count integer;
  prior_job_id uuid;
  digest_value char(64);
  normalizer_value text;
  source_snapshot jsonb;
  category_id_value uuid;
  brand_snapshot jsonb;
  product_snapshot jsonb;
  variant_snapshot jsonb;
  tasting_snapshot jsonb;
  flavor_snapshot jsonb;
  source_snapshot_name text;
  source_snapshot_type text;
  source_snapshot_attribution text;
begin
  if actor_id is null or not exists (
    select 1 from public.admin_members m
    where m.user_id = actor_id and m.is_active and m.role in ('owner', 'editor')
  ) then
    raise exception 'Catalog staging requires an active owner or editor' using errcode = '42501';
  end if;
  if p_batch is null or jsonb_typeof(p_batch) <> 'object'
    or pg_column_size(p_batch) > 5 * 1024 * 1024
    or jsonb_typeof(p_batch->'records') <> 'array' then
    raise exception 'Import batch is invalid or too large' using errcode = '22023';
  end if;
  if nullif(p_batch->>'inputDigest', '') is null or p_batch->>'inputDigest' !~ '^[a-f0-9]{64}$' then
    raise exception 'Import batch digest is invalid' using errcode = '22023';
  end if;
  digest_value := (p_batch->>'inputDigest')::char(64);
  normalizer_value := p_batch->>'normalizerVersion';
  rows_count := jsonb_array_length(p_batch->'records');
  if normalizer_value is null or normalizer_value not in ('arometra-import-v1')
    or rows_count < 1 or rows_count > 500 then
    raise exception 'Import batch digest, version, or row count is invalid' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_batch->'records')
  loop
    if jsonb_typeof(item) <> 'object' or exists (
      select 1 from jsonb_object_keys(item) as item_key
      where item_key not in ('rowNumber', 'recordKey', 'quality', 'retrievedAt', 'source', 'sourceRecordId', 'normalizedRecord', 'issues')
    ) then
      raise exception 'Import row has an invalid shape' using errcode = '22023';
    end if;
    source_url_value := item #>> '{source,url}';
    select s.id, s.source_name, s.source_type::text, s.attribution_text
      into source_id_value, source_snapshot_name, source_snapshot_type, source_snapshot_attribution
      from public.sources s where s.canonical_url = source_url_value;
    if not found then raise exception 'Source must be registered and rights-reviewed before staging' using errcode = '42501'; end if;
    select * into rights_value from private.source_rights_reviews r where r.source_id = source_id_value;
    if not found or rights_value.data_rights_status <> 'approved' or rights_value.terms_checked_at is null then
      raise exception 'Source data rights are not approved for staging' using errcode = '42501';
    end if;
    source_snapshot := item->'source';
    if jsonb_typeof(source_snapshot) <> 'object' then
      raise exception 'Import source snapshot must be an object' using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_object_keys(source_snapshot) as keys(source_key)
      where source_key not in ('name', 'type', 'url', 'termsUrl', 'licenseId', 'attribution')
    ) then
      raise exception 'Import source snapshot has an invalid shape' using errcode = '22023';
    end if;
    if source_snapshot->>'name' is distinct from source_snapshot_name
      or source_snapshot->>'type' is distinct from source_snapshot_type
      or source_snapshot->>'url' is distinct from source_url_value
      or source_snapshot->>'attribution' is distinct from source_snapshot_attribution
      or source_snapshot->>'licenseId' is distinct from rights_value.license_id
      or source_snapshot->>'termsUrl' is distinct from rights_value.terms_url then
      raise exception 'Import source snapshot differs from registered and reviewed source metadata' using errcode = '22023';
    end if;
    normalized_value := item->'normalizedRecord';
    if jsonb_typeof(normalized_value) <> 'object' or char_length(normalized_value::text) > 100000
      or jsonb_typeof(item->'issues') <> 'array'
      or jsonb_array_length(item->'issues') > 30 then
      raise exception 'Normalized import row is invalid' using errcode = '22023';
    end if;
    brand_snapshot := normalized_value->'brand';
    product_snapshot := normalized_value->'product';
    variant_snapshot := normalized_value->'variant';
    tasting_snapshot := normalized_value->'tastingNotes';
    flavor_snapshot := normalized_value->'flavors';
    if jsonb_typeof(brand_snapshot) <> 'object' or jsonb_typeof(product_snapshot) <> 'object'
      or jsonb_typeof(variant_snapshot) <> 'object' or jsonb_typeof(flavor_snapshot) <> 'array'
      or brand_snapshot->>'name' is null or brand_snapshot->>'normalizedName' is null
      or char_length(brand_snapshot->>'name') not between 1 and 200
      or char_length(brand_snapshot->>'normalizedName') not between 1 and 200
      or product_snapshot->>'name' is null
      or char_length(product_snapshot->>'name') not between 1 and 240
      or product_snapshot->>'normalizedName' is null or char_length(product_snapshot->>'normalizedName') not between 1 and 240
      or product_snapshot->>'categorySlug' is null or product_snapshot->>'categorySlug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or (brand_snapshot->>'countryCode' is not null and brand_snapshot->>'countryCode' !~ '^[A-Z]{2}$')
      or (product_snapshot->>'originCountryCode' is not null and product_snapshot->>'originCountryCode' !~ '^[A-Z]{2}$')
      or (product_snapshot->>'ageYears' is not null and ((product_snapshot->>'ageYears')::numeric < 0 or (product_snapshot->>'ageYears')::numeric > 999.99))
      or (product_snapshot->>'abvPercent' is not null and ((product_snapshot->>'abvPercent')::numeric < 0 or (product_snapshot->>'abvPercent')::numeric > 100))
      or (variant_snapshot->>'gtin' is not null and not private.valid_gtin(variant_snapshot->>'gtin'))
      or (variant_snapshot->>'volumeMl' is not null and ((variant_snapshot->>'volumeMl')::integer < 1 or (variant_snapshot->>'volumeMl')::integer > 10000))
      or (variant_snapshot->>'marketCountryCode' is not null and variant_snapshot->>'marketCountryCode' !~ '^[A-Z]{2}$')
      or (variant_snapshot->>'abvPercentOverride' is not null and ((variant_snapshot->>'abvPercentOverride')::numeric < 0 or (variant_snapshot->>'abvPercentOverride')::numeric > 100))
    then
      raise exception 'Normalized brand, product, variant, category, or numeric fields are invalid' using errcode = '22023';
    end if;
    select c.id into category_id_value from public.categories c
      where c.slug = product_snapshot->>'categorySlug' and c.active;
    if not found then raise exception 'Import row references an unknown or inactive category' using errcode = '22023'; end if;
    if jsonb_array_length(flavor_snapshot) > 24 then raise exception 'Too many sensory dimensions in import row' using errcode = '22023'; end if;
    if exists (
      select 1 from jsonb_array_elements(flavor_snapshot) as flavor(value)
      left join public.flavor_dimensions fd on fd.code = flavor.value->>'code' and fd.active
      where jsonb_typeof(flavor.value) <> 'object' or fd.id is null
        or flavor.value->>'code' !~ '^[a-z][a-z0-9_]*$'
        or (flavor.value->>'value') is null
        or (flavor.value->>'value')::numeric < 0 or (flavor.value->>'value')::numeric > 10
        or flavor.value->>'method' not in ('expert', 'editorial', 'manufacturer')
    ) then
      raise exception 'Flavor value contains an invalid dimension, score, or method' using errcode = '22023';
    end if;
    if normalized_value->'tastingNotes' is not null and normalized_value->'tastingNotes' <> 'null'::jsonb
      and rights_value.text_rights_status <> 'approved' then
      raise exception 'Tasting text requires separately approved text rights' using errcode = '42501';
    end if;
    if tasting_snapshot is not null and tasting_snapshot <> 'null'::jsonb and (
      jsonb_typeof(tasting_snapshot) <> 'object'
      or tasting_snapshot->>'authorType' not in ('manufacturer', 'expert', 'editorial')
      or (tasting_snapshot->>'nose' is not null and char_length(tasting_snapshot->>'nose') > 5000)
      or (tasting_snapshot->>'palate' is not null and char_length(tasting_snapshot->>'palate') > 5000)
      or (tasting_snapshot->>'finish' is not null and char_length(tasting_snapshot->>'finish') > 5000)
      or (tasting_snapshot->>'overall' is not null and char_length(tasting_snapshot->>'overall') > 5000)
      or (coalesce(tasting_snapshot->>'nose', tasting_snapshot->>'palate', tasting_snapshot->>'finish', tasting_snapshot->>'overall') is null)
    ) then
      raise exception 'Tasting note is invalid' using errcode = '22023';
    end if;
    if item->>'quality' is null or (item->>'quality') not in ('complete', 'incomplete')
      or item->>'recordKey' is null
      or (item->>'recordKey') !~ '^[a-f0-9]{64}$'
      or item->>'rowNumber' is null
      or (item->>'rowNumber') !~ '^[1-9][0-9]*$' then
      raise exception 'Import row identity or quality is invalid' using errcode = '22023';
    end if;
    retrieved_at_value := (item->>'retrievedAt')::timestamptz;
    if retrieved_at_value is null or retrieved_at_value > now() then
      raise exception 'Import retrieval timestamp is invalid or in the future' using errcode = '22023';
    end if;
  end loop;

  select id into job_id_value from private.import_jobs
  where input_digest = digest_value and normalizer_version = normalizer_value;
  if job_id_value is not null then
    return jsonb_build_object('jobId', job_id_value, 'idempotentReplay', true, 'recordCount', rows_count);
  end if;

    insert into private.import_jobs
    (input_digest, normalizer_version, created_by, row_count, staged_count, incomplete_count)
  values
    (digest_value, normalizer_value, actor_id, rows_count,
      (select count(*) from jsonb_array_elements(p_batch->'records') as entry(value) where entry.value->>'quality' = 'complete'),
      (select count(*) from jsonb_array_elements(p_batch->'records') as entry(value) where entry.value->>'quality' = 'incomplete'))
  returning id into job_id_value;

  for item in select value from jsonb_array_elements(p_batch->'records')
  loop
    source_url_value := item #>> '{source,url}';
    select s.id into source_id_value from public.sources s where s.canonical_url = source_url_value;
    source_snapshot := item->'source';
    retrieved_at_value := (item->>'retrievedAt')::timestamptz;
    insert into private.import_job_sources (job_id, source_id, source_snapshot, retrieved_at)
    values (job_id_value, source_id_value, source_snapshot, retrieved_at_value)
    on conflict (job_id, source_id) do nothing;

    row_number_value := (item->>'rowNumber')::integer;
    record_key_value := (item->>'recordKey')::char(64);
    quality_value := item->>'quality';
    normalized_value := item->'normalizedRecord';
    issues_value := coalesce(item->'issues', '[]'::jsonb);
    source_record_id_value := nullif(item->>'sourceRecordId', '');

    insert into private.import_records
      (job_id, source_id, row_number, record_key, source_record_id, quality, retrieved_at, normalized_record, issues)
    values
      (job_id_value, source_id_value, row_number_value, record_key_value, source_record_id_value,
       quality_value, retrieved_at_value, normalized_value, issues_value)
    returning id into record_id_value;

    insert into private.import_record_heads (source_id, record_key, current_record_id)
    values (source_id_value, record_key_value, record_id_value)
    on conflict (source_id, record_key) do update
      set current_record_id = excluded.current_record_id, updated_at = now();

    inserted_count := inserted_count + 1;
    if quality_value = 'incomplete' then incomplete_count := incomplete_count + 1; end if;
  end loop;

  return jsonb_build_object(
    'jobId', job_id_value,
    'idempotentReplay', false,
    'recordCount', rows_count,
    'stagedCount', inserted_count - incomplete_count,
    'incompleteCount', incomplete_count
  );
end;
$$;

revoke all on function public.register_import_sources(jsonb) from public, anon, authenticated;
revoke all on function public.review_import_source_rights(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.stage_catalog_import(jsonb) from public, anon, authenticated;
grant execute on function public.register_import_sources(jsonb) to authenticated;
grant execute on function public.review_import_source_rights(uuid, jsonb) to authenticated;
grant execute on function public.stage_catalog_import(jsonb) to authenticated;

-- Correct direct RPC bounds and treat wildcard characters in user input literally.
create or replace function public.search_catalog(
  search_term text,
  normalized_term text,
  category_slug text,
  flavor_code text,
  origin_country_code text,
  brand_slug text,
  page_number integer,
  page_size integer
)
returns table (
  id uuid,
  slug text,
  name text,
  brand_id uuid,
  brand_name text,
  brand_slug text,
  category_id uuid,
  category_name_de text,
  category_slug text,
  product_family text,
  origin_country_code text,
  origin_region text,
  age_years numeric,
  abv_percent numeric,
  description text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  with input as (
    select
      replace(replace(replace(coalesce(search_term, ''), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') as escaped_term,
      replace(replace(replace(coalesce(normalized_term, ''), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') as escaped_normalized,
      least(greatest(coalesce(page_number, 1), 1), 100) as safe_page,
      least(greatest(coalesce(page_size, 12), 1), 48) as safe_size
  ), matching as (
    select
      p.id, p.slug, p.name,
      b.id as brand_id, b.name as brand_name, b.slug as brand_slug,
      c.id as category_id, c.name_de as category_name_de, c.slug as category_slug,
      p.product_family, p.origin_country_code, p.origin_region, p.age_years, p.abv_percent, p.description
    from public.products p
    join public.brands b on b.id = p.brand_id
    join public.categories c on c.id = p.primary_category_id
    cross join input i
    where private.product_has_public_evidence(p.id)
      and (search_term is null or (
        char_length(search_term) <= 80
        and (
          p.name ilike '%' || i.escaped_term || '%' escape E'\\'
          or p.normalized_name ilike '%' || i.escaped_normalized || '%' escape E'\\'
          or b.name ilike '%' || i.escaped_term || '%' escape E'\\'
          or b.normalized_name ilike '%' || i.escaped_normalized || '%' escape E'\\'
        )
      ))
      and (category_slug is null or exists (
        select 1
        from public.categories selected_category
        where selected_category.slug = category_slug
          and selected_category.active
          and (selected_category.id = c.id or selected_category.id = c.parent_id)
      ))
      and (brand_slug is null or b.slug = brand_slug)
      and (origin_country_code is null or p.origin_country_code = origin_country_code)
      and (flavor_code is null or exists (
        select 1 from public.product_flavor_values fv
        join public.flavor_dimensions fd on fd.id = fv.dimension_id
        where fv.product_id = p.id and fd.code = flavor_code
          and fv.verification_status = 'approved' and fv.verified_at is not null
          and private.source_is_approved(fv.source_id, 'data')
      ))
  )
  select m.id, m.slug, m.name, m.brand_id, m.brand_name, m.brand_slug,
    m.category_id, m.category_name_de, m.category_slug, m.product_family,
    m.origin_country_code, m.origin_region, m.age_years, m.abv_percent, m.description,
    count(*) over () as total_count
  from matching m
  cross join input i
  order by m.name, m.id
  offset ((least(greatest(coalesce(page_number, 1), 1), 100) - 1)
    * least(greatest(coalesce(page_size, 12), 1), 48))
  limit least(greatest(coalesce(page_size, 12), 1), 48);
$$;

-- Published products stop resolving when their category is deactivated.
create or replace function private.brand_has_public_evidence(target_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1 from public.brands b
    join public.brand_field_provenance name_fp on name_fp.brand_id = b.id
    where b.id = target_brand_id and b.status = 'published' and b.verified_at is not null
      and name_fp.field_path = 'name' and name_fp.verification_status = 'approved'
      and name_fp.verified_at is not null and name_fp.raw_value_hash = md5(b.name)
      and private.source_is_approved(name_fp.source_id, 'data')
      and (b.country_code is null or exists (
        select 1 from public.brand_field_provenance country_fp
        where country_fp.brand_id = b.id and country_fp.field_path = 'country_code'
          and country_fp.verification_status = 'approved' and country_fp.verified_at is not null
          and country_fp.raw_value_hash = md5(b.country_code)
          and private.source_is_approved(country_fp.source_id, 'data')
      ))
  );
$$;

create or replace function private.product_has_public_evidence(target_product_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  p public.products%rowtype;
  claim record;
begin
  select * into p from public.products where id = target_product_id;
  if not found or p.product_status <> 'published' or p.editorial_reviewed_at is null then return false; end if;
  if not exists (select 1 from public.categories c where c.id = p.primary_category_id and c.active) then return false; end if;
  if not private.brand_has_public_evidence(p.brand_id) then return false; end if;

  for claim in
    select 'name'::text as field_path, p.name::text as field_value
    union all select 'brand_id', p.brand_id::text
    union all select 'primary_category_id', p.primary_category_id::text
    union all select 'product_family', p.product_family::text
    union all select 'origin_country_code', p.origin_country_code::text
    union all select 'origin_region', p.origin_region::text
    union all select 'age_years', p.age_years::text
    union all select 'distillation_details', p.distillation_details::text
    union all select 'maturation_details', p.maturation_details::text
    union all select 'description', p.description::text
    union all select 'abv_percent', p.abv_percent::text
  loop
    if claim.field_value is not null and not exists (
      select 1 from public.product_field_provenance fp
      where fp.product_id = target_product_id and fp.field_path = claim.field_path
        and fp.verification_status = 'approved' and fp.verified_at is not null
        and fp.raw_value_hash = md5(claim.field_value)
        and private.source_is_approved(fp.source_id, 'data')
    ) then return false; end if;
  end loop;
  return true;
end;
$$;

create policy community_reviews_public_read on public.community_reviews for select to anon, authenticated
  using (
    moderation_status = 'approved'
    and publication_consented_at is not null
    and moderated_at is not null
    and private.product_has_public_evidence(product_id)
  );
grant select (id, product_id, display_name, rating, nose_text, palate_text, finish_text, overall_text,
  origin, purchase_verified_at, created_at)
  on public.community_reviews to anon, authenticated;

-- Preserve schema-level permission needed by existing RLS expressions, but the API must never expose `private`.
revoke all on function public.register_import_sources(jsonb) from public;
revoke all on function public.review_import_source_rights(uuid, jsonb) from public;
revoke all on function public.stage_catalog_import(jsonb) from public;
