-- ============================================================================
-- ReqPub — attachments (files from partners & SMEs) · v2.10.0
-- ============================================================================
-- Run ONCE in the Supabase SQL editor (idempotent; changes no existing data).
-- Then also run storage-attachments.sql, and deploy the attachment-upload edge
-- function. See docs/ATTACHMENTS.md for the full 3-step setup.
--
-- This file adds the attachments metadata table + the validated insert path and
-- the authorization resolvers the upload edge function calls.
-- ============================================================================

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  comm_id uuid references comms(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  uploader_kind text not null check (uploader_kind in ('team','partner','sme')),
  uploader_name text not null default '',
  uploader_user uuid,
  file_name text not null,
  mime text not null default '',
  size_bytes bigint not null default 0,
  storage_path text not null unique,
  scan_status text not null default 'unscanned' check (scan_status in ('clean','unscanned','infected','error')),
  scan_detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists attachments_proj on attachments(project_id, created_at desc);
create index if not exists attachments_comm on attachments(comm_id, created_at);
alter table attachments enable row level security;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'attachments_caps') then
    alter table attachments add constraint attachments_caps
      check (size_bytes >= 0 and size_bytes <= 26214400
             and length(file_name) <= 300 and length(storage_path) <= 600) not valid;
  end if;
end $$;

drop policy if exists attach_member_read on attachments;
create policy attach_member_read on attachments for select using (is_org_member(org_id));
drop policy if exists attach_manager_delete on attachments;
create policy attach_manager_delete on attachments for delete using (is_org_manager(org_id));
grant select, delete on attachments to authenticated;
do $$ begin
  if exists (select 1 from pg_proc where proname = 'broadcast_project_change') then
    drop trigger if exists attachments_bcast on attachments;
    create trigger attachments_bcast after insert or update or delete on attachments
      for each row execute function broadcast_project_change();
  end if;
end $$;

create or replace function attachment_add(
  p_project text, p_comm uuid, p_message uuid,
  p_uploader_kind text, p_uploader_name text, p_uploader_user uuid,
  p_file_name text, p_mime text, p_size bigint, p_path text,
  p_scan_status text, p_scan_detail text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_id uuid;
  v_allow text[] := array[
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv','text/markdown',
    'image/png','image/jpeg','image/gif','image/webp','image/heic','application/zip'];
begin
  v_org := project_org(p_project);
  if v_org is null then return jsonb_build_object('ok', false, 'error', 'unknown_project'); end if;
  if p_uploader_kind is null or p_uploader_kind not in ('team','partner','sme') then
    return jsonb_build_object('ok', false, 'error', 'bad_uploader'); end if;
  if coalesce(p_size, 0) <= 0 or p_size > 26214400 then
    return jsonb_build_object('ok', false, 'error', 'bad_size'); end if;
  if p_mime is null or not (p_mime = any(v_allow)) then
    return jsonb_build_object('ok', false, 'error', 'type_not_allowed'); end if;
  if p_scan_status = 'infected' then
    return jsonb_build_object('ok', false, 'error', 'infected'); end if;
  if p_scan_status is null or not (p_scan_status = any(array['clean','unscanned','error'])) then
    return jsonb_build_object('ok', false, 'error', 'bad_scan_status'); end if;
  if p_comm is not null and not exists (select 1 from comms c where c.id = p_comm and c.project_id = p_project) then
    return jsonb_build_object('ok', false, 'error', 'bad_thread'); end if;
  perform pg_advisory_xact_lock(hashtextextended('attach/' || p_project, 13));
  if (select count(*) from attachments a
        where a.project_id = p_project and a.created_at > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  insert into attachments(org_id, project_id, comm_id, message_id, uploader_kind, uploader_name,
                          uploader_user, file_name, mime, size_bytes, storage_path, scan_status, scan_detail)
  values (v_org, p_project, p_comm, p_message, p_uploader_kind,
          left(coalesce(p_uploader_name, ''), 200), p_uploader_user,
          left(p_file_name, 300), left(coalesce(p_mime, ''), 120), p_size, p_path,
          coalesce(p_scan_status, 'unscanned'), left(coalesce(p_scan_detail, ''), 500))
  returning id into v_id;

  if p_comm is not null then
    update comms set updated_at = now(), status = case when status = 'closed' then 'new' else status end where id = p_comm;
  end if;
  perform log_activity(v_org, p_project, 'attachment.added', 'attachment', v_id::text,
    coalesce(nullif(p_uploader_name, ''), 'Someone') || ' attached ' || left(p_file_name, 120),
    jsonb_build_object('mime', p_mime, 'size', p_size, 'scan', p_scan_status, 'by', p_uploader_kind));
  return jsonb_build_object('ok', true, 'id', v_id);
end; $$;
revoke execute on function attachment_add(text, uuid, uuid, text, text, uuid, text, text, bigint, text, text, text) from public;
do $$ begin
  execute 'grant execute on function attachment_add(text, uuid, uuid, text, text, uuid, text, text, bigint, text, text, text) to service_role';
exception when undefined_object then null; end $$;

create or replace function attachment_uploader(p_comm uuid, p_user uuid)
returns jsonb language sql security definer stable set search_path = public as $$
  select case
    when c.id is null then jsonb_build_object('ok', false, 'error', 'bad_thread')
    when exists (select 1 from org_members m where m.org_id = c.org_id and m.user_id = p_user)
      then jsonb_build_object('ok', true, 'kind', 'team', 'org_id', c.org_id, 'project_id', c.project_id,
             'name', coalesce((select display_name from user_profiles up where up.user_id = p_user), 'Team'))
    when exists (select 1 from partners pt join partner_access pa on pa.partner_id = pt.id
                 where pt.user_id = p_user and pa.project_id = c.project_id)
      then jsonb_build_object('ok', true, 'kind', 'partner', 'org_id', c.org_id, 'project_id', c.project_id,
             'name', coalesce((select name from partners where user_id = p_user and org_id = c.org_id limit 1), 'Partner'))
    else jsonb_build_object('ok', false, 'error', 'forbidden')
  end
  from (select 1) one left join comms c on c.id = p_comm;
$$;
create or replace function attachment_sme_target(p_reply_token text)
returns jsonb language sql security definer stable set search_path = public as $$
  select case when c.id is null then jsonb_build_object('ok', false, 'error', 'invalid_link')
    else jsonb_build_object('ok', true, 'org_id', c.org_id, 'project_id', c.project_id,
           'comm_id', c.id, 'name', coalesce(nullif(c.author_name, ''), 'Reviewer')) end
  from (select 1) one left join comms c on c.reply_token = p_reply_token and c.origin = 'sme';
$$;
do $$ begin
  execute 'grant execute on function attachment_uploader(uuid, uuid) to service_role';
  execute 'grant execute on function attachment_sme_target(text) to service_role';
exception when undefined_object then null; end $$;
