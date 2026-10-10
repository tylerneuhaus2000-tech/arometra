-- Extend the existing reviewed import workflow with separately sourced image candidates.
-- Image candidates stay pending and invisible until both source rights and image review approve them.

alter table public.tasting_notes
  add column mouthfeel_hash char(32)
    check (mouthfeel_hash is null or mouthfeel_hash ~ '^[a-f0-9]{32}$');

create or replace function private.enforce_tasting_note_rights()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  legacy_hash text;
  mouthfeel_aware_hash text;
begin
  legacy_hash := md5(concat_ws(E'\n',
    coalesce(new.author_label, ''), new.author_type::text, coalesce(new.nose_text, ''),
    coalesce(new.palate_text, ''), coalesce(new.finish_text, ''), coalesce(new.overall_text, ''),
    new.source_id::text, coalesce(new.tasted_at::text, ''), new.language
  ));
  mouthfeel_aware_hash := md5(concat_ws(E'\n',
    coalesce(new.author_label, ''), new.author_type::text, coalesce(new.nose_text, ''),
    coalesce(new.palate_text, ''), coalesce(new.mouthfeel_text, ''), coalesce(new.finish_text, ''),
    coalesce(new.overall_text, ''), new.source_id::text, coalesce(new.tasted_at::text, ''), new.language
  ));

  if new.review_status = 'approved' and (
    new.text_license_status <> 'approved'
    or not private.source_is_approved(new.source_id, 'text')
    or not (
      (new.raw_content_hash = mouthfeel_aware_hash and new.mouthfeel_hash is null)
      or (new.raw_content_hash = legacy_hash and (
        (new.mouthfeel_text is null and new.mouthfeel_hash is null)
        or (new.mouthfeel_text is not null and new.mouthfeel_hash = md5(new.mouthfeel_text))
      ))
    )
  ) then
    raise exception 'Approved tasting notes require current field hashes and separately approved text rights';
  end if;
  return new;
end;
$$;

drop policy if exists tasting_notes_public_read on public.tasting_notes;
create policy tasting_notes_public_read on public.tasting_notes for select to anon, authenticated
  using (
    review_status = 'approved'
    and text_license_status = 'approved'
    and (
      (raw_content_hash = md5(concat_ws(E'\n',
      coalesce(author_label, ''), author_type::text, coalesce(nose_text, ''),
      coalesce(palate_text, ''), coalesce(mouthfeel_text, ''), coalesce(finish_text, ''), coalesce(overall_text, ''),
      source_id::text, coalesce(tasted_at::text, ''), language
      )) and mouthfeel_hash is null)
      or (raw_content_hash = md5(concat_ws(E'\n',
        coalesce(author_label, ''), author_type::text, coalesce(nose_text, ''),
        coalesce(palate_text, ''), coalesce(finish_text, ''), coalesce(overall_text, ''),
        source_id::text, coalesce(tasted_at::text, ''), language
      )) and (
        (mouthfeel_text is null and mouthfeel_hash is null)
        or (mouthfeel_text is not null and mouthfeel_hash = md5(mouthfeel_text))
      ))
    )
    and private.source_is_approved(source_id, 'text')
    and private.product_has_public_evidence(product_id)
  );

create unique index product_images_import_identity_unique
  on public.product_images (product_id, source_id, source_url)
  where source_url is not null;

create table private.product_image_review_events (
  id uuid primary key default gen_random_uuid(),
  product_image_id uuid not null references public.product_images(id) on delete restrict,
  review_status public.verification_status not null,
  image_license_status public.content_license_status not null,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  note text check (note is null or char_length(note) <= 5000),
  reviewed_at timestamptz not null default now()
);
alter table private.product_image_review_events enable row level security;
revoke all on table private.product_image_review_events from public, anon, authenticated;

