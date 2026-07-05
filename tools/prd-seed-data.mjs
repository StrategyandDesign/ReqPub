/* ============================================================================
   Stress-test PRD content for the Collection Ventures workspace.
   Each PRD is expressed in the ReqPub answer shape (scalars + lists + rows),
   using the exact field_ids from app/js/domain.js. The generator
   (gen-prd-seed.mjs) turns these into supabase/seed-prds.sql, and the domain
   builders validate that each assembles into a real document.
   ============================================================================ */

/* ---- 1. Fathering Excellence Profile (distilled from the Fathers.com
        Platform Authority Document v1.1) ---- */
export const fathering = {
  id: 'prd-fathering-excellence',
  name: 'Fathering Excellence Profile',
  scalars: {
    ctrl_product: 'Fathering Excellence Profile',
    ctrl_org: 'Collection Ventures',
    ctrl_owner: 'Micah Canfield',
    ctrl_status: 'In Review',
    ov_purpose: 'This document is the authoritative requirements record for the Fathers.com continuing-education and community platform. It is written for the build team (PM, CTO, SWE leads) and the build agent, and it defines the vision, roles, experiences, architecture, data model, engagement mechanics, institutional deployment modes, and the phased build plan. Where this record is silent, the build escalates to the owner rather than inventing scope.',
    ov_vision: 'Make Fathers.com the number-one global platform where fathers assess where they stand, grow with proven material, lock arms with other men, and prove their progress in ways courts, employers, and their own families can trust. The founding belief, unchanged since 1990: when fathers grow, children flourish. North Star: Weekly Active Fathering Actions (WAFA), the count of fathers who log at least one intentional real-world fathering action in a given week. Business North Star: Verified Completions, the unit institutions pay for.',
    ov_problem: 'Fathers lack a trusted way to know where they stand and prove progress. Roughly one in four US children live without a father in the home. Generic parenting apps measure screen time, not fathering, and produce nothing a court, employer, or parole board will accept. The opportunity is a validated instrument plus a proof rail plus real-world brotherhood, three things AI cannot commoditize and men will actually pay for.',
    ov_market: 'About 34.3 million US men have a biological child under 18, within roughly 71 million North American fathers. The client segmentation places about 56 percent of fathers as growth-oriented and 44 percent as at-risk across five segments. Institutional buyers already fund fatherhood programming: corrections, courts, employers, and military and VA channels. The first deployment is free for a 100,000-subscriber onboarding wave, with monetization following immediately.',
    context: 'Mobile-first installable PWA at 390-point width, one primary action per screen. Corrections mode must run fully offline for a class session and sync when connectivity returns. Institutional modes (employer, court, corrections, military) are configuration bundles over one platform, not separate apps. Assessment must never block on the network; the member is the only thing it waits on.',
    sol_solution: 'One platform with a single spine: a validated onboarding assessment (the Keystone Father Profile) that tells every man the truth, a deterministic plan engine that maps his lowest factors to exact modules, region-and-stage-matched Crews of 5 to 8 men with an accountability Anchor, cohort Expeditions that end in a verified completion, a weekly Rhythm of logged real-world actions, a verified-behavior rank ladder (Waypoints), and a signing-and-verification layer (ProofRail) whose records verify independently even if Fathers.com is offline.',
    staged: 'Yes',
    has_ai: 'Yes',
    golden: 'Voice mode is evaluated against a human-labeled set of colloquial answers mapped to the 1-to-5 scale, built during the pilot and stratified by dialect cohort. The knowledge agent is evaluated against a probe set of in-corpus and out-of-corpus questions; every generated response must cite a source module, and out-of-corpus probes must trigger honest deferral plus a content-gap ticket, never an improvised answer.',
    vulnerable: 'Yes',
    safeguard: 'A disclosure of self-harm, harm to others, or domestic violence routes to a trained human within one hour, pauses all gamification and nudges for that member, and surfaces professional resources in-product. The protocol is never punitive and never automated therapy (runbook RB-04, interaction IX-09). Minors are excluded from the platform in every role; child records are life-stage and birth-year band only.',
    consent: 'Research, comparison (self vs observer), and marketing consents are separate records, plain-language, opt-in, and revocable at any time. Research consent is separate from terms acceptance. The self-versus-observer comparison overlay renders only after both the father and the secondary participant accept an identical consent sheet; either revocation removes it immediately.',
    retention: 'Responses and scores are retained while the account lives. Self-serve export (JSON plus PDFs) and account deletion carry a 14-day cooldown; deletion cascades per the retention matrix, with certificates preserved as anonymized verification stubs so previously issued proofs still verify. Corrections records follow the facility agreement and applicable records law. The audit log is retained seven years.',
    residency: 'Primary data is stored and processed in the platform region on the managed Postgres backend. Cross-border processing for institutional channels is contracted per agreement. Voice audio is processed for transcription and discarded by default; transcripts store with the response record.',
    access: 'Row-level security defaults to deny. Members read their own rows; Crew and group visibility flow through membership joins. Assessment scores carry the strictest policy: readable by the member, the scoring service, and consented case access only, and are never visible to employers, courts, corrections officials, or military admins. Institutional roles read only aggregate views with a minimum cohort size of ten. Staff access is scoped by case and logged; production access is break-glass and reviewed monthly.',
    verify_note: 'A release is accepted when every Must requirement for the phase passes its fit criterion in production, the RLS default-deny suite passes, and the phase exit criteria in the build plan hold. ProofRail records must verify independently of Fathers.com systems (the Mars rule) with zero false-valids.',
    link_repo: 'to confirm',
    link_board: 'to confirm',
    link_design: 'to confirm'
  },
  lists: {
    ov_goals: [
      'Grow Weekly Active Fathering Actions (WAFA) week over week as the primary mission metric.',
      'Produce Verified Completions (assessments, Expeditions, courses) as the fundable business unit, reported weekly by channel.',
      'Onboard the 100,000-subscriber wave with assessment completion at or above 75 percent of starters.',
      'Reach Crew join at or above 40 percent of new completers and week-4 Rhythm at or above 45 percent.',
      'Sign at least one institutional channel (employer, court, corrections, or military) with real revenue.'
    ],
    sol_in: [
      'Instrument-agnostic assessment engine that loads the Keystone Father Profile as configuration and runs multi-session, resumable, autosaving intake.',
      'Deterministic personalization engine mapping factor bands and child life-stage to an ordered plan of three active items.',
      'Crews, Anchors, and leader-run groups with Crew-scoped and Anchor-scoped messaging only.',
      'Weekly Rhythm logging, cohort Expeditions, and a verified-behavior Waypoints rank ladder.',
      'ProofRail signing, timestamping, transparency log, and public certificate verification.',
      'Four institutional deployment modes: employer, court, corrections (offline-capable), and military.',
      'Eyes-free voice assessment (later phase) and a grounded knowledge agent behind the plan (later phase).'
    ],
    sol_out: [
      'No infinite-scroll feed; the home screen is a mission board.',
      'No minor accounts and no collection of children’s names, ever.',
      'No open direct messages between strangers; messaging is Crew and Anchor scoped.',
      'No daily platform-wide streak; the Rhythm is weekly, daily cadence only inside Expeditions.',
      'No therapy-speak, clinical claims, or diagnosis; the platform educates and connects, it does not treat.',
      'No dark patterns, no ads, no selling member data, no crypto or tokens.',
      'No chatbot as the front door and no native livestream infrastructure before leader demand proves it.'
    ],
    assume: [
      'The Keystone Father Profile is psychometrically validated and licensed for digital deployment with existing norms and rubrics (owner-confirmed; item count and observer-form rights confirmed at Phase 0 exit).',
      'The 100,000-subscriber onboarding wave exists and converts a meaningful fraction to accounts across the launch arc.',
      'Institutional buyers pay for verified completion and aggregate reporting, not for assessment scores.'
    ],
    depend: [
      'Managed Postgres backend (Supabase-class) with row-level security, realtime, storage, and edge functions.',
      'Managed video platform for on-demand modules and embedded third-party livestreams at launch.',
      'Payment processor with subscription billing, checkout, marketplace payouts, and tax.',
      'ProofRail verification service shared with the studio’s existing verification work.',
      'Instrument owner sign-off for any change to scoring, norms, or item structure.'
    ],
    constrain: [
      'One deployment, domain-modular; no microservices at this audience scale.',
      'The instrument is configuration; zero instrument logic in code.',
      'All working names ship behind config flags for owner rename without code change.',
      'WCAG 2.1 AA and Section 508 globally, because federal channels require it.',
      'Answer-save p95 under 300 ms; the UI never blocks on the network.'
    ]
  },
  rows: {
    ctrl_approvers: [
      { role: 'Owner', name: 'Micah Canfield' },
      { role: 'Product', name: 'Tim Harris' },
      { role: 'CTO / Architecture', name: 'Alon Arad' },
      { role: 'Engineering lead', name: 'Erik Companhone' }
    ],
    seg: [
      { segment: 'Growth-oriented fathers', share: '56%', desc: 'Want a precise next step after the Profile, not a content dump.' },
      { segment: 'At-risk fathers', share: '44%', desc: 'Span crisis-window, corrections, and reentry situations.' },
      { segment: 'Crisis-window fathers', share: 'High value', desc: 'Separation or custody proceedings; need a court-accepted course with proof, fast.' },
      { segment: 'Institutional cohorts', share: 'Funded', desc: 'Employer, court, corrections, and military buyers who pay for verified completion.' }
    ],
    persona: [
      { persona: 'The Busy Professional', needs: 'Multi-session, one-handed mobile, resumable; weekly not daily cadence.' },
      { persona: 'The Auditory Learner', needs: 'Voice assessment and audio-first modules for the commute.' },
      { persona: 'The Crisis-Window Father', needs: 'A court-recognized course with seat-time tracking and public certificate verification.' },
      { persona: 'The Incarcerated or Reentry Father', needs: 'Offline facility delivery, proof usable with parole and child support, and account continuity on release.' },
      { persona: 'The Veteran Father', needs: 'Peer credibility, trauma-informed pacing, no clinical framing, no autoplay of intense material.' },
      { persona: 'The Faith-Driven Group Leader', needs: 'Curriculum sequencing, attendance, and group progress without seeing member scores.' }
    ],
    release: [
      { rel: 'Phase 0 Foundation', obj: 'Repo, environments, schema and RLS, auth, event pipeline, design system, instrument loader, ProofRail skeleton.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase Spine', obj: 'Assess, results, plan, membership; onboard the 100K wave; WAFA dashboard live.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase Brotherhood', obj: 'Crews, Anchors, Rhythm, Expeditions, Waypoints, Campfire, crisis protocol, ProofRail issuance.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase Leaders & Commerce', obj: 'Leader consoles, store and events, court-track course and public verification.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase Institutions A', obj: 'Employer SSO/SCIM and aggregate dashboard; court coordinator portal; SOC 2 evidence begins.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase Institutions B', obj: 'Corrections offline mode and Reentry Bridge; military mode; outcome instrumentation for evaluation.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase Voice', obj: 'Eyes-free voice assessment with grounded clarification and a dialect evaluation harness.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase Guide', obj: 'Grounded knowledge agent behind the plan with mandatory citations and gap tickets.', mvp: 'to confirm', ship: 'to confirm' }
    ],
    components: [
      { name: 'Assessment Engine', owner: 'Erik Companhone', status: 'Planned', desc: 'Instrument-agnostic, multi-session, resumable, idempotent write path.' },
      { name: 'Plan Engine', owner: 'Erik Companhone', status: 'Planned', desc: 'Deterministic factor-to-module mapping; three active items maximum.' },
      { name: 'Community', owner: 'Huy Tran', status: 'Planned', desc: 'Crews, Anchors, groups, threads, moderation, safeguarding.' },
      { name: 'Engagement', owner: 'Huy Tran', status: 'Planned', desc: 'Rhythm, Expeditions, Waypoints, notification discipline.' },
      { name: 'ProofRail', owner: 'Alon Arad', status: 'Planned', desc: 'Signing, RFC 3161 timestamps, transparency log, revocation, public verify.' },
      { name: 'Institutional Modes', owner: 'Andy Lan', status: 'Planned', desc: 'Employer, court, corrections (offline), military configuration bundles.' },
      { name: 'Voice Mode', owner: 'Erik Companhone', status: 'Planned', desc: 'Streaming STT, grounded intent, streaming TTS; tap parity always.' },
      { name: 'Knowledge Agent', owner: 'Erik Companhone', status: 'Planned', desc: 'Retrieval over the vetted corpus; cited generation; no unvetted claims.' }
    ],
    metrics: [
      { metric: 'Answer-save latency', target: 'p95 under 300 ms', method: 'Server-acknowledged timing on the responses write path.' },
      { metric: 'Assessment completion (starters)', target: 'at or above 75%', method: 'Completions divided by starts, per launch cohort.' },
      { metric: 'Crew join rate (new completers)', target: 'at or above 40%', method: 'Crew joins within 7 days of results.' },
      { metric: 'Week-4 Rhythm rate', target: 'at or above 45%', method: 'Members logging in week 4 of membership.' },
      { metric: 'Expedition cohort completion', target: 'at or above 55%', method: 'Completions per enrolled cohort.' },
      { metric: 'Voice semantic mapping accuracy', target: 'at or above 95%', method: 'Against a human-labeled set; below 92% blocks a dialect cohort.' },
      { metric: 'WAFA (North Star)', target: 'up and to the right, weekly', method: 'Distinct fathers logging one intentional action per week.' },
      { metric: 'Verified Completions (Business North Star)', target: 'weekly by channel', method: 'ProofRail-signed records issued.' }
    ],
    fr: [
      { stmt: 'The platform delivers the Keystone Father Profile as one item per screen on a uniform 1-to-5 scale, autosaving every answer and resuming on any device.', fit: 'A member completes the instrument across multiple sessions and devices with no lost answers; save p95 under 300 ms. Test and Demonstration.', pri: 'Must', comp: 'Assessment Engine' },
      { stmt: 'The engine loads an instrument as data (items, sections, dimensions, factors, scale anchors, scoring weights, norm tables, clarifications, observer variant) with no code change per instrument.', fit: 'A 100-item and a 138-item instrument both run from configuration. Inspection and Test.', pri: 'Must', comp: 'Assessment Engine' },
      { stmt: 'On completion the platform scores against the licensed rubric and renders results strengths-first, growth-areas-second, norm-referenced in plain words, never a grade, always ending in the member’s first three actions.', fit: 'Results match the licensed scoring exactly and always present a trail. Inspection and Test.', pri: 'Must', comp: 'Plan Engine' },
      { stmt: 'The plan engine maps the member’s lowest factors and children’s life-stages to an ordered plan of at most three active items (one module, one field action, one Crew or Expedition step).', fit: 'Every member sees exactly three active items derived from mapping tables; recommendation tap-through is measured. Test.', pri: 'Must', comp: 'Plan Engine' },
      { stmt: 'The platform forms Crews of 5 to 8 men matched on child life-stage, region, and situation tags, with an Anchor pairing and a merge offer when a Crew falls below four active men after six weeks.', fit: 'New completers are offered a matched Crew; small Crews trigger a merge. Test and Demonstration.', pri: 'Must', comp: 'Community' },
      { stmt: 'Messaging is Crew-scoped and Anchor-scoped only; leaders broadcast and hold public sessions but cannot direct-message members.', fit: 'No path exists for a leader-to-member DM or a stranger DM. Inspection and Test.', pri: 'Must', comp: 'Community' },
      { stmt: 'The Rhythm records one intentional fathering action per week with optional note, with milestone celebrations at 4, 12, 26, and 52 weeks and a protection pass earned per completed Expedition.', fit: 'One log per week counts; no daily platform streak exists; milestones fire only at the four marks. Test.', pri: 'Must', comp: 'Engagement' },
      { stmt: 'Expeditions run fixed-length cohorts with daily check-ins and Crew visibility, and issue a ProofRail-signed completion record on finish.', fit: 'A completed Expedition produces a verifiable record. Test and Demonstration.', pri: 'Must', comp: 'Engagement' },
      { stmt: 'Waypoints advance rank on verified behavior only (profile complete, first Expedition, sustained Rhythm plus Crew service, capstone), never on purchases.', fit: 'No purchase advances rank; every rank maps to verifiable behaviors. Inspection.', pri: 'Must', comp: 'Engagement' },
      { stmt: 'ProofRail signs each completion record with a hash, RFC 3161 timestamp, course and version, and requirement attestations, appends it to a transparency log, and verifies publicly without a Fathers.com account.', fit: 'A third party verifies a certificate while the platform is offline; revocation is checked on every verify; zero false-valids. Test.', pri: 'Must', comp: 'ProofRail' },
      { stmt: 'Institutional reporting exposes completion, attendance, and certificate validity only, always aggregated with a minimum cohort size of ten; assessment scores are never visible to any institution.', fit: 'No employer, court, corrections, or military view returns an individual score or a sub-ten cohort. Inspection and Test.', pri: 'Must', comp: 'Institutional Modes' },
      { stmt: 'Corrections mode runs a full class session offline, captures attendance and module completion, and syncs verified completions when connectivity returns.', fit: 'A facilitator runs a session with no connectivity and syncs later with no data loss. Demonstration and Test.', pri: 'Must', comp: 'Institutional Modes' },
      { stmt: 'A crisis disclosure in free text routes to a trained human within one hour, pauses all gamification and nudges for that member, and surfaces professional resources, never punitively and never as automated therapy.', fit: 'A seeded disclosure triggers routing within one hour and a gamification pause. Test and Drill.', pri: 'Must', comp: 'Community' },
      { stmt: 'Voice mode delivers the assessment eyes-free with streaming speech, grounded clarification from the curated corpus only, and full tap parity with mid-item switching.', fit: 'End-of-speech to first audio under 1.5 s p90; semantic mapping at or above 95 percent; any member can switch to tap without loss. Test.', pri: 'Should', comp: 'Voice Mode' },
      { stmt: 'The knowledge agent answers only from the vetted corpus with mandatory citations, files a content-gap ticket when coverage is missing, and lives behind the plan rather than as a front-door chatbot.', fit: 'Zero uncited generative claims in the audit sample; out-of-corpus probes defer honestly. Test.', pri: 'Should', comp: 'Knowledge Agent' }
    ],
    nfr: [
      { stmt: 'The assessment write path sustains modeled launch peak (about 420 writes per second) without blocking the UI.', fit: 'A synthetic run at twice modeled peak (10,000 concurrent sessions) holds the save budget. Load test.', pri: 'Must', comp: 'Assessment Engine' },
      { stmt: 'The platform meets WCAG 2.1 AA and Section 508 globally, including keyboard paths, screen-reader labels on the 1-to-5 control, captions, and transcripts.', fit: 'An accessibility audit passes AA on every launch surface. Inspection and Test.', pri: 'Must', comp: 'Assessment Engine' },
      { stmt: 'Console roles require MFA; staff access is least-privilege with break-glass audit; secrets live in a managed vault.', fit: 'No console login without MFA; break-glass reads land in the audit log. Inspection and Test.', pri: 'Must', comp: 'Institutional Modes' },
      { stmt: 'Backup and disaster recovery meet RPO 1 hour and RTO 4 hours with a quarterly restore drill.', fit: 'A restore drill meets the objectives. Test.', pri: 'Must', comp: 'ProofRail' },
      { stmt: 'The assessment path holds 99.9 percent availability during the launch wave.', fit: 'Measured uptime on the assessment path meets the target. Test.', pri: 'Should', comp: 'Assessment Engine' }
    ],
    eval: [
      { dim: 'Voice semantic mapping', metric: 'Colloquial answer to 1-to-5 mapping accuracy against a human-labeled set, stratified by dialect', thresh: 'at or above 95%; below 92% blocks that cohort', comp: 'Voice Mode' },
      { dim: 'Voice grounding guardrail', metric: 'Share of clarification answers drawn only from the curated corpus; out-of-corpus deferral rate', thresh: '100% grounded; improvised interpretation is a hard fail', comp: 'Voice Mode' },
      { dim: 'Knowledge agent hallucination guardrail', metric: 'Uncited generative claims in the audit sample', thresh: 'zero uncited claims', comp: 'Knowledge Agent' },
      { dim: 'Knowledge agent gap handling', metric: 'Out-of-corpus probes that defer honestly and file a gap ticket', thresh: 'at or above 99%', comp: 'Knowledge Agent' }
    ],
    data_entities: [
      { entity: 'Users (father accounts)', sens: 'Personal, no sensitive-category fields' },
      { entity: 'Children records (life-stage and birth-year band only)', sens: 'Minimized; no minor PII' },
      { entity: 'Assessment responses and scores', sens: 'Personal and sensitive; strictest RLS' },
      { entity: 'Consents (research, comparison, marketing)', sens: 'Personal; separate revocable records' },
      { entity: 'Certificates and verification records', sens: 'Personal; public verify exposes initials and compliance only' },
      { entity: 'Crisis and moderation cases', sens: 'Sensitive; trained-human access only' }
    ],
    interfaces: [
      { iface: 'Identity (SSO)', req: 'SAML and OIDC with SCIM for employer seat provisioning', fit: 'Employer members claim seats via SSO; the aggregate wall applies from the first screen.', comp: 'Institutional Modes' },
      { iface: 'Payments', req: 'Subscription billing, course and store checkout, marketplace payouts, tax', fit: 'Membership, courses, store, and leader payouts transact through the processor.', comp: 'Community' },
      { iface: 'Media platform', req: 'On-demand module delivery and embedded third-party livestreams at launch', fit: 'The app never proxies video bytes. Inspection.', comp: 'Community' },
      { iface: 'ProofRail verification service', req: 'Signing, timestamping, transparency log, revocation, public verify endpoint', fit: 'Certificates verify independently of the platform. Test.', comp: 'ProofRail' },
      { iface: 'Court verification', req: 'Public code and QR verification returning course, seat-time compliance, and issue date only', fit: 'A coordinator verifies with no account and no member data beyond the certificate.', comp: 'Institutional Modes' }
    ],
    people: [
      { name: 'Micah Canfield', role: 'Owner; decision authority on instrument, pricing, naming, partners' },
      { name: 'Tim Harris', role: 'Product Manager; phase gatekeeper and scope discipline' },
      { name: 'Alon Arad', role: 'CTO; architecture, ProofRail, security posture' },
      { name: 'Erik Companhone', role: 'SWE lead; assessment engine, plan engine, consoles' },
      { name: 'Huy Tran', role: 'SWE; community, engagement, events, commerce' },
      { name: 'Andy Lan', role: 'SWE; data model, analytics spine, institutional modes' }
    ],
    glossary: [
      { term: 'WAFA', def: 'Weekly Active Fathering Actions; the mission North Star.' },
      { term: 'Verified Completion', def: 'A ProofRail-signed record of a completed assessment, Expedition, or course.' },
      { term: 'Crew', def: 'The 5-to-8-man small group; the retention unit.' },
      { term: 'Anchor', def: 'The paired accountability man inside a Crew.' },
      { term: 'Expedition', def: 'A fixed-length cohort challenge with daily actions.' },
      { term: 'The Rhythm', def: 'The weekly logged intentional fathering action.' },
      { term: 'Waypoints', def: 'The verified-behavior rank ladder.' },
      { term: 'ProofRail', def: 'The signing, timestamping, and verification service.' },
      { term: 'Mars rule', def: 'Proof must verify even if the platform is offline.' }
    ]
  }
};

