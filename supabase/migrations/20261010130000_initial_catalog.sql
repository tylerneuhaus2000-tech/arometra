-- AROMETRA catalog foundation. No products or product claims are seeded here.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create type public.product_status as enum ('draft', 'review', 'published', 'archived');
create type public.source_type as enum (
  'official_manufacturer', 'licensed_database', 'open_dataset', 'editorial', 'authorized_review', 'operator_entry'
);
create type public.rights_review_status as enum ('unreviewed', 'approved', 'blocked');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.flavor_method as enum ('expert', 'editorial', 'manufacturer', 'community_aggregated');
create type public.note_author_type as enum ('manufacturer', 'expert', 'editorial');
create type public.content_license_status as enum ('unreviewed', 'approved', 'blocked');
create type public.qr_link_status as enum ('active', 'disabled');
create type public.admin_role as enum ('owner', 'editor', 'reviewer', 'analyst');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_de text not null check (char_length(name_de) between 1 and 100),
  name_en text check (name_en is null or char_length(name_en) <= 100),
  description_de text check (description_de is null or char_length(description_de) <= 1000),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null check (char_length(source_name) between 1 and 200),
  source_type public.source_type not null,
  canonical_url text check (canonical_url is null or char_length(canonical_url) <= 2048),
  attribution_text text check (attribution_text is null or char_length(attribution_text) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Legal review details are kept outside the API-exposed public schema.
create table private.source_rights_reviews (
  source_id uuid primary key references public.sources(id) on delete cascade,
  data_rights_status public.rights_review_status not null default 'unreviewed',
  text_rights_status public.rights_review_status not null default 'unreviewed',
  image_rights_status public.rights_review_status not null default 'unreviewed',
  license_id text check (license_id is null or char_length(license_id) <= 200),
  terms_checked_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 5000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 200),
  normalized_name text not null check (char_length(normalized_name) between 1 and 200),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  description text check (description is null or char_length(description) <= 5000),
  status public.product_status not null default 'draft',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_field_provenance (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  field_path text not null check (field_path = 'name'),
  source_id uuid not null references public.sources(id) on delete restrict,
  raw_value_hash char(32) not null check (raw_value_hash ~ '^[a-f0-9]{32}$'),
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verification_note text check (verification_note is null or char_length(verification_note) <= 1000),
  created_at timestamptz not null default now(),
  unique (brand_id, field_path, source_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  primary_category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 240),
  normalized_name text not null check (char_length(normalized_name) between 1 and 240),
  product_family text check (product_family is null or char_length(product_family) <= 120),
  origin_country_code text check (origin_country_code is null or origin_country_code ~ '^[A-Z]{2}$'),
  origin_region text check (origin_region is null or char_length(origin_region) <= 160),
  age_years numeric(5,2) check (age_years is null or age_years >= 0),
  distillation_details text check (distillation_details is null or char_length(distillation_details) <= 5000),
  maturation_details text check (maturation_details is null or char_length(maturation_details) <= 5000),
  description text check (description is null or char_length(description) <= 10000),
  abv_percent numeric(5,2) check (abv_percent is null or abv_percent between 0 and 100),
  product_status public.product_status not null default 'draft',
  editorial_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_field_provenance (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  field_path text not null check (field_path in (
    'name', 'brand_id', 'primary_category_id', 'product_family', 'origin_country_code', 'origin_region',
    'age_years', 'distillation_details', 'maturation_details', 'description', 'abv_percent'
  )),
  source_id uuid not null references public.sources(id) on delete restrict,
  raw_value_hash char(32) not null check (raw_value_hash ~ '^[a-f0-9]{32}$'),
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verification_note text check (verification_note is null or char_length(verification_note) <= 1000),
  created_at timestamptz not null default now(),
  unique (product_id, field_path, source_id)
);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create function private.valid_gtin(value text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  body text;
  expected_digit integer;
  weighted_sum integer := 0;
  offset_from_right integer;
begin
  if value is null or value !~ '^[0-9]{8}([0-9]{4,6})?$' then
    return false;
  end if;
  body := left(value, length(value) - 1);
  for offset_from_right in 1..length(body) loop
    weighted_sum := weighted_sum
      + substring(body from length(body) - offset_from_right + 1 for 1)::integer
      * case when offset_from_right % 2 = 1 then 3 else 1 end;
  end loop;
  expected_digit := (10 - (weighted_sum % 10)) % 10;
  return expected_digit = right(value, 1)::integer;
end;
$$;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  gtin text check (gtin is null or private.valid_gtin(gtin)),
  volume_ml integer check (volume_ml is null or volume_ml > 0),
  market_country_code text check (market_country_code is null or market_country_code ~ '^[A-Z]{2}$'),
  abv_percent_override numeric(5,2) check (abv_percent_override is null or abv_percent_override between 0 and 100),
  edition_label text check (edition_label is null or char_length(edition_label) <= 200),
  variant_code text unique check (variant_code is null or char_length(variant_code) <= 120),
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, product_id)
);

create table public.variant_field_provenance (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  field_path text not null check (field_path in (
    'gtin', 'volume_ml', 'market_country_code', 'abv_percent_override', 'edition_label', 'variant_code'
  )),
  source_id uuid not null references public.sources(id) on delete restrict,
  raw_value_hash char(32) not null check (raw_value_hash ~ '^[a-f0-9]{32}$'),
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verification_note text check (verification_note is null or char_length(verification_note) <= 1000),
  created_at timestamptz not null default now(),
  unique (variant_id, field_path, source_id)
);

create unique index product_variants_gtin_unique on public.product_variants(gtin) where gtin is not null;

create table public.flavor_dimensions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  label_de text not null check (char_length(label_de) between 1 and 80),
  scale_min numeric(4,2) not null default 0,
  scale_max numeric(4,2) not null default 10,
  description text check (description is null or char_length(description) <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (scale_min < scale_max)
);

create table public.product_flavor_values (
  product_id uuid not null references public.products(id) on delete cascade,
  dimension_id uuid not null references public.flavor_dimensions(id) on delete restrict,
  value numeric(4,2) not null check (value between 0 and 10),
  source_id uuid not null references public.sources(id) on delete restrict,
  method public.flavor_method not null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  sample_size integer check (sample_size is null or sample_size > 0),
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  raw_value_hash char(32) check (raw_value_hash is null or raw_value_hash ~ '^[a-f0-9]{32}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, dimension_id, source_id, method)
);

create table public.tasting_notes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_label text check (author_label is null or char_length(author_label) <= 160),
  author_type public.note_author_type not null,
  nose_text text check (nose_text is null or char_length(nose_text) <= 5000),
  palate_text text check (palate_text is null or char_length(palate_text) <= 5000),
  finish_text text check (finish_text is null or char_length(finish_text) <= 5000),
  overall_text text check (overall_text is null or char_length(overall_text) <= 5000),
  source_id uuid not null references public.sources(id) on delete restrict,
  text_license_status public.content_license_status not null default 'unreviewed',
  review_status public.verification_status not null default 'pending',
  raw_content_hash char(32) check (raw_content_hash is null or raw_content_hash ~ '^[a-f0-9]{32}$'),
  tasted_at date,
  language text not null default 'de' check (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nose_text is not null or palate_text is not null or finish_text is not null or overall_text is not null)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  source_url text check (source_url is null or char_length(source_url) <= 2048),
  source_id uuid not null references public.sources(id) on delete restrict,
  alt_text text not null check (char_length(alt_text) between 1 and 500),
  image_license_status public.content_license_status not null default 'unreviewed',
  raw_image_hash char(32) check (raw_image_hash is null or raw_image_hash ~ '^[a-f0-9]{32}$'),
  attribution text check (attribution is null or char_length(attribution) <= 1000),
  photographer text check (photographer is null or char_length(photographer) <= 200),
  review_status public.verification_status not null default 'pending',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or source_url is not null)
);

