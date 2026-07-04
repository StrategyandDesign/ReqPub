-- ============================================================================
-- fix-approver-assignment.sql  (idempotent)
--
-- In-app approval routing. An approver slot can be assigned to a real team
-- member; that member then sees a "waiting on you" flag inside the app and can
-- approve their OWN slot. No email is sent. Free-text approver names still work
-- exactly as before (a manual sign-off with no assignee). Safe to run more than
-- once; changes nothing for existing rows (approver_user_id defaults null).
--
-- Run this once in the Supabase SQL editor. No data is modified.
-- ============================================================================

-- 1) The assignment column. Null = a manual, free-text approver (today's behavior).
alter table version_approvals add column if not exists approver_user_id uuid;
create index if not exists va_user on version_approvals(approver_user_id);

-- 2) Decisions: a manager may decide any slot; the ASSIGNED team member may
--    decide their own. Everyone else is refused. Provenance is unchanged: the
--    trigger still stamps decided_by/decided_at from auth.uid(), so a sign-off
--    is always attributed to whoever actually made it.
create or replace function approval_decide(p_approval uuid, p_status text, p_comment text default '')
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ver versions%rowtype; v_uid uuid; v_self boolean;
begin
  select v.* into v_ver
    from versions v join version_approvals a on a.version_id = v.id
   where a.id = p_approval;
  if v_ver.id is null then return false; end if;
  select approver_user_id into v_uid from version_approvals where id = p_approval;
  v_self := v_uid is not null and v_uid = auth.uid();
  if not (is_project_manager(v_ver.project_id)
          or (v_self and is_project_member(v_ver.project_id))) then
    return false;
  end if;
  if p_status not in ('pending','approved','changes_requested') then return false; end if;
  update version_approvals
     set status = p_status, comment = coalesce(p_comment, ''),
         decided_by = auth.uid(),
         decided_at = case when p_status = 'pending' then null else now() end
   where id = p_approval;
  perform log_activity(project_org(v_ver.project_id), v_ver.project_id, 'approval.' || p_status,
    'approval', p_approval::text, 'v' || v_ver.label || ' approval ' || p_status, '{}'::jsonb);
  return true;
end; $$;
grant execute on function approval_decide(uuid, text, text) to authenticated;

-- 3) The "waiting on you" feed: every pending slot assigned to the caller on a
--    version that is currently in review. Drives the dashboard flag.
create or replace function my_open_approvals()
returns table(approval_id uuid, project_id text, project_name text,
              version_id uuid, version_label text, version_seq int, approver_role text)
language sql security definer set search_path = public as $$
  select a.id, v.project_id, p.name, v.id, v.label, v.seq, a.approver_role
    from version_approvals a
    join versions v on v.id = a.version_id
    join projects p on p.id = v.project_id
   where a.approver_user_id = auth.uid()
     and a.status = 'pending'
     and v.status = 'in_review'
   order by v.seq desc;
$$;
grant execute on function my_open_approvals() to authenticated;

-- 4) Team roster with display names, for the "assign to" picker. Restricted to
--    members of the org (the caller must be one).
create or replace function org_members_named(p_org uuid)
returns table(user_id uuid, email text, display_name text)
language sql security definer set search_path = public as $$
  select m.user_id, m.email, coalesce(up.display_name, '')
    from org_members m
    left join user_profiles up on up.user_id = m.user_id
   where m.org_id = p_org
     and exists(select 1 from org_members me where me.org_id = p_org and me.user_id = auth.uid());
$$;
grant execute on function org_members_named(uuid) to authenticated;

notify pgrst, 'reload schema';
