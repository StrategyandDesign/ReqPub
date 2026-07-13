# Deploying ReqPub for consulting engagements

Operational doctrine that is not enforceable in code, written down so it is
enforced by deployment. Everything here was verified against the schema; the
one external fact is cited inline.

## The workspace is the confidentiality wall

Internal roles are workspace-wide by construction: `is_project_member`
resolves to org membership, so a Manager or Viewer reads every project in the
workspace. External access is per-project by construction: client contacts
route through `partner_access`, SMEs through per-link tokens.

The deployment rule that follows: **one workspace per client account, never
one workspace spanning multiple clients.** Consulting firms run conflict walls
between clients; a Viewer who can read everything in a multi-client workspace
fails the first security review. A consultant overseeing engagements at three
clients belongs to three workspaces and uses the workspace switcher. A
cross-workspace rollup is deliberately not built; if a senior stakeholder asks
for one, it is a new server-side surface, not a client-side aggregation.

## Who gets which surface

Nobody in a standard engagement structure needs a surface that does not
already exist.

| Persona | Surface | Scope | Writes |
|---|---|---|---|
| Engagement manager (day-to-day owner) | Internal app, Manager role | Workspace-wide | Everything |
| Analysts and associates | Internal app, Manager role | Workspace-wide | Worksheet, discovery, inbox |
| Senior oversight (part-time) | Internal app, Viewer role | Workspace-wide, read + reply | None |
| Client project lead / PMO liaison | Client portal | Assigned projects only | Notes, threads, attachments |
| Client workstream SMEs | Tokened links, no account | Per link | Submissions, replies |
| Client sponsor / steering committee | Present link + client baseline report | Per artifact | None |
| Procurement / security reviewer | SECURITY.md and docs/ | None | None |

The sponsor needs no account: approval slots support manual sign-off
(`approver_user_id` null), the engagement manager records the decision for the
named person, and the provenance trigger stamps who recorded it, server-side.
Self-serve executive sign-off is the e-signature phase.

## Naming

The schema role is `partner` (tables, RPCs, and tests keep that name
permanently). The user interface says **Client contact** and **Client
portal**, because the buyer's firm reserves "Partner" for its owners, and
"give the client a Partner login" is a sentence that misfires in the room.
Copy only; no identifier changed.

## Operating rules

1. **Every version gets named approvers before it goes to review.** The state
   machine blocks Approved while a sign-off is pending, but a version with
   zero slots passes the gate - one manager, alone, no names on the cover.
   The record-health panel and the workspace gaps pill flag any version in
   review with no named approvers (gap) and any approved version with no named
   sign-off (warn). This is the control that lets analysts hold write access
   without a new permission tier. A true Editor role that writes but cannot
   approve is a schema change; it stays deferred until a firm demands it.
2. **One project per requirements record.** Archive superseded projects
   rather than repurposing them; the audit trail is per-project.

## The lane next to the program tracker

Large consulting firms already run collaborative work-management platforms
across engagements (Kearney, for example, is a founding partner of Sensei
Labs' Conductor and deploys it with clients for milestones, dashboards,
stage gates, and benefits tracking). ReqPub does not compete for that lane
and must not grow program-status surfaces. The tracker tells a program
manager where the program is. ReqPub proves what was agreed, by whom, in
which version, with what changes since the client last saw it. Complementary
layers: the initiative lives in the tracker; the requirements record that
initiatives are judged against lives here, immutable and fingerprinted.
