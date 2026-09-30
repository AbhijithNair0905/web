-- Run once in your own Supabase project's SQL editor. No secret keys belong in the website.
create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.portfolio_drafts (
  id integer primary key check (id = 1), document jsonb not null,
  revision bigint not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_published (
  id integer primary key check (id = 1), document jsonb not null,
  revision bigint not null, published_at timestamptz not null default now()
);
create table if not exists public.portfolio_history (
  id bigint generated always as identity primary key, document jsonb not null,
  revision bigint not null, saved_at timestamptz not null default now()
);
alter table public.portfolio_admins enable row level security;
alter table public.portfolio_drafts enable row level security;
alter table public.portfolio_published enable row level security;
alter table public.portfolio_history enable row level security;
revoke all on public.portfolio_admins, public.portfolio_drafts, public.portfolio_published, public.portfolio_history from anon, authenticated;
grant select on public.portfolio_drafts, public.portfolio_history to authenticated;
grant select on public.portfolio_published to anon, authenticated;

create or replace function public.is_portfolio_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.portfolio_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;
drop policy if exists "Owner reads portfolio draft" on public.portfolio_drafts;
create policy "Owner reads portfolio draft" on public.portfolio_drafts for select to authenticated using (public.is_portfolio_admin());
drop policy if exists "Owner reads portfolio history" on public.portfolio_history;
create policy "Owner reads portfolio history" on public.portfolio_history for select to authenticated using (public.is_portfolio_admin());
drop policy if exists "Visitors read published portfolio" on public.portfolio_published;
create policy "Visitors read published portfolio" on public.portfolio_published for select to anon, authenticated using (true);

insert into public.portfolio_drafts (id, document) values (1, '{"version":1,"projects":[],"reels":[],"animations":[],"social":[],"logos":[]}') on conflict (id) do nothing;

create or replace function public.save_portfolio_draft(p_document jsonb, p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare current_row public.portfolio_drafts; collection text;
begin
  if not public.is_portfolio_admin() then raise exception 'Owner access required' using errcode = '42501'; end if;
  if jsonb_typeof(p_document) is distinct from 'object' or p_document->>'version' is distinct from '1' or octet_length(p_document::text) > 2097152 then raise exception 'Invalid content document'; end if;
  foreach collection in array array['projects','reels','animations','social','logos'] loop
    if jsonb_typeof(p_document->collection) is distinct from 'array' then raise exception 'Invalid collection'; end if;
    if jsonb_array_length(p_document->collection) > 250 then raise exception 'Too many items'; end if;
  end loop;
  select * into current_row from public.portfolio_drafts where id = 1 for update;
  if p_expected_revision is null or current_row.revision <> p_expected_revision then raise exception 'Draft changed in another window. Download your draft and reload before saving.' using errcode = '40001'; end if;
  insert into public.portfolio_history(document, revision) values (current_row.document, current_row.revision);
  update public.portfolio_drafts set document = p_document, revision = current_row.revision + 1, updated_at = now() where id = 1 returning * into current_row;
  return jsonb_build_object('document',current_row.document,'revision',current_row.revision);
end;
$$;
revoke all on function public.save_portfolio_draft(jsonb,bigint) from public, anon;
grant execute on function public.save_portfolio_draft(jsonb,bigint) to authenticated;

-- Only asset fields are rewritten. Other text remains untouched.
create or replace function public.portfolio_public_asset_fields(p_value jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare result jsonb; pair record; entry jsonb;
begin
  if jsonb_typeof(p_value) = 'object' then
    result := '{}'::jsonb;
    for pair in select * from jsonb_each(p_value) loop
      if pair.key in ('src','cover','poster') and jsonb_typeof(pair.value) = 'string' then
        result := result || jsonb_build_object(pair.key, replace(pair.value #>> '{}', '/storage/v1/object/authenticated/portfolio-library/', '/storage/v1/object/public/portfolio-media/'));
      else result := result || jsonb_build_object(pair.key, public.portfolio_public_asset_fields(pair.value)); end if;
    end loop;
    return result;
  elsif jsonb_typeof(p_value) = 'array' then
    result := '[]'::jsonb;
    for entry in select * from jsonb_array_elements(p_value) loop result := result || jsonb_build_array(public.portfolio_public_asset_fields(entry)); end loop;
    return result;
  end if;
  return p_value;
end;
$$;
revoke all on function public.portfolio_public_asset_fields(jsonb) from public, anon, authenticated;

create or replace function public.publish_portfolio_draft(p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare current_row public.portfolio_drafts; collection text; visible jsonb; output jsonb := '{"version":1}'::jsonb;
begin
  if not public.is_portfolio_admin() then raise exception 'Owner access required' using errcode = '42501'; end if;
  select * into current_row from public.portfolio_drafts where id = 1 for update;
  if p_expected_revision is null or current_row.revision <> p_expected_revision then raise exception 'Draft changed in another window. Reload before publishing.' using errcode = '40001'; end if;
  foreach collection in array array['projects','reels','animations','social','logos'] loop
    select coalesce(jsonb_agg(entry order by position), '[]'::jsonb) into visible from jsonb_array_elements(current_row.document->collection) with ordinality as items(entry,position) where entry->'enabled' = 'true'::jsonb;
    output := output || jsonb_build_object(collection, public.portfolio_public_asset_fields(visible));
  end loop;
  insert into public.portfolio_published(id,document,revision,published_at) values (1,output,current_row.revision,now())
    on conflict(id) do update set document = excluded.document, revision = excluded.revision, published_at = excluded.published_at;
  return jsonb_build_object('revision', current_row.revision, 'published_at', now());
end;
$$;
revoke all on function public.publish_portfolio_draft(bigint) from public, anon;
grant execute on function public.publish_portfolio_draft(bigint) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
 ('portfolio-library','portfolio-library',false,52428800,array['image/png','image/jpeg','image/webp','image/gif','image/avif','video/mp4','video/webm']),
 ('portfolio-media','portfolio-media',true,52428800,array['image/png','image/jpeg','image/webp','image/gif','image/avif','video/mp4','video/webm'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Owner reads portfolio media" on storage.objects;
create policy "Owner reads portfolio media" on storage.objects for select to authenticated using (bucket_id in ('portfolio-library','portfolio-media') and public.is_portfolio_admin());
drop policy if exists "Owner uploads portfolio media" on storage.objects;
create policy "Owner uploads portfolio media" on storage.objects for insert to authenticated with check (bucket_id in ('portfolio-library','portfolio-media') and public.is_portfolio_admin());
drop policy if exists "Owner updates portfolio media" on storage.objects;
create policy "Owner updates portfolio media" on storage.objects for update to authenticated using (bucket_id in ('portfolio-library','portfolio-media') and public.is_portfolio_admin()) with check (bucket_id in ('portfolio-library','portfolio-media') and public.is_portfolio_admin());

-- After creating your own user in Authentication, grant it access in the SQL editor:
-- insert into public.portfolio_admins(user_id) select id from auth.users where email = 'YOUR_EMAIL' on conflict do nothing;
-- Never let the website itself add users to portfolio_admins.
