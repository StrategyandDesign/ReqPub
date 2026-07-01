# ReqPub — Platform Audit & Design Direction

A whole-platform review against four goals you set: **role-efficient engagement, organized tracking of every communication, high retention, and clarity of expectations.** Opinionated and prioritized.

---

## 1. The one-sentence thesis

ReqPub is already a strong *document* tool. To win, it has to become the **system of record for the conversations that produce the document** — every requirement traceable back to the feedback, discovery, or note that created it, and every contributor's full history in one place. That single idea drives most of what follows.

---

## 2. The biggest structural problem: inbound is scattered

Right now, things people send you land in **three different places with three different vocabularies**:

| Surface | What lands there | Status words |
|---|---|---|
| Feedback | Pilot reports ("From the app") + PRD reviews ("From the brief") | New · Triaged · In progress · Resolved · Won't fix · Duplicate |
| Discovery | Logged conversations | Open · Decided · Parked |
| Notes & Input | Your notes + SME/partner submissions | Inbox · Kept · Archived |

A Manager has to check three tabs to know "what came in," and a new user can't predict where anything goes. **This is the #1 thing to fix for "track all communications in an organized fashion."**

**Move:** introduce one **Inbox / Activity** surface per project that aggregates *everything inbound* (pilot feedback, PRD reviews, SME notes, partner notes, logged conversations) into a single, filterable stream — filter by **source** (App / Reviewer / SME / Partner / Internal), by **person**, by **status**, by **version**. The existing tabs become saved filters on top of one data model, not three silos. Promotion paths (→ requirement, → discovery decision) stay, but from one place.

