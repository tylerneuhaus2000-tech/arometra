-- Category-specific qualitative profiles adapted from the supplied AROMETRA V3 SQLite package.
-- Additive only: seeds navigation/profile taxonomy, but imports no product facts, reviews, scores, or images.
-- Source archive: AROMETRA_GESCHMACKSPROFILE_V3; profile measurements were empty (0 rows).

do $$
declare
  item record;
  parent_category_id uuid;
begin
  for item in
    select * from (values
  ('whisky', 'Whisky', NULL, 10),
  ('whisky-scotch', 'Scotch Whisky', 'whisky', 11),
  ('whisky-irish', 'Irish Whiskey', 'whisky', 12),
  ('whisky-american', 'American Whiskey', 'whisky', 13),
  ('whisky-japanese', 'Japanischer Whisky', 'whisky', 14),
  ('whisky-other', 'Weitere Whisk(e)ys', 'whisky', 15),
  ('rum', 'Rum', NULL, 16),
  ('rum-white', 'Weißer Rum', 'rum', 17),
  ('rum-aged', 'Gereifter Rum', 'rum', 18),
  ('rum-agricole', 'Rhum Agricole', 'rum', 19),
  ('rum-spiced', 'Spiced Rum', 'rum', 20),
  ('gin', 'Gin', NULL, 21),
  ('gin-london-dry', 'London Dry Gin', 'gin', 22),
  ('gin-distilled', 'Distilled Gin', 'gin', 23),
  ('gin-old-tom', 'Old Tom Gin', 'gin', 24),
  ('gin-flavoured', 'Aromatisierter Gin', 'gin', 25),
  ('wodka', 'Wodka', NULL, 26),
  ('wodka-classic', 'Klassischer Wodka', 'wodka', 27),
  ('wodka-flavoured', 'Aromatisierter Wodka', 'wodka', 28),
  ('tequila', 'Tequila', NULL, 29),
  ('tequila-blanco', 'Blanco', 'tequila', 30),
  ('tequila-reposado', 'Reposado', 'tequila', 31),
  ('tequila-anejo', 'Añejo', 'tequila', 32),
  ('tequila-extra-anejo', 'Extra Añejo', 'tequila', 33),
  ('mezcal', 'Mezcal', NULL, 34),
  ('mezcal-artesanal', 'Mezcal Artesanal', 'mezcal', 35),
  ('mezcal-ancestral', 'Mezcal Ancestral', 'mezcal', 36),
  ('cognac-brandy', 'Cognac und Brandy', NULL, 37),
  ('cognac', 'Cognac', 'cognac-brandy', 38),
  ('armagnac', 'Armagnac', 'cognac-brandy', 39),
  ('brandy-other', 'Weitere Weinbrände', 'cognac-brandy', 40),
  ('likoere', 'Liköre', NULL, 41),
  ('likoere-herbal', 'Kräuterliköre', 'likoere', 42),
  ('likoere-fruit', 'Fruchtliköre', 'likoere', 43),
  ('likoere-cream', 'Sahneliköre', 'likoere', 44),
  ('likoere-coffee', 'Kaffeeliköre', 'likoere', 45),
  ('grappa', 'Grappa', NULL, 46),
  ('pisco', 'Pisco', NULL, 47),
  ('baijiu', 'Baijiu', NULL, 48),
  ('soju-shochu', 'Soju und Shochu', NULL, 49),
  ('soju', 'Soju', 'soju-shochu', 50),
  ('shochu', 'Shochu', 'soju-shochu', 51),
  ('aquavit', 'Aquavit', NULL, 52),
  ('obstbraende', 'Obstbrände', NULL, 53),
  ('obstbrand-pear', 'Birnenbrände', 'obstbraende', 54),
  ('obstbrand-cherry', 'Kirschbrände', 'obstbraende', 55),
  ('obstbrand-apple', 'Apfelbrände', 'obstbraende', 56)
    ) as seed(slug, name_de, parent_slug, sort_order)
    order by sort_order
  loop
    parent_category_id := null;
    if item.parent_slug is not null then
      select id into parent_category_id from public.categories where slug = item.parent_slug;
      if parent_category_id is null then
        raise exception 'Category parent missing for %', item.slug;
      end if;
    end if;
    insert into public.categories (slug, name_de, parent_id, sort_order)
    values (item.slug, item.name_de, parent_category_id, item.sort_order)
    on conflict (slug) do nothing;
  end loop;
end;
$$;