/* ---- 2. ReqPub Platform (the platform the team is building on, described as
        a PRD: what is done, and the next phase: SOC 2 and e-signature) ---- */
export const reqpub = {
  id: 'prd-reqpub-platform',
  name: 'ReqPub Platform',
  scalars: {
    ctrl_product: 'ReqPub Platform',
    ctrl_org: 'Collection Ventures',
    ctrl_owner: 'Micah Canfield',
    ctrl_status: 'In Review',
    ov_purpose: 'This document is the working requirements record for ReqPub itself: the platform the team uses to turn discovery into a versioned, approved, testable requirements record. It states what has already shipped (so the team edits from reality) and what remains for the next phase (SOC 2 Type II and e-signature execution with cryptographic sealing). It is the record the team stress-tests the platform against.',
    ov_vision: 'The requirements record your client approves. ReqPub takes a project from discovery to an approved, testable baseline where every version is numbered, every approval is named, and every export carries its own history. When someone asks what was agreed, you open the record. The terminal promise is a sign-off that is cryptographically sealed to the exact baseline signed, so the document proves itself.',
    ov_problem: 'Projects fail at "that’s not what we agreed," not at the build. Requirements live in decks, documents, and email threads; reconstructing who approved what, when, and what changed since the client last saw it burns senior hours and goodwill. Teams need a single record that moves with the scope and defends itself under review.',
    ov_market: 'Advisory and product teams whose work is reviewed, contested, and approved: consulting engagement teams, agencies, and internal product groups working with external subject-matter experts and partners. The buyer answers to a client and to procurement; the record is the artifact both trust.',
    context: 'A static frontend (installable, no build step) on a managed Postgres backend with row-level security, realtime, and edge functions. Deployed on GitHub Pages against Supabase. Used live by internal teams (managers and viewers), external SMEs with no account (tokened links), and partners who manage SMEs (a portal). Multiplayer editing must survive nine or more concurrent editors without lost writes.',
    sol_solution: 'A relational requirements platform: every shared structure is rows, not a JSON blob, so concurrent adds cannot overwrite each other; every scalar field carries a revision so stale writes are detected and resolved rather than clobbered; version numbers are allocated server-side; approvals are a real state machine with named, server-stamped sign-off; sharing is section-scoped and brand-carrying; and every export carries its own history on the cover. The next phase seals that export cryptographically and executes sign-off by e-signature.',
    staged: 'Yes',
    has_ai: 'No',
    vulnerable: 'No',
    consent: 'External reviewers (SMEs) act through tokened links with no account; they see only the curated, section-scoped brief the team publishes, never fit criteria, schedules, or internal notes. Partners see only the published brief of projects granted to them. All external participation is on the record with names and timestamps.',
    retention: 'Every project, version, comment, and approval is retained for the life of the workspace. Versions are immutable baselines. The activity log is append-only and written by the database itself. Managers can archive a project; an administrator can restore it. Export to Word, PDF, and Markdown is available at any time.',
    residency: 'Data is stored and processed in the Supabase project region. The public anon key ships in the client by design; all protection rests on row-level security and the rev-checked RPCs.',
    access: 'Row-level security scopes every table to the organization. Managers write; viewers read everything and reply in threads; partners reach only assigned projects through the portal; SMEs reach only tokened briefs. Worksheet fields and rows are writable only through rev-checked SECURITY DEFINER RPCs; write is revoked from the audit-only tables. Approval provenance is stamped from the signed-in user and cannot be forged.',
    verify_note: 'A capability is accepted when it passes its fit criterion in production and is covered by the automated suite (33 unit tests, 79 backend checks on a real Postgres). The SOC 2 and e-signature requirements are accepted only when independently audited and, for e-signature, when a sealed export verifies against its exact baseline.',
    link_repo: 'github.com/StrategyandDesign/ReqPub',
    link_board: 'to confirm',
    link_design: 'reqpub.com'
  },
  lists: {
    ov_goals: [
      'Let a full team edit one requirements document at once with zero lost writes.',
      'Make every version numbered, every approval named, and every export self-documenting.',
      'Let external SMEs and partners review and approve from a link with no account.',
      'Reach SOC 2 Type II certification before the first enterprise contract renewal.',
      'Execute sign-off by e-signature, cryptographically sealed to the exact baseline signed.'
    ],
    sol_in: [
      'Relational requirements model with permanent requirement IDs and per-field revisions.',
      'Live multiplayer editing with presence, per-field conflict detection, and durable retried saves.',
      'Immutable, server-numbered version baselines with a change diff by requirement ID.',
      'A real approval state machine with named, server-stamped sign-off and a gate on Approved.',
      'Section-scoped, brand-carrying sharing: SME review links, partner portal, and read-only presentation links.',
      'A designed, co-branded PDF and Word export carrying version, status, approvals, and history.',
      'An append-only audit trail written by the database.'
    ],
    sol_out: [
      'No per-seat pricing model in the product; pricing is per project.',
      'No AI authoring of requirements; the platform structures human judgment, it does not replace it.',
      'No public claims of SOC 2 or e-signature until each ships and is verified.'
    ],
    assume: [
      'Supabase (Postgres, Auth, RLS, Realtime, Storage, Edge Functions) is the backend of record.',
      'The internal team is trusted staff; external parties are untrusted by default.',
      'Managed e-signature and timestamping services exist for the next phase rather than being built in-house.'
    ],
    depend: [
      'Supabase project with row-level security and the rev-checked RPC layer.',
      'GitHub Pages hosting for the static frontend.',
      'A managed e-signature provider and an RFC 3161 timestamp authority for the sealing phase.',
      'An independent auditor for the SOC 2 Type II examination.'
    ],
    constrain: [
      'Static frontend, no build step; ES modules and one CDN dependency only.',
      'Content Security Policy with no inline scripts.',
      'All racy writes flow through server-side rev-checked RPCs; no direct client writes to worksheet tables.',
      'Every change ships with regression tests; the suite stays green.'
    ]
  },
  rows: {
    ctrl_approvers: [
      { role: 'Owner', name: 'Micah Canfield' },
      { role: 'Engineering', name: 'to confirm' },
      { role: 'Security / Compliance', name: 'to confirm' }
    ],
    seg: [
      { segment: 'Internal engagement teams', share: 'Primary', desc: 'Author and own the requirements record; answer to a client.' },
      { segment: 'Subject-matter experts', share: 'External', desc: 'Review and approve from a link with no account.' },
      { segment: 'Partners', share: 'External', desc: 'Manage SMEs on the client side and relay requests through a portal.' }
    ],
    persona: [
      { persona: 'The engagement lead', needs: 'A record that answers with them: numbered baselines, named approvals, defensible change history.' },
      { persona: 'The subject-matter expert', needs: 'To weigh in once, on the record, from a link, without new software.' },
      { persona: 'The downstream builder', needs: 'Approved, testable requirements with fit criteria and permanent IDs.' },
      { persona: 'The procurement reviewer', needs: 'Isolated data, role-based access, an append-only audit log, and exportable records.' }
    ],
    release: [
      { rel: 'Phase 1 Relational core (shipped)', obj: 'Rebuild from key-value to relational: rev-checked fields, insert-based rows, server-numbered versions, migration.', mvp: 'shipped', ship: 'shipped' },
      { rel: 'Phase 2 Live collaboration (shipped)', obj: 'Presence, per-field conflict resolution, durable retried saves, live document follow, presentation mode.', mvp: 'shipped', ship: 'shipped' },
      { rel: 'Phase 3 Approvals & audit (shipped)', obj: 'Approval state machine with named sign-off, append-only activity trail, provenance trigger.', mvp: 'shipped', ship: 'shipped' },
      { rel: 'Phase 4 Sharing & brand (shipped)', obj: 'Section-scoped SME links, partner portal, per-PRD brand logo, designed co-branded PDF, read-only presentation link.', mvp: 'shipped', ship: 'shipped' },
      { rel: 'Phase 5 SOC 2 Type II (next)', obj: 'Controls, evidence collection, and an independent Type II examination.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase 6 E-signature & sealing (next)', obj: 'Execute sign-off by e-signature and cryptographically seal each export to the exact baseline signed.', mvp: 'to confirm', ship: 'to confirm' }
    ],
    components: [
      { name: 'Relational core', owner: 'Engineering', status: 'Shipped', desc: 'Projects, fields, rows, versions; rev-checked RPCs; RLS; kv migration.' },
      { name: 'Live collaboration', owner: 'Engineering', status: 'Shipped', desc: 'Presence, conflict resolution, durable saves, live doc follow, presentation mode.' },
      { name: 'Approvals & audit', owner: 'Engineering', status: 'Shipped', desc: 'Approval state machine, named sign-off, append-only activity trail.' },
      { name: 'Sharing & brand', owner: 'Engineering', status: 'Shipped', desc: 'Section-scoped links, partner portal, brand logo, designed PDF, presentation link.' },
      { name: 'SOC 2 compliance', owner: 'Security / Compliance', status: 'Planned', desc: 'Control set, evidence automation, independent Type II examination.' },
      { name: 'E-signature & sealing', owner: 'Engineering', status: 'Planned', desc: 'E-signature execution and cryptographic sealing of exports to their baseline.' }
    ],
    metrics: [
      { metric: 'Concurrent editors without lost writes', target: '9 or more', method: 'Multi-writer concurrency simulation against the rev-checked RPCs.' },
      { metric: 'Save durability', target: '100% confirmed or visibly failed', method: 'Every write awaited, retried on transient failure, surfaced in the save indicator.' },
      { metric: 'Approval integrity', target: 'no Approved while a sign-off is pending', method: 'Backend check on the version status state machine.' },
      { metric: 'Share scoping', target: 'zero internal fields in any external payload', method: 'Payload-build tests asserting fit criteria never appear.' },
      { metric: 'Backend regression suite', target: '79 checks green on every change', method: 'Embedded-Postgres end-to-end run in CI.' },
      { metric: 'SOC 2 Type II', target: 'certified (next phase)', method: 'Independent auditor report; published only when live.' },
      { metric: 'Sealed sign-off', target: 'export verifies to its exact baseline (next phase)', method: 'Cryptographic verification independent of the platform.' }
    ],
    fr: [
      { stmt: 'The platform stores every shared collection as rows so two people adding requirements at the same moment both persist with distinct permanent IDs.', fit: 'Nine simultaneous adds yield nine rows with unique requirement IDs. Test.', pri: 'Must', comp: 'Relational core' },
      { stmt: 'Every scalar field carries a revision; a save based on a stale revision is detected and resolved by name rather than silently overwriting.', fit: 'A stale write returns the current value and author; the loser is never destroyed silently. Test.', pri: 'Must', comp: 'Relational core' },
      { stmt: 'Version numbers are allocated server-side under a lock, and each baseline is an immutable snapshot with a change diff by requirement ID.', fit: 'Two managers generating at once produce distinct version numbers; diffs list added, modified, and removed by ID. Test.', pri: 'Must', comp: 'Relational core' },
      { stmt: 'Live presence shows who is editing which field, edits stream into the rendered document as they are typed, and every save is confirmed, retried on transient failure, or shown as failed.', fit: 'Two editors see each other’s presence and edits; a dropped network retries without loss. Demonstration and Test.', pri: 'Must', comp: 'Live collaboration' },
      { stmt: 'Approvals are a state machine (Draft, In review, Approved, Changes requested) with named approvers, and a version cannot read Approved while any approver is pending.', fit: 'Attempting to approve with a pending approver is refused; sign-off is stamped from the signed-in user. Test.', pri: 'Must', comp: 'Approvals & audit' },
      { stmt: 'An append-only audit trail records every edit, version, status change, and inbound submission with a name and timestamp, unmodifiable from the app.', fit: 'The activity log cannot be edited or deleted through the application. Inspection and Test.', pri: 'Must', comp: 'Approvals & audit' },
      { stmt: 'Sharing is section-scoped and brand-carrying: SME review links, a partner portal, and read-only presentation links, each showing only the sections the team selected and the assigned collaborator logo, never internal fields.', fit: 'An unselected section is absent from the share payload; fit criteria never appear. Test.', pri: 'Must', comp: 'Sharing & brand' },
      { stmt: 'Exports to PDF and Word carry a designed, co-branded cover with version, status, approval history, and revision record.', fit: 'A printed and a Word export both carry the cover metadata and the assigned logo. Demonstration.', pri: 'Must', comp: 'Sharing & brand' },
      { stmt: 'A read-only presentation link renders the branded record with no review form and no account, pointing at a specific published version so what a recipient opens is fixed.', fit: 'Any role can copy a link that opens the record read-only; it cannot be edited. Test.', pri: 'Must', comp: 'Sharing & brand' },
      { stmt: 'The platform earns SOC 2 Type II certification covering security, availability, and confidentiality.', fit: 'An independent auditor issues a Type II report; the claim is published only once the report is in hand. Independent audit.', pri: 'Should', comp: 'SOC 2 compliance' },
      { stmt: 'The platform executes sign-off by e-signature bound to the identity of the approver.', fit: 'An approver signs a version and the signature records identity, intent, and timestamp on the record. Test.', pri: 'Should', comp: 'E-signature & sealing' },
      { stmt: 'Each export is cryptographically sealed to the exact baseline signed, so a sealed document verifies independently even if ReqPub is offline.', fit: 'A sealed export verifies against its baseline hash without the platform; tampering fails verification. Test.', pri: 'Should', comp: 'E-signature & sealing' }
    ],
    nfr: [
      { stmt: 'Racy writes flow only through server-side rev-checked RPCs; direct client writes to worksheet tables are revoked.', fit: 'The authenticated role cannot write project_fields or field_rows directly. Test.', pri: 'Must', comp: 'Relational core' },
      { stmt: 'Row-level security scopes every table to the organization, with the strictest policy on approvals and the audit trail.', fit: 'A rival-org user reads and writes nothing; approval provenance cannot be forged. Test.', pri: 'Must', comp: 'Approvals & audit' },
      { stmt: 'The frontend ships a Content Security Policy with no inline scripts and escapes every interpolation.', fit: 'A security review finds no script-injection vector. Inspection.', pri: 'Must', comp: 'Live collaboration' },
      { stmt: 'Every change ships with regression tests and the suite stays green (33 unit, 79 backend checks).', fit: 'CI runs the suites on every push. Test.', pri: 'Must', comp: 'Relational core' },
      { stmt: 'Anonymous endpoints are rate-limited and input is size-capped.', fit: 'Flooding a share link is throttled; oversized input is rejected. Test.', pri: 'Should', comp: 'Sharing & brand' }
    ],
    interfaces: [
      { iface: 'Supabase backend', req: 'Postgres, Auth, RLS, Realtime, Storage, Edge Functions', fit: 'All data and auth flow through the managed backend. Inspection.', comp: 'Relational core' },
      { iface: 'GitHub Pages', req: 'Static hosting of the frontend at reqpub.com', fit: 'The site deploys from the main branch. Inspection.', comp: 'Live collaboration' },
      { iface: 'E-signature provider', req: 'Identity-bound signature execution with audit metadata (next phase)', fit: 'A sign-off records signer identity, intent, and timestamp. Test.', comp: 'E-signature & sealing' },
      { iface: 'Timestamp authority', req: 'RFC 3161 timestamping for sealed exports (next phase)', fit: 'A sealed export carries a trusted timestamp. Test.', comp: 'E-signature & sealing' }
    ],
    people: [
      { name: 'Micah Canfield', role: 'Owner; product direction and approvals' },
      { name: 'Collection Ventures team', role: 'Nine-person team stress-testing the platform as managers, viewers, partners, and SME reviewers' }
    ],
    glossary: [
      { term: 'Baseline', def: 'An immutable, numbered snapshot of the requirements at a point in time.' },
      { term: 'Rev-checked save', def: 'A write accepted only if it is based on the current revision of a field.' },
      { term: 'Section-scoped share', def: 'A published brief containing only the sections the team selected.' },
      { term: 'Presentation link', def: 'A fixed, read-only, branded view of a published version.' },
      { term: 'Sealed export', def: 'An export cryptographically bound to the exact baseline signed (next phase).' },
      { term: 'SOC 2 Type II', def: 'An independent examination of security controls over a period (next phase).' }
    ]
  }
};