create or replace function public.review_product_image(p_image_id uuid, p_decision jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  actor_id uuid := auth.uid();
  image_value public.product_images%rowtype;
  rights_value private.source_rights_reviews%rowtype;
  next_status public.verification_status;
  next_license_status public.content_license_status;
  note_value text;
  image_hash text;
begin
  if actor_id is null or not exists (
    select 1 from public.admin_members m
    where m.user_id = actor_id and m.is_active and m.role in ('owner', 'reviewer')
  ) then
    raise exception 'Product image review requires an active owner or reviewer' using errcode = '42501';
  end if;
  if p_decision is null or jsonb_typeof(p_decision) <> 'object'
    or exists (select 1 from jsonb_object_keys(p_decision) as keys(item_key) where item_key not in ('status', 'note')) then
    raise exception 'Image review decision has an invalid shape' using errcode = '22023';
  end if;

  next_status := (p_decision->>'status')::public.verification_status;
  note_value := nullif(btrim(p_decision->>'note'), '');
  if next_status not in ('approved', 'rejected') or (note_value is not null and char_length(note_value) > 5000) then
    raise exception 'Image review decision is invalid' using errcode = '22023';
  end if;

  select * into image_value from public.product_images i where i.id = p_image_id for update;
  if not found then raise exception 'Unknown product image' using errcode = '22023'; end if;
  select * into rights_value from private.source_rights_reviews r where r.source_id = image_value.source_id;

  if next_status = 'approved' then
    if rights_value.source_id is null or rights_value.image_rights_status <> 'approved'
      or rights_value.terms_checked_at is null or rights_value.license_id is null or rights_value.terms_url is null then
      raise exception 'Current image-source rights approval is required' using errcode = '42501';
    end if;
    next_license_status := 'approved';
    image_hash := md5(concat_ws(E'\n', coalesce(image_value.storage_path, ''), coalesce(image_value.source_url, ''),
      image_value.source_id::text, image_value.alt_text, coalesce(image_value.attribution, ''), coalesce(image_value.photographer, '')));
    update public.product_images
      set image_license_status = next_license_status, review_status = next_status, raw_image_hash = image_hash
      where id = p_image_id;
  else
    next_license_status := 'blocked';
    update public.product_images
      set image_license_status = next_license_status, review_status = next_status, raw_image_hash = null
      where id = p_image_id;
  end if;

  insert into private.product_image_review_events
    (product_image_id, review_status, image_license_status, reviewer_user_id, note)
  values (p_image_id, next_status, next_license_status, actor_id, note_value);

  return jsonb_build_object('productImageId', p_image_id, 'reviewStatus', next_status, 'reviewedBy', actor_id, 'reviewedAt', now());
end;
$$;
revoke all on function public.review_product_image(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.review_product_image(uuid, jsonb) to authenticated;

alter function private.upsert_catalog_import_record(uuid) rename to upsert_catalog_import_record_legacy;
revoke all on function private.upsert_catalog_import_record_legacy(uuid) from public, anon, authenticated;

create function private.upsert_catalog_import_record(target_import_record_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  outcome jsonb;
  staged private.import_records%rowtype;
  product_id_value uuid;
  image_value jsonb;
  image_source_value jsonb;
  image_source_id uuid;
  image_source_name text;
  image_source_type text;
  image_source_url text;
  image_source_attribution text;
  image_terms_url text;
  image_license_id text;
  image_url_value text;
  image_alt_text text;
  image_attribution text;
  note_value jsonb;
  note_author_type public.note_author_type;
  note_author_label text;
  note_nose text;
  note_palate text;
  note_mouthfeel text;
  note_finish text;
  note_overall text;
  note_language text;
  note_tasted_at date;
  note_hash text;
  existing_mouthfeel text;
begin
  outcome := private.upsert_catalog_import_record_legacy(target_import_record_id);
  select * into staged from private.import_records r where r.id = target_import_record_id;
  if not found then raise exception 'Unknown staged import record' using errcode = '22023'; end if;
  product_id_value := staged.applied_product_id;
  if product_id_value is null then return outcome; end if;

  image_value := staged.normalized_record #> '{product,image}';
  if image_value is not null and image_value <> 'null'::jsonb then
    if jsonb_typeof(image_value) <> 'object'
      or exists (select 1 from jsonb_object_keys(image_value) as keys(item_key)
        where item_key not in ('url', 'altText', 'attribution', 'source')) then
      raise exception 'Product image candidate has an invalid shape' using errcode = '22023';
    end if;
    image_source_value := image_value->'source';
    if jsonb_typeof(image_source_value) <> 'object'
      or exists (select 1 from jsonb_object_keys(image_source_value) as keys(item_key)
        where item_key not in ('name', 'type', 'url', 'termsUrl', 'licenseId', 'attribution')) then
      raise exception 'Product image source has an invalid shape' using errcode = '22023';
    end if;

    image_url_value := btrim(image_value->>'url');
    image_alt_text := btrim(image_value->>'altText');
    image_attribution := nullif(btrim(image_value->>'attribution'), '');
    image_source_url := btrim(image_source_value->>'url');
    if image_url_value is null or char_length(image_url_value) > 2048
      or image_url_value !~ '^https://[^/@[:space:]]+(/[^[:space:]#]*)?(\?[^[:space:]#]*)?$'
      or image_alt_text is null or char_length(image_alt_text) not between 1 and 500
      or (image_attribution is not null and char_length(image_attribution) > 1000)
      or image_source_url is null
      or image_source_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]?#]*)?$' then
      raise exception 'Product image URL or descriptive text is invalid' using errcode = '22023';
    end if;

    select s.id, s.source_name, s.source_type::text, s.canonical_url, s.attribution_text,
      r.terms_url, r.license_id
    into image_source_id, image_source_name, image_source_type, image_source_url, image_source_attribution,
      image_terms_url, image_license_id
    from public.sources s
    join private.source_rights_reviews r on r.source_id = s.id
    where s.canonical_url = image_source_url;
    if not found or image_source_id is null then
      raise exception 'Product image source must be separately registered' using errcode = '42501';
    end if;
    if image_source_value->>'name' is distinct from image_source_name
      or image_source_value->>'type' is distinct from image_source_type
      or image_source_value->>'url' is distinct from image_source_url
      or image_source_value->>'termsUrl' is distinct from image_terms_url
      or image_source_value->>'licenseId' is distinct from image_license_id
      or image_source_value->>'attribution' is distinct from image_source_attribution then
      raise exception 'Product image source metadata differs from the registered source' using errcode = '22023';
    end if;

    insert into public.product_images (product_id, source_url, source_id, alt_text, attribution)
    values (product_id_value, image_url_value, image_source_id, image_alt_text, image_attribution)
    on conflict (product_id, source_id, source_url) where source_url is not null do nothing;
  end if;

  note_value := staged.normalized_record->'tastingNotes';
  if note_value is not null and note_value <> 'null'::jsonb then
    note_mouthfeel := nullif(btrim(note_value->>'mouthfeel'), '');
    if note_mouthfeel is not null then
      if char_length(note_mouthfeel) > 5000 then raise exception 'Tasting mouthfeel is too long' using errcode = '22023'; end if;
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

      select n.mouthfeel_text into existing_mouthfeel from public.tasting_notes n
      where n.product_id = product_id_value and n.source_id = staged.source_id and n.raw_content_hash = note_hash
      for update;
      if found and existing_mouthfeel is not null and existing_mouthfeel is distinct from note_mouthfeel then
        raise exception 'Imported tasting mouthfeel conflicts with an existing note' using errcode = '23505';
      end if;
      update public.tasting_notes n
      set mouthfeel_text = note_mouthfeel, mouthfeel_hash = md5(note_mouthfeel)
      where n.product_id = product_id_value and n.source_id = staged.source_id and n.raw_content_hash = note_hash
        and n.author_type = note_author_type and n.author_label is not distinct from note_author_label
        and n.nose_text is not distinct from note_nose and n.palate_text is not distinct from note_palate
        and n.finish_text is not distinct from note_finish and n.overall_text is not distinct from note_overall
        and n.tasted_at is not distinct from note_tasted_at and n.language = note_language;
    end if;
  end if;

  return outcome;
end;
$$;
revoke all on function private.upsert_catalog_import_record(uuid) from public, anon, authenticated;