create table public.sensory_dimensions (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  label_de text not null check (char_length(label_de) between 1 and 120),
  semantic_family text not null check (char_length(semantic_family) between 1 and 80),
  description_de text not null default '' check (char_length(description_de) <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sensory_tags (
  code text primary key check (code ~ '^[a-z][a-z0-9_-]*$'),
  label_de text not null check (char_length(label_de) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Profile categories are the nearest configured category ancestor, not always the navigation root.
create table public.category_sensory_dimensions (
  category_id uuid not null references public.categories(id) on delete restrict,
  dimension_code text not null references public.sensory_dimensions(code) on delete restrict,
  display_order integer not null check (display_order > 0),
  visible_by_default boolean not null default true,
  primary key (category_id, dimension_code),
  unique (category_id, display_order)
);

create table public.category_sensory_tag_rules (
  category_id uuid not null,
  tag_code text not null references public.sensory_tags(code) on delete restrict,
  dimension_code text not null,
  primary key (category_id, tag_code, dimension_code),
  foreign key (category_id, dimension_code)
    references public.category_sensory_dimensions(category_id, dimension_code) on delete restrict
);

create table public.product_sensory_descriptors (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null,
  dimension_code text not null,
  tag_code text not null,
  source_id uuid not null references public.sources(id) on delete restrict,
  evidence_type public.flavor_method not null,
  stage text not null default 'unspecified'
    check (stage in ('unspecified', 'nose', 'palate', 'finish')),
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  raw_descriptor_hash char(32) check (raw_descriptor_hash is null or raw_descriptor_hash ~ '^[a-f0-9]{32}$'),
  verification_note text check (verification_note is null or char_length(verification_note) <= 1000),
  created_at timestamptz not null default now(),
  primary key (product_id, category_id, dimension_code, tag_code, source_id, stage),
  foreign key (category_id, dimension_code)
    references public.category_sensory_dimensions(category_id, dimension_code) on delete restrict,
  foreign key (category_id, tag_code, dimension_code)
    references public.category_sensory_tag_rules(category_id, tag_code, dimension_code) on delete restrict
);

create table public.product_sensory_measurements (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null,
  dimension_code text not null,
  value numeric(4,2) not null check (value between 0 and 10),
  measurement_method text not null check (char_length(measurement_method) between 1 and 300),
  evidence_type public.flavor_method not null,
  source_id uuid not null references public.sources(id) on delete restrict,
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  raw_measurement_hash char(32) check (raw_measurement_hash is null or raw_measurement_hash ~ '^[a-f0-9]{32}$'),
  created_at timestamptz not null default now(),
  primary key (product_id, category_id, dimension_code, source_id, evidence_type),
  foreign key (category_id, dimension_code)
    references public.category_sensory_dimensions(category_id, dimension_code) on delete restrict
);

create index product_sensory_descriptors_product_idx
  on public.product_sensory_descriptors (product_id, category_id, dimension_code);
create index product_sensory_measurements_product_idx
  on public.product_sensory_measurements (product_id, category_id, dimension_code);

create function private.resolve_sensory_profile_category(target_category_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with recursive category_path as (
    select c.id, c.parent_id, 0 as depth
    from public.categories c
    where c.id = target_category_id
    union all
    select parent.id, parent.parent_id, child.depth + 1
    from public.categories parent
    join category_path child on child.parent_id = parent.id
  )
  select path.id
  from category_path path
  where exists (
    select 1 from public.category_sensory_dimensions configured
    where configured.category_id = path.id
  )
  order by path.depth asc
  limit 1;
$$;

create function private.enforce_sensory_profile_ancestor()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  product_category_id uuid;
begin
  select p.primary_category_id into product_category_id
  from public.products p where p.id = new.product_id;
  if product_category_id is null then
    raise exception 'Sensory evidence requires an existing product category';
  end if;
  if new.category_id is distinct from private.resolve_sensory_profile_category(product_category_id) then
    raise exception 'Sensory evidence must use the nearest configured product category profile';
  end if;
  return new;
end;
$$;

create function private.enforce_sensory_descriptor_rights()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.verification_status = 'approved' and (
    new.verified_at is null
    or not private.source_is_approved(new.source_id, 'data')
    or new.raw_descriptor_hash is distinct from md5(concat_ws(E'\n',
      new.category_id::text, new.dimension_code, new.tag_code, new.evidence_type::text, new.stage
    ))
  ) then
    raise exception 'Approved sensory descriptors require current evidence and data-source rights';
  end if;
  return new;
end;
$$;

create function private.enforce_sensory_measurement_rights()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.verification_status = 'approved' and (
    new.verified_at is null
    or not private.source_is_approved(new.source_id, 'data')
    or new.raw_measurement_hash is distinct from md5(concat_ws(E'\n',
      new.category_id::text, new.dimension_code, new.value::text,
      new.measurement_method, new.evidence_type::text
    ))
  ) then
    raise exception 'Approved sensory measurements require current method, hash and data-source rights';
  end if;
  return new;
end;
$$;

create trigger product_sensory_descriptor_ancestor
  before insert or update on public.product_sensory_descriptors
  for each row execute function private.enforce_sensory_profile_ancestor();
create trigger product_sensory_descriptor_rights
  before insert or update on public.product_sensory_descriptors
  for each row execute function private.enforce_sensory_descriptor_rights();
create trigger product_sensory_measurement_ancestor
  before insert or update on public.product_sensory_measurements
  for each row execute function private.enforce_sensory_profile_ancestor();
create trigger product_sensory_measurement_rights
  before insert or update on public.product_sensory_measurements
  for each row execute function private.enforce_sensory_measurement_rights();

alter table public.sensory_dimensions enable row level security;
alter table public.sensory_tags enable row level security;
alter table public.category_sensory_dimensions enable row level security;
alter table public.category_sensory_tag_rules enable row level security;
alter table public.product_sensory_descriptors enable row level security;
alter table public.product_sensory_measurements enable row level security;

create policy sensory_dimensions_public_read on public.sensory_dimensions
  for select to anon, authenticated using (active);
create policy sensory_tags_public_read on public.sensory_tags
  for select to anon, authenticated using (active);
create policy category_sensory_dimensions_public_read on public.category_sensory_dimensions
  for select to anon, authenticated using (
    visible_by_default and exists (
      select 1 from public.categories c where c.id = category_id and c.active
    ) and exists (
      select 1 from public.sensory_dimensions d where d.code = dimension_code and d.active
    )
  );
create policy category_sensory_tag_rules_public_read on public.category_sensory_tag_rules
  for select to anon, authenticated using (
    exists (select 1 from public.categories c where c.id = category_id and c.active)
    and exists (select 1 from public.sensory_dimensions d where d.code = dimension_code and d.active)
    and exists (select 1 from public.sensory_tags t where t.code = tag_code and t.active)
  );

revoke all on table public.sensory_dimensions, public.sensory_tags,
  public.category_sensory_dimensions, public.category_sensory_tag_rules,
  public.product_sensory_descriptors, public.product_sensory_measurements
  from public, anon, authenticated;
grant select on public.sensory_dimensions, public.sensory_tags,
  public.category_sensory_dimensions, public.category_sensory_tag_rules
  to anon, authenticated;

create function public.get_product_sensory_profile(target_product_id uuid)
returns table (
  category_id uuid,
  dimension_code text,
  dimension_label_de text,
  semantic_family text,
  display_order integer,
  tag_code text,
  tag_label_de text,
  evidence_type public.flavor_method,
  stage text,
  source_name text,
  canonical_url text,
  descriptor_verified_at timestamptz,
  intensity numeric,
  measurement_method text,
  measurement_evidence_type public.flavor_method,
  measurement_source_name text,
  measurement_source_url text,
  measurement_verified_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with visible_product as (
    select p.id, p.primary_category_id
    from public.products p
    where p.id = target_product_id
      and p.product_status = 'published'
      and private.product_has_public_evidence(p.id)
  ), profile as (
    select private.resolve_sensory_profile_category(vp.primary_category_id) as category_id
    from visible_product vp
  ), dimensions as (
    select d.category_id, sd.code as dimension_code, sd.label_de as dimension_label_de,
      sd.semantic_family, d.display_order
    from profile pr
    join public.category_sensory_dimensions d on d.category_id = pr.category_id and d.visible_by_default
    join public.sensory_dimensions sd on sd.code = d.dimension_code and sd.active
  ), descriptors as (
    select ds.dimension_code, st.code as tag_code, st.label_de as tag_label_de,
      ds.evidence_type, ds.stage, s.source_name, s.canonical_url,
      ds.verified_at as descriptor_verified_at
    from visible_product vp
    join profile pr on pr.category_id is not null
    join public.product_sensory_descriptors ds
      on ds.product_id = vp.id and ds.category_id = pr.category_id
    join public.sensory_tags st on st.code = ds.tag_code and st.active
    join public.sources s on s.id = ds.source_id
    where ds.verification_status = 'approved'
      and ds.verified_at is not null
      and ds.raw_descriptor_hash = md5(concat_ws(E'\n',
        ds.category_id::text, ds.dimension_code, ds.tag_code, ds.evidence_type::text, ds.stage
      ))
      and private.source_is_approved(ds.source_id, 'data')
  ), measurements_ranked as (
    select ms.dimension_code, ms.value as intensity, ms.measurement_method,
      ms.evidence_type as measurement_evidence_type, s.source_name as measurement_source_name,
      s.canonical_url as measurement_source_url, ms.verified_at as measurement_verified_at,
      row_number() over (
        partition by ms.dimension_code
        order by case ms.evidence_type when 'expert' then 0 when 'editorial' then 1 when 'manufacturer' then 2 else 3 end,
          ms.verified_at desc
      ) as priority
    from visible_product vp
    join profile pr on pr.category_id is not null
    join public.product_sensory_measurements ms
      on ms.product_id = vp.id and ms.category_id = pr.category_id
    join public.sources s on s.id = ms.source_id
    where ms.verification_status = 'approved'
      and ms.verified_at is not null
      and ms.raw_measurement_hash = md5(concat_ws(E'\n',
        ms.category_id::text, ms.dimension_code, ms.value::text,
        ms.measurement_method, ms.evidence_type::text
      ))
      and private.source_is_approved(ms.source_id, 'data')
  )
  select d.category_id, d.dimension_code, d.dimension_label_de, d.semantic_family, d.display_order,
    ds.tag_code, ds.tag_label_de, ds.evidence_type, ds.stage, ds.source_name, ds.canonical_url,
    ds.descriptor_verified_at, mr.intensity, mr.measurement_method, mr.measurement_evidence_type,
    mr.measurement_source_name, mr.measurement_source_url, mr.measurement_verified_at
  from dimensions d
  left join descriptors ds on ds.dimension_code = d.dimension_code
  left join measurements_ranked mr on mr.dimension_code = d.dimension_code and mr.priority = 1
  order by d.display_order, ds.tag_label_de nulls first;
$$;

create function public.get_public_sensory_tags(target_product_ids uuid[])
returns table (
  product_id uuid,
  tag_code text,
  tag_label_de text,
  evidence_type public.flavor_method,
  category_id uuid,
  source_name text,
  canonical_url text
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with visible_products as (
    select p.id, private.resolve_sensory_profile_category(p.primary_category_id) as category_id
    from public.products p
    where p.id = any(coalesce(target_product_ids, array[]::uuid[]))
      and coalesce(array_length(target_product_ids, 1), 0) <= 1000
      and p.product_status = 'published'
      and private.product_has_public_evidence(p.id)
  )
  select distinct ds.product_id, st.code, st.label_de, ds.evidence_type,
    ds.category_id, s.source_name, s.canonical_url
  from visible_products vp
  join public.product_sensory_descriptors ds
    on ds.product_id = vp.id and ds.category_id = vp.category_id
  join public.sensory_tags st on st.code = ds.tag_code and st.active
  join public.sources s on s.id = ds.source_id
  where ds.verification_status = 'approved'
    and ds.verified_at is not null
    and ds.raw_descriptor_hash = md5(concat_ws(E'\n',
      ds.category_id::text, ds.dimension_code, ds.tag_code, ds.evidence_type::text, ds.stage
    ))
    and private.source_is_approved(ds.source_id, 'data');
$$;

revoke all on function private.resolve_sensory_profile_category(uuid) from public, anon, authenticated;
revoke all on function private.enforce_sensory_profile_ancestor() from public, anon, authenticated;
revoke all on function private.enforce_sensory_descriptor_rights() from public, anon, authenticated;
revoke all on function private.enforce_sensory_measurement_rights() from public, anon, authenticated;
revoke all on function public.get_product_sensory_profile(uuid) from public, anon, authenticated;
revoke all on function public.get_public_sensory_tags(uuid[]) from public, anon, authenticated;
grant execute on function public.get_product_sensory_profile(uuid) to anon, authenticated;
grant execute on function public.get_public_sensory_tags(uuid[]) to anon, authenticated;

do $$
begin
  insert into public.sensory_dimensions (code, label_de, semantic_family, description_de)
  values
  ('ba_floral', 'Florale Noten', 'floral', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ba_fruit', 'Fruchtige Ester', 'esters', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ba_grain', 'Getreide & Fermentation', 'grain', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ba_savory', 'Herzhafte / Umami-Noten', 'savory', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ba_spice', 'Gewürze', 'spice', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ba_texture', 'Körper & Mundgefühl', 'texture', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('co_dried', 'Trockenfrüchte', 'dried_fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('co_floral', 'Florale Aromen', 'floral', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('co_fruit', 'Frische Früchte', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('co_rancio', 'Rancio / Reifekomplexität', 'rancio', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('co_spice', 'Gewürze', 'spice', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('co_texture', 'Mundgefühl', 'texture', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('co_vanilla', 'Vanille & Süßnoten', 'sweet', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('co_wood', 'Eiche & Holz', 'wood', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gi_citrus', 'Zitrus', 'citrus', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gi_earth', 'Wurzeln & erdige Noten', 'earth', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gi_floral', 'Blüten', 'floral', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gi_fruit', 'Frucht', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gi_herbal', 'Kräuter', 'herbal', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gi_juniper', 'Wacholder', 'juniper', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gi_spice', 'Gewürz-Botanicals', 'spice', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gr_floral', 'Blüten', 'floral', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gr_fruit', 'Frucht', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gr_grape', 'Trester-/Traubencharakter', 'grape', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gr_herbal', 'Kräuter & Würze', 'herbal', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gr_oak', 'Eiche (falls gereift)', 'wood', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('gr_texture', 'Mundgefühl', 'texture', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('li_cocoa', 'Schokolade & Kakao', 'cocoa', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('li_coffee', 'Kaffee & Röstnoten', 'coffee', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('li_cream', 'Cremigkeit & Textur', 'texture', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('li_fruit', 'Frucht', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('li_herbal', 'Kräuter & Gewürze', 'herbal', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('li_main', 'Hauptaromatik', 'primary_aroma', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('li_sweet', 'Wahrgenommene Süße', 'sweet', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('me_agave', 'Agave', 'agave', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('me_earth', 'Erdige Noten', 'earth', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('me_fruit', 'Frucht & Zitrus', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('me_mineral', 'Mineralität', 'mineral', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('me_smoke', 'Rauch', 'smoke', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('me_spice', 'Würze', 'spice', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('pi_floral', 'Blüten', 'floral', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('pi_fruit', 'Frucht', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('pi_grape', 'Traube', 'grape', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('pi_herbal', 'Kräuter & Würze', 'herbal', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('pi_texture', 'Mundgefühl', 'texture', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ru_cane', 'Zuckerrohr & Melasse', 'cane', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ru_caramel', 'Karamell & Toffee', 'sweet', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ru_esters', 'Fruchtige Fermentationsnoten', 'esters', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ru_floral', 'Blüten & Nussnoten', 'floral', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ru_oak', 'Eiche & Holz', 'wood', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ru_spice', 'Würze', 'spice', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ru_tropical', 'Tropische Früchte', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('ru_vanilla', 'Vanille', 'vanilla', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('so_clean', 'Neutralität', 'neutrality', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('so_finish', 'Abgang', 'finish', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('so_fruit', 'Fruchtige Noten', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('so_grain', 'Rohstoff / Getreide', 'grain', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('so_sweet', 'Wahrgenommene Süße', 'sweet', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('so_texture', 'Mundgefühl', 'texture', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('te_agave', 'Agave', 'agave', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('te_citrus', 'Zitrus & Frucht', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('te_mineral', 'Mineralität', 'mineral', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('te_oak', 'Holz & Vanille (bei Reifung)', 'wood', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('te_pepper', 'Pfeffer & Gewürze', 'spice', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('te_texture', 'Mundgefühl', 'texture', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('te_vegetal', 'Pflanzlich & kräutrig', 'herbal', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('vo_finish', 'Abgang', 'finish', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('vo_fruit', 'Subtile Frucht', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('vo_grain', 'Getreide & Rohstoff', 'grain', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('vo_neutral', 'Neutralität & Klarheit', 'neutrality', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('vo_spice', 'Würze', 'spice', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('vo_texture', 'Mundgefühl', 'texture', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('wh_coastal', 'Maritime Noten', 'coastal', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('wh_fruit', 'Frucht & Zitrus', 'fruit', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('wh_grain', 'Malz & Getreide', 'grain', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('wh_oak', 'Eiche & Holz', 'wood', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('wh_roast', 'Röst- & Nussnoten', 'roast', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('wh_smoke', 'Rauch & Torf', 'smoke', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('wh_spice', 'Würze & Kräuter', 'spice', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.'),
  ('wh_sweet', 'Vanille, Honig & Karamell', 'sweet', 'Qualitative Aromadimension; keine numerische Intensität ohne belegte Methodik.')
  on conflict (code) do nothing;

  insert into public.sensory_tags (code, label_de)
  values
  ('agave', 'Agave'),
  ('ananas', 'Ananas'),
  ('apfel', 'Apfel'),
  ('aprikose', 'Aprikose'),
  ('banane', 'Banane'),
  ('birne', 'Birne'),
  ('blumig', 'Blumig'),
  ('cremig', 'Cremig'),
  ('dunkle_schokolade', 'Dunkle Schokolade'),
  ('eiche', 'Eiche'),
  ('espresso', 'Espresso'),
  ('floral', 'Floral'),
  ('fruchtig', 'Fruchtig'),
  ('getreide', 'Getreide'),
  ('holzgewuerz', 'Holzgewürze'),
  ('holzig', 'Holzig'),
  ('honig', 'Honig'),
  ('karamell', 'Karamell'),
  ('koriander', 'Koriander'),
  ('lakritz', 'Lakritz'),
  ('limette', 'Limette'),
  ('mais', 'Mais'),
  ('malzig', 'Malzig'),
  ('mandel', 'Mandel'),
  ('maritim', 'Maritim'),
  ('medizinisch', 'Medizinisch'),
  ('melone', 'Melone'),
  ('menthol', 'Menthol'),
  ('milchschokolade', 'Milchschokolade'),
  ('mild', 'Mild'),
  ('nussig', 'Nussig'),
  ('orange', 'Orange'),
  ('orangebluete', 'Orangenblüte'),
  ('pfeffer', 'Pfeffer'),
  ('pfirsich', 'Pfirsich'),
  ('rauchig', 'Rauchig'),
  ('sahne', 'Sahne'),
  ('salzig', 'Salzig'),
  ('schokolade', 'Schokolade'),
  ('seetang', 'Seetang'),
  ('suess', 'Süß'),
  ('toffee', 'Toffee'),
  ('torf', 'Torf'),
  ('torfig', 'Torfig'),
  ('trockenfrucht', 'Trockenfrucht'),
  ('vanille', 'Vanille'),
  ('wacholder', 'Wacholder'),
  ('wuerzig', 'Würzig'),
  ('zitrone', 'Zitrone'),
  ('zitrus', 'Zitrus')
  on conflict (code) do nothing;

  insert into public.category_sensory_dimensions (category_id, dimension_code, display_order, visible_by_default)
  select c.id, seed.dimension_code, seed.display_order, seed.visible_by_default
  from (values
  ('baijiu', 'ba_grain', 1, true),
  ('baijiu', 'ba_fruit', 2, true),
  ('baijiu', 'ba_floral', 3, true),
  ('baijiu', 'ba_savory', 4, true),
  ('baijiu', 'ba_spice', 5, true),
  ('baijiu', 'ba_texture', 6, true),
  ('cognac', 'co_fruit', 1, true),
  ('cognac', 'co_dried', 2, true),
  ('cognac', 'co_floral', 3, true),
  ('cognac', 'co_wood', 4, true),
  ('cognac', 'co_vanilla', 5, true),
  ('cognac', 'co_spice', 6, true),
  ('cognac', 'co_rancio', 7, true),
  ('cognac', 'co_texture', 8, true),
  ('gin', 'gi_juniper', 1, true),
  ('gin', 'gi_citrus', 2, true),
  ('gin', 'gi_herbal', 3, true),
  ('gin', 'gi_floral', 4, true),
  ('gin', 'gi_spice', 5, true),
  ('gin', 'gi_earth', 6, true),
  ('gin', 'gi_fruit', 7, true),
  ('grappa', 'gr_grape', 1, true),
  ('grappa', 'gr_fruit', 2, true),
  ('grappa', 'gr_floral', 3, true),
  ('grappa', 'gr_herbal', 4, true),
  ('grappa', 'gr_oak', 5, true),
  ('grappa', 'gr_texture', 6, true),
  ('likoere', 'li_sweet', 1, true),
  ('likoere', 'li_main', 2, true),
  ('likoere', 'li_fruit', 3, true),
  ('likoere', 'li_cocoa', 4, true),
  ('likoere', 'li_coffee', 5, true),
  ('likoere', 'li_cream', 6, true),
  ('likoere', 'li_herbal', 7, true),
  ('mezcal', 'me_agave', 1, true),
  ('mezcal', 'me_smoke', 2, true),
  ('mezcal', 'me_earth', 3, true),
  ('mezcal', 'me_fruit', 4, true),
  ('mezcal', 'me_spice', 5, true),
  ('mezcal', 'me_mineral', 6, true),
  ('pisco', 'pi_grape', 1, true),
  ('pisco', 'pi_fruit', 2, true),
  ('pisco', 'pi_floral', 3, true),
  ('pisco', 'pi_herbal', 4, true),
  ('pisco', 'pi_texture', 5, true),
  ('rum', 'ru_cane', 1, true),
  ('rum', 'ru_caramel', 2, true),
  ('rum', 'ru_tropical', 3, true),
  ('rum', 'ru_spice', 4, true),
  ('rum', 'ru_oak', 5, true),
  ('rum', 'ru_vanilla', 6, true),
  ('rum', 'ru_esters', 7, true),
  ('rum', 'ru_floral', 8, true),
  ('soju', 'so_grain', 1, true),
  ('soju', 'so_clean', 2, true),
  ('soju', 'so_fruit', 3, true),
  ('soju', 'so_sweet', 4, true),
  ('soju', 'so_texture', 5, true),
  ('soju', 'so_finish', 6, true),
  ('tequila', 'te_agave', 1, true),
  ('tequila', 'te_vegetal', 2, true),
  ('tequila', 'te_citrus', 3, true),
  ('tequila', 'te_pepper', 4, true),
  ('tequila', 'te_mineral', 5, true),
  ('tequila', 'te_oak', 6, true),
  ('tequila', 'te_texture', 7, true),
  ('wodka', 'vo_grain', 1, true),
  ('wodka', 'vo_neutral', 2, true),
  ('wodka', 'vo_fruit', 3, true),
  ('wodka', 'vo_spice', 4, true),
  ('wodka', 'vo_texture', 5, true),
  ('wodka', 'vo_finish', 6, true),
  ('whisky', 'wh_smoke', 1, true),
  ('whisky', 'wh_grain', 2, true),
  ('whisky', 'wh_oak', 3, true),
  ('whisky', 'wh_sweet', 4, true),
  ('whisky', 'wh_fruit', 5, true),
  ('whisky', 'wh_spice', 6, true),
  ('whisky', 'wh_coastal', 7, true),
  ('whisky', 'wh_roast', 8, true)
  ) as seed(category_slug, dimension_code, display_order, visible_by_default)
  join public.categories c on c.slug = seed.category_slug
  on conflict (category_id, dimension_code) do nothing;

  insert into public.category_sensory_tag_rules (category_id, tag_code, dimension_code)
  select c.id, seed.tag_code, seed.dimension_code
  from (values
  ('baijiu', 'ananas', 'ba_fruit'),
  ('baijiu', 'banane', 'ba_fruit'),
  ('baijiu', 'birne', 'ba_fruit'),
  ('baijiu', 'blumig', 'ba_floral'),
  ('baijiu', 'cremig', 'ba_texture'),
  ('baijiu', 'floral', 'ba_floral'),
  ('baijiu', 'fruchtig', 'ba_fruit'),
  ('baijiu', 'getreide', 'ba_grain'),
  ('baijiu', 'mais', 'ba_grain'),
  ('baijiu', 'malzig', 'ba_grain'),
  ('baijiu', 'mild', 'ba_texture'),
  ('baijiu', 'pfeffer', 'ba_spice'),
  ('baijiu', 'wuerzig', 'ba_spice'),
  ('cognac', 'apfel', 'co_fruit'),
  ('cognac', 'aprikose', 'co_fruit'),
  ('cognac', 'birne', 'co_fruit'),
  ('cognac', 'blumig', 'co_floral'),
  ('cognac', 'cremig', 'co_texture'),
  ('cognac', 'eiche', 'co_wood'),
  ('cognac', 'floral', 'co_floral'),
  ('cognac', 'fruchtig', 'co_fruit'),
  ('cognac', 'holzgewuerz', 'co_spice'),
  ('cognac', 'holzig', 'co_wood'),
  ('cognac', 'honig', 'co_vanilla'),
  ('cognac', 'karamell', 'co_vanilla'),
  ('cognac', 'lakritz', 'co_spice'),
  ('cognac', 'mild', 'co_texture'),
  ('cognac', 'orange', 'co_fruit'),
  ('cognac', 'orangebluete', 'co_floral'),
  ('cognac', 'pfeffer', 'co_spice'),
  ('cognac', 'pfirsich', 'co_fruit'),
  ('cognac', 'suess', 'co_vanilla'),
  ('cognac', 'toffee', 'co_vanilla'),
  ('cognac', 'trockenfrucht', 'co_dried'),
  ('cognac', 'vanille', 'co_vanilla'),
  ('cognac', 'wuerzig', 'co_spice'),
  ('cognac', 'zitrus', 'co_fruit'),
  ('gin', 'apfel', 'gi_fruit'),
  ('gin', 'aprikose', 'gi_fruit'),
  ('gin', 'birne', 'gi_fruit'),
  ('gin', 'blumig', 'gi_floral'),
  ('gin', 'floral', 'gi_floral'),
  ('gin', 'fruchtig', 'gi_fruit'),
  ('gin', 'koriander', 'gi_spice'),
  ('gin', 'lakritz', 'gi_spice'),
  ('gin', 'limette', 'gi_citrus'),
  ('gin', 'menthol', 'gi_herbal'),
  ('gin', 'orange', 'gi_citrus'),
  ('gin', 'orangebluete', 'gi_floral'),
  ('gin', 'pfeffer', 'gi_spice'),
  ('gin', 'wacholder', 'gi_juniper'),
  ('gin', 'wuerzig', 'gi_spice'),
  ('gin', 'zitrone', 'gi_citrus'),
  ('gin', 'zitrus', 'gi_citrus'),
  ('grappa', 'apfel', 'gr_fruit'),
  ('grappa', 'aprikose', 'gr_fruit'),
  ('grappa', 'birne', 'gr_fruit'),
  ('grappa', 'blumig', 'gr_floral'),
  ('grappa', 'cremig', 'gr_texture'),
  ('grappa', 'eiche', 'gr_oak'),
  ('grappa', 'floral', 'gr_floral'),
  ('grappa', 'fruchtig', 'gr_fruit'),
  ('grappa', 'holzig', 'gr_oak'),
  ('grappa', 'menthol', 'gr_herbal'),
  ('grappa', 'mild', 'gr_texture'),
  ('grappa', 'vanille', 'gr_oak'),
  ('grappa', 'wuerzig', 'gr_herbal'),
  ('grappa', 'zitrus', 'gr_fruit'),
  ('likoere', 'apfel', 'li_fruit'),
  ('likoere', 'aprikose', 'li_fruit'),
  ('likoere', 'banane', 'li_fruit'),
  ('likoere', 'birne', 'li_fruit'),
  ('likoere', 'cremig', 'li_cream'),
  ('likoere', 'dunkle_schokolade', 'li_cocoa'),
  ('likoere', 'espresso', 'li_coffee'),
  ('likoere', 'fruchtig', 'li_fruit'),
  ('likoere', 'honig', 'li_sweet'),
  ('likoere', 'karamell', 'li_sweet'),
  ('likoere', 'koriander', 'li_herbal'),
  ('likoere', 'lakritz', 'li_main'),
  ('likoere', 'milchschokolade', 'li_cocoa'),
  ('likoere', 'mild', 'li_cream'),
  ('likoere', 'orange', 'li_main'),
  ('likoere', 'orangebluete', 'li_main'),
  ('likoere', 'pfeffer', 'li_herbal'),
  ('likoere', 'sahne', 'li_cream'),
  ('likoere', 'schokolade', 'li_cocoa'),
  ('likoere', 'suess', 'li_sweet'),
  ('likoere', 'toffee', 'li_sweet'),
  ('likoere', 'vanille', 'li_main'),
  ('likoere', 'wuerzig', 'li_herbal'),
  ('likoere', 'zitrus', 'li_fruit'),
  ('mezcal', 'agave', 'me_agave'),
  ('mezcal', 'ananas', 'me_fruit'),
  ('mezcal', 'fruchtig', 'me_fruit'),
  ('mezcal', 'limette', 'me_fruit'),
  ('mezcal', 'orange', 'me_fruit'),
  ('mezcal', 'pfeffer', 'me_spice'),
  ('mezcal', 'rauchig', 'me_smoke'),
  ('mezcal', 'wuerzig', 'me_spice'),
  ('mezcal', 'zitrus', 'me_fruit'),
  ('pisco', 'apfel', 'pi_fruit'),
  ('pisco', 'aprikose', 'pi_fruit'),
  ('pisco', 'birne', 'pi_fruit'),
  ('pisco', 'blumig', 'pi_floral'),
  ('pisco', 'cremig', 'pi_texture'),
  ('pisco', 'floral', 'pi_floral'),
  ('pisco', 'fruchtig', 'pi_fruit'),
  ('pisco', 'koriander', 'pi_herbal'),
  ('pisco', 'menthol', 'pi_herbal'),
  ('pisco', 'mild', 'pi_texture'),
  ('pisco', 'orangebluete', 'pi_floral'),
  ('pisco', 'pfirsich', 'pi_fruit'),
  ('pisco', 'wuerzig', 'pi_herbal'),
  ('pisco', 'zitrus', 'pi_fruit'),
  ('rum', 'ananas', 'ru_tropical'),
  ('rum', 'aprikose', 'ru_tropical'),
  ('rum', 'banane', 'ru_tropical'),
  ('rum', 'blumig', 'ru_floral'),
  ('rum', 'eiche', 'ru_oak'),
  ('rum', 'floral', 'ru_floral'),
  ('rum', 'fruchtig', 'ru_tropical'),
  ('rum', 'holzgewuerz', 'ru_spice'),
  ('rum', 'holzig', 'ru_oak'),
  ('rum', 'honig', 'ru_caramel'),
  ('rum', 'karamell', 'ru_caramel'),
  ('rum', 'lakritz', 'ru_spice'),
  ('rum', 'limette', 'ru_tropical'),
  ('rum', 'mandel', 'ru_floral'),
  ('rum', 'melone', 'ru_tropical'),
  ('rum', 'nussig', 'ru_floral'),
  ('rum', 'orange', 'ru_tropical'),
  ('rum', 'orangebluete', 'ru_floral'),
  ('rum', 'pfeffer', 'ru_spice'),
  ('rum', 'suess', 'ru_caramel'),
  ('rum', 'toffee', 'ru_caramel'),
  ('rum', 'vanille', 'ru_vanilla'),
  ('rum', 'wuerzig', 'ru_spice'),
  ('rum', 'zitrus', 'ru_tropical'),
  ('soju', 'apfel', 'so_fruit'),
  ('soju', 'birne', 'so_fruit'),
  ('soju', 'cremig', 'so_texture'),
  ('soju', 'fruchtig', 'so_fruit'),
  ('soju', 'getreide', 'so_grain'),
  ('soju', 'honig', 'so_sweet'),
  ('soju', 'mais', 'so_grain'),
  ('soju', 'malzig', 'so_grain'),
  ('soju', 'mild', 'so_texture'),
  ('soju', 'suess', 'so_sweet'),
  ('soju', 'zitrus', 'so_fruit'),
  ('tequila', 'agave', 'te_agave'),
  ('tequila', 'ananas', 'te_citrus'),
  ('tequila', 'cremig', 'te_texture'),
  ('tequila', 'eiche', 'te_oak'),
  ('tequila', 'fruchtig', 'te_citrus'),
  ('tequila', 'holzig', 'te_oak'),
  ('tequila', 'karamell', 'te_oak'),
  ('tequila', 'limette', 'te_citrus'),
  ('tequila', 'melone', 'te_citrus'),
  ('tequila', 'mild', 'te_texture'),
  ('tequila', 'orange', 'te_citrus'),
  ('tequila', 'pfeffer', 'te_pepper'),
  ('tequila', 'vanille', 'te_oak'),
  ('tequila', 'wuerzig', 'te_pepper'),
  ('tequila', 'zitrus', 'te_citrus'),
  ('wodka', 'apfel', 'vo_fruit'),
  ('wodka', 'birne', 'vo_fruit'),
  ('wodka', 'cremig', 'vo_texture'),
  ('wodka', 'fruchtig', 'vo_fruit'),
  ('wodka', 'getreide', 'vo_grain'),
  ('wodka', 'mais', 'vo_grain'),
  ('wodka', 'malzig', 'vo_grain'),
  ('wodka', 'mild', 'vo_texture'),
  ('wodka', 'pfeffer', 'vo_spice'),
  ('wodka', 'trockenfrucht', 'vo_fruit'),
  ('wodka', 'wuerzig', 'vo_spice'),
  ('wodka', 'zitrus', 'vo_fruit'),
  ('whisky', 'ananas', 'wh_fruit'),
  ('whisky', 'apfel', 'wh_fruit'),
  ('whisky', 'banane', 'wh_fruit'),
  ('whisky', 'birne', 'wh_fruit'),
  ('whisky', 'eiche', 'wh_oak'),
  ('whisky', 'espresso', 'wh_roast'),
  ('whisky', 'fruchtig', 'wh_fruit'),
  ('whisky', 'getreide', 'wh_grain'),
  ('whisky', 'holzgewuerz', 'wh_spice'),
  ('whisky', 'holzig', 'wh_oak'),
  ('whisky', 'honig', 'wh_sweet'),
  ('whisky', 'karamell', 'wh_sweet'),
  ('whisky', 'lakritz', 'wh_spice'),
  ('whisky', 'limette', 'wh_fruit'),
  ('whisky', 'mais', 'wh_grain'),
  ('whisky', 'malzig', 'wh_grain'),
  ('whisky', 'maritim', 'wh_coastal'),
  ('whisky', 'medizinisch', 'wh_smoke'),
  ('whisky', 'menthol', 'wh_spice'),
  ('whisky', 'nussig', 'wh_roast'),
  ('whisky', 'orange', 'wh_fruit'),
  ('whisky', 'pfeffer', 'wh_spice'),
  ('whisky', 'pfirsich', 'wh_fruit'),
  ('whisky', 'rauchig', 'wh_smoke'),
  ('whisky', 'salzig', 'wh_coastal'),
  ('whisky', 'schokolade', 'wh_roast'),
  ('whisky', 'seetang', 'wh_coastal'),
  ('whisky', 'suess', 'wh_sweet'),
  ('whisky', 'toffee', 'wh_sweet'),
  ('whisky', 'torf', 'wh_smoke'),
  ('whisky', 'torfig', 'wh_smoke'),
  ('whisky', 'trockenfrucht', 'wh_fruit'),
  ('whisky', 'vanille', 'wh_sweet'),
  ('whisky', 'wuerzig', 'wh_spice'),
  ('whisky', 'zitrone', 'wh_fruit'),
  ('whisky', 'zitrus', 'wh_fruit')
  ) as seed(category_slug, tag_code, dimension_code)
  join public.categories c on c.slug = seed.category_slug
  on conflict (category_id, tag_code, dimension_code) do nothing;
end;
$$;



create function private.product_has_public_sensory_tag(target_product_id uuid, target_tag_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.products p
    join public.product_sensory_descriptors ds
      on ds.product_id = p.id
      and ds.category_id = private.resolve_sensory_profile_category(p.primary_category_id)
    where p.id = target_product_id
      and p.product_status = 'published'
      and private.product_has_public_evidence(p.id)
      and ds.tag_code = target_tag_code
      and ds.verification_status = 'approved'
      and ds.verified_at is not null
      and ds.raw_descriptor_hash = md5(concat_ws(E'\n',
        ds.category_id::text, ds.dimension_code, ds.tag_code, ds.evidence_type::text, ds.stage
      ))
      and private.source_is_approved(ds.source_id, 'data')
  );
$$;

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
          strpos(lower(p.name), lower(search_term)) > 0
          or (coalesce(normalized_term, '') <> '' and strpos(p.normalized_name, normalized_term) > 0)
          or strpos(lower(b.name), lower(search_term)) > 0
          or (coalesce(normalized_term, '') <> '' and strpos(b.normalized_name, normalized_term) > 0)
        )
      ))
      and (category_slug is null or exists (
        with recursive category_ancestors as (
          select current_category.id, current_category.parent_id, current_category.slug
          from public.categories current_category
          where current_category.id = p.primary_category_id
          union all
          select parent.id, parent.parent_id, parent.slug
          from public.categories parent
          join category_ancestors child on child.parent_id = parent.id
        )
        select 1 from category_ancestors where slug = category_slug
      ))
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
      ) or private.product_has_public_sensory_tag(p.id, flavor_code))
  )
  select
    m.id, m.slug, m.name, m.brand_id, m.brand_name, m.brand_slug,
    m.category_id, m.category_name_de, m.category_slug, m.product_family,
    m.origin_country_code, m.origin_region, m.age_years, m.abv_percent, m.description,
    count(*) over () as total_count
  from matching m
  order by m.name, m.id
  offset (greatest(coalesce(page_number, 1), 1)::bigint - 1) * least(greatest(coalesce(page_size, 12), 1), 48)::bigint
  limit least(greatest(coalesce(page_size, 12), 1), 48);
$$;

revoke all on function private.product_has_public_sensory_tag(uuid, text) from public;
grant execute on function private.product_has_public_sensory_tag(uuid, text) to anon, authenticated;
