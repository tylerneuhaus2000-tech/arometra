-- The public source view exposes only already approved evidence.
-- Add the approval timestamp per field so the product page can show when each claim was checked.
create or replace view public.product_public_sources
with (security_barrier = true, security_invoker = false) as
  select distinct fp.product_id, fp.field_path, s.id as source_id, s.source_name, s.canonical_url, s.attribution_text,
    fp.verified_at
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
  select distinct p.id, 'brand_name', s.id, s.source_name, s.canonical_url, s.attribution_text, fp.verified_at
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
  select distinct fv.product_id, 'flavor:' || fd.code, s.id, s.source_name, s.canonical_url, s.attribution_text,
    fv.verified_at
  from public.product_flavor_values fv
  join public.flavor_dimensions fd on fd.id = fv.dimension_id
  join public.sources s on s.id = fv.source_id
  where private.product_has_public_evidence(fv.product_id)
    and fv.verification_status = 'approved'
    and fv.verified_at is not null
    and fv.raw_value_hash = md5(fv.value::text)
    and private.source_is_approved(fv.source_id, 'data')
  union
  select distinct v.product_id, 'variant:' || fp.field_path, s.id as source_id, s.source_name, s.canonical_url,
    s.attribution_text, fp.verified_at
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
