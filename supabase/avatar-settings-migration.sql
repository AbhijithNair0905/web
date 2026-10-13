-- Run once in the existing Supabase project SQL editor before deploying the Avatar studio.
-- Preserves drafts, published content, access policies, media and revision locking.
begin;
create or replace function public.publish_portfolio_draft(p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare current_row public.portfolio_drafts; collection text; visible jsonb; avatar jsonb; output jsonb := '{"version":1}'::jsonb;
begin
  if not public.is_portfolio_admin() then raise exception 'Owner access required' using errcode = '42501'; end if;
  select * into current_row from public.portfolio_drafts where id = 1 for update;
  if p_expected_revision is null or current_row.revision <> p_expected_revision then raise exception 'Draft changed in another window. Reload before publishing.' using errcode = '40001'; end if;
  avatar := coalesce(current_row.document->'avatar', '{"mode":"expressions","message":"","speed":"normal","expression":"neutral"}'::jsonb);
  if jsonb_typeof(avatar) <> 'object'
    or coalesce(avatar->>'mode','') not in ('expressions','message','alternate')
    or coalesce(avatar->>'expression','') not in ('neutral','thinking','giggling','blushing','smiling')
    or coalesce(avatar->>'speed','') not in ('slow','normal')
    or coalesce(jsonb_typeof(avatar->'message'),'') <> 'string'
    or length(avatar->>'message') > 160
    or (avatar->>'mode' <> 'expressions' and length(btrim(avatar->>'message')) = 0)
  then raise exception 'Invalid avatar settings. Save a valid message and display mode before publishing.' using errcode = '22023'; end if;
  output := output || jsonb_build_object('avatar', jsonb_build_object(
    'mode', avatar->>'mode', 'message', avatar->>'message',
    'speed', avatar->>'speed', 'expression', avatar->>'expression'));
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

-- Publishing clients check this before uploading media to avoid losing avatar settings.
create or replace function public.portfolio_avatar_ready() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_portfolio_admin();
$$;
revoke all on function public.portfolio_avatar_ready() from public, anon;
grant execute on function public.portfolio_avatar_ready() to authenticated;


commit;