**And unify the status spine.** Three vocabularies for the same triage idea is cognitive tax. Collapse to one: **New → In review → Actioned → Closed** (with a sub-reason on close: Promoted / Resolved / Won't do / Duplicate). Keep "Promoted to FR-012" as the proud, visible outcome.

---

## 3. The retention engine you're missing: close the loop

Today an SME or partner submits input, sees a generic "Thank you," and then **silence forever.** They never learn whether it mattered, and the team can't reply. That kills external engagement and repeat participation.

Add a real two-way loop:

- **Contributor-visible status:** Received → Reviewed → Incorporated (or Declined, with a one-line reason). Show it when they reopen their link.
- **Team can reply to any submission** — a short thread per item, not just the one-way prompt you have now. The note-request "thread" you built is the right primitive; extend it to every inbound item.
- **Impact attribution:** when a note becomes FR-012, tell the contributor "Your input shaped FR-012." This is the single highest-leverage retention mechanic for SMEs and partners — people come back when they see their fingerprints on the outcome.

---

## 4. Audit by role (land → job → friction → fix)

### Manager (internal, write-all)
- **Job:** drive the doc, triage everything coming in, keep momentum across many PRDs.
- **Friction:** lands on a flat project list; no signal about *what needs them*. Inbound is split across tabs. No notion of "this SME hasn't responded in 6 days."
- **Fix — a Manager home / "Needs you" dashboard:** open items to triage (count + jump), requests awaiting response, versions awaiting approval, contributors who've gone quiet, and per-PRD health (last activity, open loops). This is the screen that makes a busy Manager efficient.

### Viewer (internal, read-only)
- **Job:** stay current, see everything, edit nothing.
- **Friction:** today read-only is *enforced by silently swallowing edits* — Viewers see editable-looking fields that don't save. That's confusing.
- **Fix:** give Viewers a purpose-built **read view** — the rendered document, the activity stream, versions/changes — with zero edit affordances, plus a "What changed since you last looked" digest. Make read-only feel intentional, not broken.

### Partner (external, assigned PRDs)
- **Job:** review the SME version of their PRDs across niches, send notes, stay engaged over time.
- **Friction:** portal shows assigned PRDs but no sense of *what's new* or *what's expected* (due dates, "2 PRDs need your review").
- **Fix:** a partner home with **expectations baked in** — per-PRD "new since last visit," due dates, and the running thread of their own contributions so they have continuity. Partners are your highest-value external relationship; their portal deserves the most polish.

### SME (external, link-only)
- **Job:** do one thing well — review/contribute on the single PRD they were sent.
- **Friction:** it's close to right. Gaps: no due date / expectation set, no acknowledgement beyond "thanks," no way to see prior exchange.
- **Fix:** keep it dead-simple, but add: a clear "what we're asking + by when," a persistent thread so a returning SME sees context, and the contributor-visible status from §3.

---

## 5. Two missing primitives that organize *everything*

1. **People / Contacts.** Communications are keyed on free-text names. There's no object that says "Dr. Jane, SME, in radiology — here's everything we sent her and everything she sent back." Add a lightweight **Contacts** view: per person, their requests, submissions, status, and last activity. This is literally what "track all communications in an organized fashion, by person" requires.

2. **Shares & Links manager.** Links are minted per version with no central registry. Add one place listing **every live link** (kind, PRD, version, who it went to, last activity, open/closed), with **revoke** and optional **expiry**. Right now links are fire-and-forget and unrevocable in practice; that's a trust and security gap as well as an organization gap.

---

## 6. Expectations & clarity (the cheap, high-impact layer)

- **Set expectations at send time.** Every outbound link should carry: what you want, why, and a due date. The recipient should never wonder "what am I supposed to do here?"
- **Set expectations at submit time.** After someone contributes: "Here's what happens next, here's who owns it." (Ties to §3.)
- **Role-aware onboarding + empty states.** Each role's first screen should teach the 3 things they can do, with a seeded example. Empty states should propose the next action, not just say "nothing here." Activation is the front door to retention.
- **Consistent, human status language** everywhere (from §2). One vocabulary, used identically across surfaces.
- **Notifications + unread.** Visibility of system status is the most-violated heuristic here. Add unread badges on tabs/inbox, a per-PRD activity timeline, and (cloud) **email alerts on new external submissions + a weekly "open items" digest per role.** Digests are the proven lever that pulls people back — they *are* the retention mechanism.

---

## 7. Prioritized backlog — Add / Refine / Remove

**P0 — do next (organization + retention core)**
- Unified **Inbox / Activity** stream per project (merges Feedback + Discovery + Notes inbound). *(Refine)*
- **One status spine** across all communications. *(Refine)*
- **Close-the-loop:** contributor-visible status + team reply thread on every submission. *(Add)*
- **Role homes:** Manager "Needs you," Viewer "What changed," Partner "Assigned + due." *(Add)*
- **Email notifications + unread badges** (new submission alerts; weekly digest). *(Add)*

**P1 — the organizing primitives**
- **Contacts/People** view (all comms per person). *(Add)*
- **Shares & Links manager** with revoke + expiry. *(Add)*
- **Due dates + reminders** on requests and review links; a "Waiting on" view. *(Add)*
- **Impact attribution** ("your note became FR-012"). *(Add)*
- **Clean Viewer read view** (no dead edit controls). *(Refine)*
- **Global search** across requirements and communications. *(Add)*

**P2 — polish & scale**
- Request **templates** (common SME/partner prompts). *(Add)*
- **Saved views / filters**; per-PRD health metrics. *(Add)*
- **Audit log** (who changed/published what) for trust. *(Add)*
- Manager **dashboard across all PRDs** (portfolio view). *(Add)*

**Remove / merge (reduce confusion)**
- Decide **Notes vs Discovery vs Feedback**: today they overlap (all capture inbound thoughts and promote to requirements). Either **merge into one pipeline with tags**, or sharply differentiate — *Notes = raw capture, Discovery = decisions of record, Feedback = external review* — and say so in the UI. Three look-alike surfaces is the biggest clarity tax after §2.
- **Retire the prototype gate** (access code `0099` / delete code `9988`) once real auth is live; replace the delete code with the standard typed-confirmation pattern.

---

## 8. Heuristic scorecard (where the UX stands today)

| Heuristic | Grade | Note |
|---|---|---|
| Visibility of system status | C | No unread/notifications/activity feed. Biggest gap. |
| Match to real world | B | Strong domain language; status vocab inconsistent. |
| User control & freedom | B+ | Good delete confirmation; needs link revoke + undo. |
| Consistency & standards | B− | Three status models; three inbound surfaces. |
| Recognition over recall | B | Add saved views, Contacts, search. |
| Aesthetic & minimal | A− | Clean, on-brand, well-restrained. |
| Help & onboarding | C+ | Thin empty states; no role onboarding. |
| Error prevention | B | Add expiry/revoke; confirm on destructive publish. |

---

## 9. If you do only three things

1. **Unify inbound into one Inbox with one status spine.** (Organization)
2. **Close the loop with contributors — visible status, replies, impact.** (Retention + relationships)
3. **Give every role a purpose-built home and email digests.** (Efficiency + return visits)

Everything else compounds on those three.
