-- Expose only separately approved image references and add manufacturer mouthfeel notes.
-- Existing notes keep their original content hashes; a second hash format includes mouthfeel.

alter table public.tasting_notes
  add column if not exists mouthfeel_text text
    check (mouthfeel_text is null or char_length(mouthfeel_text) <= 5000);

alter table public.tasting_notes
  drop constraint if exists tasting_notes_check;

alter table public.tasting_notes
  add constraint tasting_notes_content_present check (
    nose_text is not null or palate_text is not null or mouthfeel_text is not null
    or finish_text is not null or overall_text is not null
  );

create or replace function private.enforce_tasting_note_rights()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  legacy_hash text;
  mouthfeel_hash text;
begin
  legacy_hash := md5(concat_ws(E'\n',
    coalesce(new.author_label, ''), new.author_type::text, coalesce(new.nose_text, ''),
    coalesce(new.palate_text, ''), coalesce(new.finish_text, ''), coalesce(new.overall_text, ''),
    new.source_id::text, coalesce(new.tasted_at::text, ''), new.language
  ));
  mouthfeel_hash := md5(concat_ws(E'\n',
    coalesce(new.author_label, ''), new.author_type::text, coalesce(new.nose_text, ''),
    coalesce(new.palate_text, ''), coalesce(new.mouthfeel_text, ''), coalesce(new.finish_text, ''),
    coalesce(new.overall_text, ''), new.source_id::text, coalesce(new.tasted_at::text, ''), new.language
  ));

  if new.review_status = 'approved' and (
    new.text_license_status <> 'approved'
    or not private.source_is_approved(new.source_id, 'text')
    or (
      new.raw_content_hash is distinct from mouthfeel_hash
      and (new.mouthfeel_text is not null or new.raw_content_hash is distinct from legacy_hash)
    )
  ) then
    raise exception 'Approved tasting notes require a current text hash and separately approved text rights';
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
      raw_content_hash = md5(concat_ws(E'\n',
        coalesce(author_label, ''), author_type::text, coalesce(nose_text, ''),
        coalesce(palate_text, ''), coalesce(mouthfeel_text, ''), coalesce(finish_text, ''),
        coalesce(overall_text, ''), source_id::text, coalesce(tasted_at::text, ''), language
      ))
      or (
        mouthfeel_text is null
        and raw_content_hash = md5(concat_ws(E'\n',
          coalesce(author_label, ''), author_type::text, coalesce(nose_text, ''),
          coalesce(palate_text, ''), coalesce(finish_text, ''), coalesce(overall_text, ''),
          source_id::text, coalesce(tasted_at::text, ''), language
        ))
      )
    )
    and private.source_is_approved(source_id, 'text')
    and private.product_has_public_evidence(product_id)
  );

alter table public.product_images
  add constraint product_images_source_url_https
  check (source_url is null or source_url ~ '^https://[^[:space:]]+$');

grant select (mouthfeel_text) on public.tasting_notes to anon, authenticated;
grant select (source_url) on public.product_images to anon, authenticated;

comment on column public.product_images.source_url is
  'HTTPS URL of the exact product packshot; public reads remain governed by image rights and publication RLS.';
comment on column public.tasting_notes.mouthfeel_text is
  'Separately sourced manufacturer, expert, or editorial mouthfeel description; never inferred from other sensory notes.';