/* ---- 3. Esign API (the e-signature execution and sealing service behind
        ReqPub sign-off, described from its OpenAPI surface) ---- */
export const esign = {
  id: 'prd-esign-api',
  name: 'Esign API',
  scalars: {
    ctrl_product: 'Esign API',
    ctrl_org: 'Collection Ventures',
    ctrl_owner: 'Micah Canfield',
    ctrl_status: 'In Review',
    ov_purpose: 'This document is the requirements record for the Esign API: the API-first electronic-signature service that executes sign-off and seals the result. It is written for the build team and the build agent, and it defines the envelope lifecycle, recipients and fields, the signing ceremony, assurance levels, the tamper-evident ledger, and independent bundle verification. It is the execution layer behind ReqPub sign-off and a standalone product. Where this record is silent, the build escalates to the owner rather than inventing scope.',
    ov_vision: 'A signature you can prove without trusting the vendor. Esign API takes a document from upload to a completed, cryptographically sealed bundle that any third party can verify offline. Every envelope carries a hash-chained ledger of who did what and when, and every completed bundle verifies against its own contents even if the service is gone. The promise: the proof outlives the platform.',
    ov_problem: 'E-signature is usually a black box: the audit trail lives on the vendor’s servers, and if the vendor disappears or is disputed, the proof is gone. Teams that answer to courts, auditors, and regulators need signatures whose integrity does not depend on the signing vendor staying online or trustworthy. They need an API they can embed, an assurance level they can choose, and a bundle that verifies on its own.',
    ov_market: 'Product and advisory teams that already collect approvals and now need legally executed, independently verifiable signatures: ReqPub sign-off first, then agencies, compliance-heavy SaaS, and institutional workflows (corrections, courts, employers) that must show an unbroken chain of custody. The buyer answers to a regulator or a court; the verifiable bundle is the artifact both sides trust.',
    context: 'A stateless FastAPI service over a managed Postgres backend and object storage. Documents are PDFs, fields are placed by page coordinate, and signatures are captured by draw, type, or click. The ledger is append-only and hash-chained. The API is the product surface (OpenAPI-documented); a thin hosted signing page is a client of it. Verification must never depend on the service being online.',
    sol_solution: 'One service with a clear spine: an issuer uploads a document; an envelope is created with recipients (each a role), fields (each a type placed on a page), and an assurance level; the envelope is sent by a delivery method; each recipient completes a signing ceremony (submit or decline) captured with method and consent; on completion the service seals a bundle (documents, fields, signatures, and the hash-chained ledger) with an RFC 3161 timestamp; and a public verify endpoint validates any bundle against its own contents. A self-sign path lets an issuer sign their own document in one call.',
    staged: 'Yes',
    has_ai: 'No',
    vulnerable: 'No',
    consent: 'Every signer is shown the document and an explicit electronic-signature consent (ESIGN and eIDAS intent-to-sign) before any signature is captured, and consent is recorded with the signature as a ledger event. A recipient may decline; a decline is a first-class, recorded outcome, not an error. No signature is captured without an affirmative act tied to the shown document hash.',
    retention: 'Envelopes, documents, fields, signatures, and ledger events are retained for the life of the account and any contracted legal-hold period. Completed bundles are immutable and independently verifiable; deleting an envelope preserves the sealed bundle hash and a ledger stub so previously issued proofs still verify. The audit ledger is append-only and retained per the records agreement.',
    residency: 'Documents and signatures are stored in the account’s configured region on managed Postgres and object storage. Signed bundles are content-addressed by hash. Timestamping is delegated to an RFC 3161 authority and the timestamp token is stored with the bundle. Cross-border processing for institutional channels is contracted per agreement.',
    access: 'Row-level security defaults to deny. An issuer reads only their own envelopes; a recipient reaches only the envelope and fields addressed to them, through a scoped signing token, never the issuer’s other envelopes. Signing tokens are single-purpose, expiring, and bound to one recipient on one envelope. The ledger is writable only by the service (append-only); verification is public and reads only the bundle presented to it. API keys are per-issuer and scoped.',
    verify_note: 'A release is accepted when every Must requirement passes its fit criterion in production, the RLS default-deny suite passes, and a sealed bundle verifies independently of the service with zero false-valids and zero false-invalids on the conformance set. Tampering with any byte of a sealed bundle must fail verification.',
    link_repo: 'to confirm',
    link_board: 'to confirm',
    link_design: 'to confirm'
  },
  lists: {
    ov_goals: [
      'Execute a signature from envelope to sealed bundle through the API with no human step beyond the signer.',
      'Make every completed bundle verify independently of the service, with zero false-valids.',
      'Offer a chosen assurance level per envelope, from basic click-to-sign to identity-verified signing.',
      'Record an unbroken, hash-chained ledger of every envelope event, tamper-evident on verify.',
      'Ship as ReqPub’s sign-off execution layer first, then as a standalone embeddable API.'
    ],
    sol_in: [
      'Envelope lifecycle: create from an uploaded document or with a file in one call, add recipients and fields, send, and track status to completion.',
      'Recipients with roles (signer, approver, viewer) and a routing order; fields placed by type and page coordinate.',
      'Signing ceremony: show the document and consent, capture a signature by draw, type, or click, or record a decline with a reason.',
      'A self-sign path for an issuer signing their own document in a single call.',
      'Assurance levels selectable per envelope, from basic to identity-verified.',
      'A hash-chained, append-only ledger and audit-event stream per envelope.',
      'A sealed, RFC 3161-timestamped completion bundle and a public verify endpoint that validates it offline.'
    ],
    sol_out: [
      'No AI: the service executes and seals signatures, it does not interpret documents.',
      'No in-house certificate authority or timestamp authority; both are delegated to accredited providers.',
      'No document editor; documents arrive as finished PDFs and fields are placed by coordinate.',
      'No open recipient accounts; recipients act through scoped, expiring signing tokens.',
      'No storage of raw government-ID images beyond the identity step that requires them.',
      'No claim of qualified (QES) status until the identity and certificate chain is independently accredited.'
    ],
    assume: [
      'Documents are provided as PDFs and field coordinates are supplied by the issuer or by ReqPub.',
      'An accredited RFC 3161 timestamp authority and, for higher assurance, an identity or KYC provider are available as managed services.',
      'ReqPub is the first integrator and drives the initial envelope and field shapes.'
    ],
    depend: [
      'Managed Postgres backend with row-level security, storage, and edge functions.',
      'Object storage for documents and sealed bundles, content-addressed by hash.',
      'An RFC 3161 timestamp authority for bundle sealing.',
      'An identity-verification provider for advanced and higher assurance levels.',
      'A delivery provider (email and SMS) for recipient notifications and signing links.'
    ],
    constrain: [
      'API-first: every capability is an OpenAPI-documented endpoint and the hosted signing page is a thin client of it.',
      'The ledger is append-only and hash-chained; no endpoint edits or deletes a past event.',
      'Verification depends only on the bundle, never on the live service (the offline rule).',
      'Every signer action binds to the exact document hash shown at signing.',
      'Signing tokens are single-recipient, single-envelope, and expiring.'
    ]
  },
  rows: {
    ctrl_approvers: [
      { role: 'Owner', name: 'Micah Canfield' },
      { role: 'CTO / Architecture', name: 'Alon Arad' },
      { role: 'Engineering lead', name: 'Erik Companhone' },
      { role: 'Security / Compliance', name: 'to confirm' }
    ],
    seg: [
      { segment: 'ReqPub sign-off', share: 'First integrator', desc: 'Executes and seals approval sign-off on a versioned baseline.' },
      { segment: 'Compliance-heavy SaaS', share: 'Primary', desc: 'Embed signing where an independent audit trail is required.' },
      { segment: 'Institutional workflows', share: 'Funded', desc: 'Courts, corrections, and employers needing a verifiable chain of custody.' }
    ],
    persona: [
      { persona: 'The integrator (issuer)', needs: 'A clean API to create an envelope, place fields, send, and get a sealed bundle back.' },
      { persona: 'The signer', needs: 'To see the document, consent, and sign by draw, type, or click from a link with no account.' },
      { persona: 'The auditor', needs: 'A bundle that verifies on its own, with an unbroken hash-chained ledger of every event.' },
      { persona: 'The compliance owner', needs: 'A chosen assurance level, recorded consent, and retention that satisfies the regulator.' }
    ],
    release: [
      { rel: 'Phase 0 Foundation', obj: 'Service skeleton, schema and RLS, storage, API keys, health, OpenAPI.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase 1 Envelope & documents', obj: 'Upload document, create envelope (and with-file), add recipients and fields, send.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase 2 Signing ceremony', obj: 'Consent, submit signature (draw/type/click), decline, status to completion, self-sign.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase 3 Ledger & sealing', obj: 'Hash-chained ledger, audit events, RFC 3161 sealed bundle, public verify.', mvp: 'to confirm', ship: 'to confirm' },
      { rel: 'Phase 4 Assurance', obj: 'Identity-verified signing and higher assurance levels; conformance verification set.', mvp: 'to confirm', ship: 'to confirm' }
    ],
    components: [
      { name: 'Envelope Service', owner: 'Erik Companhone', status: 'Planned', desc: 'Envelope lifecycle and status machine (draft, sent, completed, declined, voided, expired).' },
      { name: 'Document Store', owner: 'Andy Lan', status: 'Planned', desc: 'PDF upload, content-addressed storage, field placement by page coordinate.' },
      { name: 'Recipients & Fields', owner: 'Erik Companhone', status: 'Planned', desc: 'Recipient roles and routing order; typed fields placed per signer.' },
      { name: 'Signing Ceremony', owner: 'Huy Tran', status: 'Planned', desc: 'Consent, signature capture (draw/type/click), decline, self-sign, scoped tokens.' },
      { name: 'Ledger & Audit', owner: 'Alon Arad', status: 'Planned', desc: 'Append-only, hash-chained ledger and audit-event stream per envelope.' },
      { name: 'Sealing & Verify', owner: 'Alon Arad', status: 'Planned', desc: 'RFC 3161 timestamped bundle and public offline verification.' },
      { name: 'Assurance & Identity', owner: 'to confirm', status: 'Planned', desc: 'Assurance levels and identity verification for higher tiers.' },
      { name: 'API Platform', owner: 'Erik Companhone', status: 'Planned', desc: 'API keys, rate limits, OpenAPI, hosted signing page, webhooks.' }
    ],
    metrics: [
      { metric: 'Envelope completion rate', target: 'measured per issuer', method: 'Completed envelopes divided by sent, by integrator.' },
      { metric: 'Bundle verification correctness', target: 'zero false-valids, zero false-invalids', method: 'Conformance set of valid and tampered bundles run through verify.' },
      { metric: 'Seal integrity', target: '100% of completed bundles carry a valid RFC 3161 token', method: 'Inspection of sealed bundles.' },
      { metric: 'Sign submit latency', target: 'p95 under 500 ms', method: 'Server-acknowledged timing on the sign submit path.' },
      { metric: 'Ledger continuity', target: 'no broken hash chain in any envelope', method: 'Chain check across all ledger events.' },
      { metric: 'Signing-path availability', target: '99.9%', method: 'Measured uptime on the submit and verify endpoints.' }
    ],
    fr: [
      { stmt: 'An issuer uploads a PDF document and the service stores it content-addressed by hash, returning a document reference.', fit: 'An uploaded document is retrievable by reference and its stored hash matches the bytes. Test.', pri: 'Must', comp: 'Document Store' },
      { stmt: 'An issuer creates an envelope either from an already-uploaded document or by uploading a file in the same call.', fit: 'Both the create-from-reference and create-with-file paths yield an envelope in draft. Test.', pri: 'Must', comp: 'Envelope Service' },
      { stmt: 'An issuer adds recipients to an envelope, each with a role (signer, approver, viewer) and a routing order.', fit: 'Recipients persist with role and order; order governs when each is notified. Test.', pri: 'Must', comp: 'Recipients & Fields' },
      { stmt: 'An issuer places fields on a document, each with a type (signature, initials, date, text, checkbox) and a page and coordinate, assigned to a recipient.', fit: 'Every field renders at its page coordinate for the assigned signer only. Test and Demonstration.', pri: 'Must', comp: 'Recipients & Fields' },
      { stmt: 'Sending an envelope transitions it to sent, notifies the first recipients by the chosen delivery method, and issues each a scoped, expiring signing token.', fit: 'A sent envelope notifies recipients in routing order; each token opens only that recipient’s view. Test.', pri: 'Must', comp: 'Envelope Service' },
      { stmt: 'Before any signature, the signing ceremony shows the exact document and an explicit electronic-signature consent, and records the shown document hash.', fit: 'No signature is accepted without a recorded consent bound to the shown document hash. Test.', pri: 'Must', comp: 'Signing Ceremony' },
      { stmt: 'A signer submits a signature captured by draw, type, or click, and the service records the method, the field, the signer, and a timestamp.', fit: 'A submitted signature records its method and binds to the field and document hash. Test.', pri: 'Must', comp: 'Signing Ceremony' },
      { stmt: 'A recipient may decline to sign with a reason, and the decline is a recorded, first-class envelope outcome.', fit: 'A decline transitions the envelope to declined and appends a ledger event with the reason. Test.', pri: 'Must', comp: 'Signing Ceremony' },
      { stmt: 'An issuer may self-sign their own document in a single call, producing a completed, sealed envelope without an external recipient.', fit: 'A self-sign call returns a sealed bundle that verifies. Test.', pri: 'Must', comp: 'Signing Ceremony' },
      { stmt: 'The service records every envelope event (created, sent, viewed, signed, declined, completed) as an append-only, hash-chained ledger entry.', fit: 'Each ledger entry references the prior entry’s hash and no endpoint edits or deletes an entry. Inspection and Test.', pri: 'Must', comp: 'Ledger & Audit' },
      { stmt: 'On completion the service seals a bundle of the documents, fields, signatures, and ledger, and stamps it with an RFC 3161 timestamp.', fit: 'A completed envelope yields a bundle carrying a valid timestamp token. Test.', pri: 'Must', comp: 'Sealing & Verify' },
      { stmt: 'A public verify endpoint validates a submitted bundle against its own contents and hash chain, without reading live service state.', fit: 'A valid bundle verifies offline; a bundle with any byte altered fails; zero false-valids on the conformance set. Test.', pri: 'Must', comp: 'Sealing & Verify' },
      { stmt: 'Each envelope carries an assurance level, and the ceremony enforces the identity requirements of that level before capturing a signature.', fit: 'A higher-assurance envelope refuses to complete without the required identity step. Test.', pri: 'Should', comp: 'Assurance & Identity' },
      { stmt: 'The service serves an OpenAPI document and returns structured validation errors for malformed requests.', fit: 'The OpenAPI spec is served and a malformed request returns a 422 with field-level detail. Inspection and Test.', pri: 'Must', comp: 'API Platform' }
    ],
    nfr: [
      { stmt: 'Every recipient action flows through a single-recipient, single-envelope, expiring signing token; no recipient can reach another envelope.', fit: 'A token scoped to one recipient cannot read or act on any other envelope. Test.', pri: 'Must', comp: 'Signing Ceremony' },
      { stmt: 'Row-level security defaults to deny; an issuer reads only their own envelopes and the ledger is writable only by the service.', fit: 'A rival issuer reads and writes nothing; no client can append a forged ledger entry. Test.', pri: 'Must', comp: 'Ledger & Audit' },
      { stmt: 'Sealed bundles are immutable and content-addressed, and verification depends only on the bundle, never on live service state.', fit: 'A sealed bundle verifies with the service offline. Test.', pri: 'Must', comp: 'Sealing & Verify' },
      { stmt: 'The sign submit and verify paths hold 99.9 percent availability and submit is acknowledged at p95 under 500 ms.', fit: 'Measured uptime and latency meet the targets under load. Load test.', pri: 'Should', comp: 'API Platform' },
      { stmt: 'API keys are per-issuer and scoped, and anonymous signing endpoints are rate-limited and input size-capped.', fit: 'A flooded signing link is throttled and an oversized upload is rejected. Test.', pri: 'Must', comp: 'API Platform' }
    ],
    data_entities: [
      { entity: 'Envelopes', sens: 'Business; scoped to the issuing account' },
      { entity: 'Documents (PDFs)', sens: 'Confidential; content-addressed by hash' },
      { entity: 'Recipients', sens: 'Personal; name, email or phone, role' },
      { entity: 'Fields and placements', sens: 'Business; per-signer coordinates' },
      { entity: 'Signatures', sens: 'Personal and sensitive; method and mark, bound to the document hash' },
      { entity: 'Ledger and audit events', sens: 'Sensitive; append-only, hash-chained' },
      { entity: 'Sealed bundles', sens: 'Immutable; verify exposes integrity only' }
    ],
    interfaces: [
      { iface: 'Timestamp authority', req: 'RFC 3161 timestamping of sealed bundles', fit: 'Every completed bundle carries a valid timestamp token. Test.', comp: 'Sealing & Verify' },
      { iface: 'Identity verification', req: 'KYC or identity proofing for advanced and higher assurance', fit: 'A higher-assurance envelope cannot complete without a passed identity check. Test.', comp: 'Assurance & Identity' },
      { iface: 'Delivery (email and SMS)', req: 'Recipient notifications and signing links by the chosen delivery method', fit: 'A sent envelope reaches the recipient by the selected channel. Test.', comp: 'Envelope Service' },
      { iface: 'Object storage', req: 'Document and bundle storage, content-addressed by hash', fit: 'A stored object’s hash matches its address. Inspection.', comp: 'Document Store' },
      { iface: 'ReqPub', req: 'Create an envelope for a version and return a sealed sign-off to the record', fit: 'A ReqPub sign-off produces a sealed bundle referenced on the version. Test.', comp: 'API Platform' }
    ],
    people: [
      { name: 'Micah Canfield', role: 'Owner; decision authority on assurance, providers, and pricing' },
      { name: 'Alon Arad', role: 'CTO; sealing, ledger, and security posture' },
      { name: 'Erik Companhone', role: 'SWE lead; envelope, recipients and fields, API platform' },
      { name: 'Huy Tran', role: 'SWE; signing ceremony and hosted signing page' },
      { name: 'Andy Lan', role: 'SWE; document store and data model' }
    ],
    glossary: [
      { term: 'Envelope', def: 'The unit of signing: one or more documents, recipients, fields, and a status.' },
      { term: 'Recipient', def: 'A party on an envelope with a role (signer, approver, viewer) and a routing order.' },
      { term: 'Field', def: 'A typed input (signature, initials, date, text, checkbox) placed on a document for a signer.' },
      { term: 'Assurance level', def: 'The identity strength required to sign, from basic click to identity-verified.' },
      { term: 'Signature method', def: 'How a mark is captured: drawn, typed, or clicked.' },
      { term: 'Ledger', def: 'The append-only, hash-chained record of every envelope event.' },
      { term: 'Bundle', def: 'The sealed, timestamped package of documents, signatures, and ledger.' },
      { term: 'Self-sign', def: 'An issuer signing their own document in a single call.' },
      { term: 'Offline rule', def: 'A sealed bundle must verify without the service being online.' }
    ]
  }
};

export const PRDS = [fathering, reqpub, esign];