create table public.qr_links (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique check (public_code ~ '^[A-Za-z0-9_-]{22,128}$'),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid,
  placement_id uuid,
  status public.qr_link_status not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  label text check (label is null or char_length(label) <= 200),
  foreign key (variant_id, product_id) references public.product_variants(id, product_id) on delete restrict
);

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_public_category_idx on public.products(product_status, primary_category_id, name);
create index products_brand_idx on public.products(brand_id);
create index product_field_provenance_lookup_idx on public.product_field_provenance(product_id, field_path, verification_status);
create index product_flavor_values_lookup_idx on public.product_flavor_values(product_id, dimension_id, verification_status);
create index qr_links_code_idx on public.qr_links(public_code);

create function private.source_is_approved(target_source_id uuid, content_kind text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select coalesce((
    select case content_kind
      when 'data' then r.data_rights_status = 'approved'
      when 'text' then r.text_rights_status = 'approved'
      when 'image' then r.image_rights_status = 'approved'
      else false
    end
    from private.source_rights_reviews r
    where r.source_id = target_source_id
  ), false);
$$;

create function private.source_is_publicly_attributable(target_source_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.source_is_approved(target_source_id, 'data')
      or private.source_is_approved(target_source_id, 'text')
      or private.source_is_approved(target_source_id, 'image');
$$;

create function private.enforce_source_rights_review()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if (
    new.data_rights_status = 'approved'
    or new.text_rights_status = 'approved'
    or new.image_rights_status = 'approved'
  ) and (new.terms_checked_at is null or new.reviewed_at is null) then
    raise exception 'Approved source rights require checked terms and a review timestamp';
  end if;
  return new;
end;
$$;

create function private.brand_has_public_evidence(target_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.brands b
    join public.brand_field_provenance fp on fp.brand_id = b.id
    where b.id = target_brand_id
      and b.status = 'published'
      and b.verified_at is not null
      and fp.field_path = 'name'
      and fp.verification_status = 'approved'
      and fp.verified_at is not null
      and fp.raw_value_hash = md5(b.name)
      and private.source_is_approved(fp.source_id, 'data')
  );
$$;

create function private.product_has_public_evidence(target_product_id uuid)
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
  if not found or p.product_status <> 'published' or p.editorial_reviewed_at is null then
    return false;
  end if;
  if not private.brand_has_public_evidence(p.brand_id) then
    return false;
  end if;

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
      select 1
      from public.product_field_provenance fp
      where fp.product_id = target_product_id
        and fp.field_path = claim.field_path
        and fp.verification_status = 'approved'
        and fp.verified_at is not null
        and fp.raw_value_hash = md5(claim.field_value)
        and private.source_is_approved(fp.source_id, 'data')
    ) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create function private.variant_has_public_evidence(target_variant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v public.product_variants%rowtype;
  claim record;
begin
  select * into v from public.product_variants where id = target_variant_id;
  if not found or v.status <> 'published' or not private.product_has_public_evidence(v.product_id) then
    return false;
  end if;

  for claim in
    select 'gtin'::text as field_path, v.gtin::text as field_value
    union all select 'volume_ml', v.volume_ml::text
    union all select 'market_country_code', v.market_country_code::text
    union all select 'abv_percent_override', v.abv_percent_override::text
    union all select 'edition_label', v.edition_label::text
    union all select 'variant_code', v.variant_code::text
  loop
    if claim.field_value is not null and not exists (
      select 1
      from public.variant_field_provenance fp
      where fp.variant_id = target_variant_id
        and fp.field_path = claim.field_path
        and fp.verification_status = 'approved'
        and fp.verified_at is not null
        and fp.raw_value_hash = md5(claim.field_value)
        and private.source_is_approved(fp.source_id, 'data')
    ) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create function public.search_catalog(
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
  with matching as (
    select
      p.id,
      p.slug,
      p.name,
      b.id as brand_id,
      b.name as brand_name,
      b.slug as brand_slug,
      c.id as category_id,
      c.name_de as category_name_de,
      c.slug as category_slug,
      p.product_family,
      p.origin_country_code,
      p.origin_region,
      p.age_years,
      p.abv_percent,
      p.description
    from public.products p
    join public.brands b on b.id = p.brand_id
    join public.categories c on c.id = p.primary_category_id
    where private.product_has_public_evidence(p.id)
      and (search_term is null or (
        char_length(search_term) <= 80
        and (
          p.name ilike '%' || search_term || '%'
          or p.normalized_name ilike '%' || coalesce(normalized_term, '') || '%'
          or b.name ilike '%' || search_term || '%'
          or b.normalized_name ilike '%' || coalesce(normalized_term, '') || '%'
        )
      ))
      and (category_slug is null or c.slug = category_slug)
      and (brand_slug is null or b.slug = brand_slug)
      and (origin_country_code is null or p.origin_country_code = origin_country_code)
      and (flavor_code is null or exists (
        select 1
        from public.product_flavor_values fv
        join public.flavor_dimensions fd on fd.id = fv.dimension_id
        where fv.product_id = p.id
          and fd.code = flavor_code
          and fv.verification_status = 'approved'
          and fv.verified_at is not null
          and private.source_is_approved(fv.source_id, 'data')
      ))
  )
  select
    m.id, m.slug, m.name, m.brand_id, m.brand_name, m.brand_slug,
    m.category_id, m.category_name_de, m.category_slug, m.product_family,
    m.origin_country_code, m.origin_region, m.age_years, m.abv_percent, m.description,
    count(*) over () as total_count
  from matching m
  order by m.name, m.id
  offset (greatest(coalesce(page_number, 1), 1) - 1) * least(greatest(coalesce(page_size, 12), 1), 48)
  limit least(greatest(coalesce(page_size, 12), 1), 48);
$$;

create function private.enforce_brand_publication_evidence()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.status = 'published' and not private.brand_has_public_evidence(new.id) then
    raise exception 'Brand cannot be published without approved, current name provenance and source rights';
  end if;
  return new;
end;
$$;

create function private.enforce_product_publication_evidence()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.product_status = 'published' and not private.product_has_public_evidence(new.id) then
    raise exception 'Product cannot be published without approved, current field provenance and source rights';
  end if;
  return new;
end;
$$;

create function private.enforce_variant_publication_evidence()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.status = 'published' and not private.variant_has_public_evidence(new.id) then
    raise exception 'Variant cannot be published without approved, current field provenance and source rights';
  end if;
  return new;
end;
$$;

create function private.enforce_flavor_source_rights()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.verification_status = 'approved' and (
    new.verified_at is null
    or not private.source_is_approved(new.source_id, 'data')
    or new.raw_value_hash is distinct from md5(new.value::text)
  ) then
    raise exception 'Approved flavor values require a current value hash and verified data-source rights';
  end if;
  return new;
end;
$$;

create function private.enforce_tasting_note_rights()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.review_status = 'approved' and (
    new.text_license_status <> 'approved'
    or not private.source_is_approved(new.source_id, 'text')
    or new.raw_content_hash is distinct from md5(concat_ws(E'\n',
      coalesce(new.author_label, ''), new.author_type::text, coalesce(new.nose_text, ''), coalesce(new.palate_text, ''),
      coalesce(new.finish_text, ''), coalesce(new.overall_text, ''), new.source_id::text, coalesce(new.tasted_at::text, ''), new.language
    ))
  ) then
    raise exception 'Approved tasting notes require a current text hash and separately approved text rights';
  end if;
  return new;
end;
$$;

create function private.enforce_image_rights()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.review_status = 'approved' and (
    new.image_license_status <> 'approved'
    or not private.source_is_approved(new.source_id, 'image')
    or new.raw_image_hash is distinct from md5(concat_ws(E'\n',
      coalesce(new.storage_path, ''), coalesce(new.source_url, ''), new.source_id::text,
      new.alt_text, coalesce(new.attribution, ''), coalesce(new.photographer, '')
    ))
  ) then
    raise exception 'Approved images require a current image hash and separately approved image rights';
  end if;
  return new;
end;
$$;

create function public.resolve_qr_link(lookup_code text)
returns table (resolution_status text, product_slug text)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select
    case
      when q.status = 'disabled' or (q.expires_at is not null and q.expires_at <= now()) then 'disabled'
      when p.id is not null
        and private.product_has_public_evidence(p.id)
        and (
          q.variant_id is null
          or exists (
            select 1 from public.product_variants v
            where v.id = q.variant_id and v.product_id = q.product_id and private.variant_has_public_evidence(v.id)
          )
        ) then 'active'
      else 'unavailable'
    end as resolution_status,
    case
      when q.status = 'active'
        and (q.expires_at is null or q.expires_at > now())
        and p.id is not null
        and private.product_has_public_evidence(p.id)
        and (
          q.variant_id is null
          or exists (
            select 1 from public.product_variants v
            where v.id = q.variant_id and v.product_id = q.product_id and private.variant_has_public_evidence(v.id)
          )
        ) then p.slug
      else null
    end as product_slug
  from public.qr_links q
  left join public.products p on p.id = q.product_id
  where q.public_code = lookup_code
    and lookup_code ~ '^[A-Za-z0-9_-]{22,128}$'
  limit 1;
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger brands_updated_at before update on public.brands for each row execute function private.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function private.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function private.set_updated_at();
create trigger sources_updated_at before update on public.sources for each row execute function private.set_updated_at();
create trigger source_rights_updated_at before update on private.source_rights_reviews for each row execute function private.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants for each row execute function private.set_updated_at();
create trigger flavor_values_updated_at before update on public.product_flavor_values for each row execute function private.set_updated_at();
create trigger tasting_notes_updated_at before update on public.tasting_notes for each row execute function private.set_updated_at();
create trigger product_images_updated_at before update on public.product_images for each row execute function private.set_updated_at();
create trigger admin_members_updated_at before update on public.admin_members for each row execute function private.set_updated_at();
create trigger source_rights_review_guard before insert or update on private.source_rights_reviews
  for each row execute function private.enforce_source_rights_review();
create trigger brands_publication_evidence after insert or update on public.brands for each row execute function private.enforce_brand_publication_evidence();
create trigger products_publication_evidence after insert or update on public.products for each row execute function private.enforce_product_publication_evidence();
create trigger variants_publication_evidence after insert or update on public.product_variants for each row
  execute function private.enforce_variant_publication_evidence();
create trigger flavor_values_source_rights before insert or update on public.product_flavor_values for each row execute function private.enforce_flavor_source_rights();
create trigger tasting_notes_source_rights before insert or update on public.tasting_notes for each row execute function private.enforce_tasting_note_rights();
create trigger product_images_source_rights before insert or update on public.product_images for each row execute function private.enforce_image_rights();

alter table public.categories enable row level security;
alter table public.sources enable row level security;
alter table private.source_rights_reviews enable row level security;
alter table public.brands enable row level security;
alter table public.brand_field_provenance enable row level security;
alter table public.products enable row level security;
alter table public.product_field_provenance enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_field_provenance enable row level security;
alter table public.flavor_dimensions enable row level security;
alter table public.product_flavor_values enable row level security;
alter table public.tasting_notes enable row level security;
alter table public.product_images enable row level security;
alter table public.qr_links enable row level security;
alter table public.admin_members enable row level security;

create policy categories_public_read on public.categories for select to anon, authenticated using (active);
create policy sources_public_attribution on public.sources for select to anon, authenticated using (private.source_is_publicly_attributable(id));
create policy brands_public_read on public.brands for select to anon, authenticated using (private.brand_has_public_evidence(id));
create policy brand_provenance_public_read on public.brand_field_provenance for select to anon, authenticated
  using (
    verification_status = 'approved'
    and verified_at is not null
    and private.brand_has_public_evidence(brand_id)
    and raw_value_hash = md5((select b.name from public.brands b where b.id = brand_id))
    and private.source_is_approved(source_id, 'data')
  );
create policy products_public_read on public.products for select to anon, authenticated using (private.product_has_public_evidence(id));
create policy product_provenance_public_read on public.product_field_provenance for select to anon, authenticated
  using (
    verification_status = 'approved'
    and verified_at is not null
    and private.product_has_public_evidence(product_id)
    and raw_value_hash = md5((
      select case field_path
        when 'name' then p.name::text
        when 'brand_id' then p.brand_id::text
        when 'primary_category_id' then p.primary_category_id::text
        when 'product_family' then p.product_family::text
        when 'origin_country_code' then p.origin_country_code::text
        when 'origin_region' then p.origin_region::text
        when 'age_years' then p.age_years::text
        when 'distillation_details' then p.distillation_details::text
        when 'maturation_details' then p.maturation_details::text
        when 'description' then p.description::text
        when 'abv_percent' then p.abv_percent::text
      end
      from public.products p where p.id = product_id
    ))
    and private.source_is_approved(source_id, 'data')
  );
create policy variants_public_read on public.product_variants for select to anon, authenticated
  using (private.variant_has_public_evidence(id));
create policy variant_provenance_public_read on public.variant_field_provenance for select to anon, authenticated
  using (
    verification_status = 'approved'
    and verified_at is not null
    and private.variant_has_public_evidence(variant_id)
    and raw_value_hash = md5((
      select case field_path
        when 'gtin' then v.gtin::text
        when 'volume_ml' then v.volume_ml::text
        when 'market_country_code' then v.market_country_code::text
        when 'abv_percent_override' then v.abv_percent_override::text
        when 'edition_label' then v.edition_label::text
        when 'variant_code' then v.variant_code::text
      end
      from public.product_variants v where v.id = variant_id
    ))
    and private.source_is_approved(source_id, 'data')
  );
create policy flavor_dimensions_public_read on public.flavor_dimensions for select to anon, authenticated using (active);
create policy flavor_values_public_read on public.product_flavor_values for select to anon, authenticated
  using (
    verification_status = 'approved'
    and verified_at is not null
    and raw_value_hash = md5(value::text)
    and private.source_is_approved(source_id, 'data')
    and private.product_has_public_evidence(product_id)
  );
create policy tasting_notes_public_read on public.tasting_notes for select to anon, authenticated
  using (
    review_status = 'approved'
    and text_license_status = 'approved'
    and raw_content_hash = md5(concat_ws(E'\n',
      coalesce(author_label, ''), author_type::text, coalesce(nose_text, ''), coalesce(palate_text, ''),
      coalesce(finish_text, ''), coalesce(overall_text, ''), source_id::text, coalesce(tasted_at::text, ''), language
    ))
    and private.source_is_approved(source_id, 'text')
    and private.product_has_public_evidence(product_id)
  );
create policy product_images_public_read on public.product_images for select to anon, authenticated
  using (
    review_status = 'approved'
    and image_license_status = 'approved'
    and raw_image_hash = md5(concat_ws(E'\n',
      coalesce(storage_path, ''), coalesce(source_url, ''), source_id::text,
      alt_text, coalesce(attribution, ''), coalesce(photographer, '')
    ))
    and private.source_is_approved(source_id, 'image')
    and private.product_has_public_evidence(product_id)
  );

revoke all on table public.categories, public.sources, public.brands, public.brand_field_provenance,
  public.products, public.product_field_provenance, public.product_categories, public.product_variants,
  public.variant_field_provenance,
  public.flavor_dimensions, public.product_flavor_values, public.tasting_notes, public.product_images,
  public.qr_links, public.admin_members, private.source_rights_reviews from anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select (id, source_name, source_type, canonical_url, attribution_text) on public.sources to anon, authenticated;
grant select (id, slug, name, normalized_name) on public.brands to anon, authenticated;
grant select (brand_id, field_path, source_id) on public.brand_field_provenance to anon, authenticated;
grant select (id, brand_id, primary_category_id, slug, name, normalized_name, product_family, origin_country_code,
  origin_region, age_years, distillation_details, maturation_details, description, abv_percent, created_at, updated_at)
  on public.products to anon, authenticated;
grant select (product_id, field_path, source_id) on public.product_field_provenance to anon, authenticated;
grant select (id, product_id, gtin, volume_ml, market_country_code, abv_percent_override, edition_label, variant_code)
  on public.product_variants to anon, authenticated;
grant select (variant_id, field_path, source_id) on public.variant_field_provenance to anon, authenticated;
grant select on public.flavor_dimensions to anon, authenticated;
grant select (product_id, dimension_id, value, source_id, method, verified_at, verification_status)
  on public.product_flavor_values to anon, authenticated;
grant select (id, product_id, author_label, author_type, nose_text, palate_text, finish_text, overall_text,
  source_id, tasted_at, language) on public.tasting_notes to anon, authenticated;
grant select (id, product_id, storage_path, source_id, alt_text, attribution, sort_order)
  on public.product_images to anon, authenticated;

grant execute on function private.source_is_approved(uuid, text) to anon, authenticated;
grant execute on function private.source_is_publicly_attributable(uuid) to anon, authenticated;
grant execute on function private.brand_has_public_evidence(uuid) to anon, authenticated;
grant execute on function private.product_has_public_evidence(uuid) to anon, authenticated;
grant execute on function private.variant_has_public_evidence(uuid) to anon, authenticated;
revoke all on function public.resolve_qr_link(text) from public, anon, authenticated;
grant execute on function public.resolve_qr_link(text) to anon, authenticated;
revoke all on function public.search_catalog(text, text, text, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_catalog(text, text, text, text, text, text, integer, integer) to anon, authenticated;

-- Runs with owner table privileges but returns only explicitly checked, current public attributions.
create view public.product_public_sources with (security_barrier = true, security_invoker = false) as
  select distinct fp.product_id, fp.field_path, s.id as source_id, s.source_name, s.canonical_url, s.attribution_text
  from public.product_field_provenance fp
  join public.products p on p.id = fp.product_id
  join public.sources s on s.id = fp.source_id
  where private.product_has_public_evidence(fp.product_id)
    and fp.verification_status = 'approved'
    and fp.verified_at is not null
    and fp.raw_value_hash = md5(case fp.field_path
      when 'name' then p.name::text
      when 'brand_id' then p.brand_id::text
      when 'primary_category_id' then p.primary_category_id::text
      when 'product_family' then p.product_family::text
      when 'origin_country_code' then p.origin_country_code::text
      when 'origin_region' then p.origin_region::text
      when 'age_years' then p.age_years::text
      when 'distillation_details' then p.distillation_details::text
      when 'maturation_details' then p.maturation_details::text
      when 'description' then p.description::text
      when 'abv_percent' then p.abv_percent::text
    end)
    and private.source_is_approved(fp.source_id, 'data')
  union
  select distinct p.id, 'brand_name', s.id, s.source_name, s.canonical_url, s.attribution_text
  from public.products p
  join public.brands b on b.id = p.brand_id
  join public.brand_field_provenance fp on fp.brand_id = b.id
  join public.sources s on s.id = fp.source_id
  where private.product_has_public_evidence(p.id)
    and fp.field_path = 'name'
    and fp.verification_status = 'approved'
    and fp.verified_at is not null
    and fp.raw_value_hash = md5(b.name)
    and private.source_is_approved(fp.source_id, 'data')
  union
  select distinct fv.product_id, 'flavor:' || fd.code, s.id, s.source_name, s.canonical_url, s.attribution_text
  from public.product_flavor_values fv
  join public.flavor_dimensions fd on fd.id = fv.dimension_id
  join public.sources s on s.id = fv.source_id
  where private.product_has_public_evidence(fv.product_id)
    and fv.verification_status = 'approved'
    and fv.verified_at is not null
    and fv.raw_value_hash = md5(fv.value::text)
    and private.source_is_approved(fv.source_id, 'data')
  union
  select distinct v.product_id, 'variant:' || fp.field_path, s.id as source_id, s.source_name, s.canonical_url, s.attribution_text
  from public.variant_field_provenance fp
  join public.product_variants v on v.id = fp.variant_id
  join public.sources s on s.id = fp.source_id
  where private.variant_has_public_evidence(v.id)
    and fp.verification_status = 'approved'
    and fp.verified_at is not null
    and fp.raw_value_hash = md5(case fp.field_path
      when 'gtin' then v.gtin::text
      when 'volume_ml' then v.volume_ml::text
      when 'market_country_code' then v.market_country_code::text
      when 'abv_percent_override' then v.abv_percent_override::text
      when 'edition_label' then v.edition_label::text
      when 'variant_code' then v.variant_code::text
    end)
    and private.source_is_approved(fp.source_id, 'data');

grant select on public.product_public_sources to anon, authenticated;
