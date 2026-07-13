-- ============================================================================
-- ReqPub - discovery promotion back-link · v2.19.0
-- ============================================================================
-- Run ONCE in the Supabase SQL editor (idempotent; safe to re-run). Adds the
-- promotion back-link to discovery entries, mirroring comms.promoted_to:
-- '' | 'FR-012' | 'DEC-003' - the numbered artifact the entry became. With it,
-- the relay loop closes on the record: an SME reply or workshop takeaway is
-- promoted in one click into a numbered requirement or decision, the entry
-- shows what it became, and the next version note attributes the addition to
-- its source. Writes stay under the existing manager-only RLS policy on
-- discovery_entries; no new grant, no new policy, no new function.
-- ============================================================================

alter table discovery_entries add column if not exists promoted_to text not null default '';
