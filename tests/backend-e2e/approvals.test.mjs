/* In-app approval routing: a slot assigned to a team member can be self-approved
   by that member (and only them or a manager); the "waiting on you" feed and the
   roster picker resolve correctly; and the approve gate still holds. Run:
   node tests/backend-e2e/approvals.test.mjs */
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const rel = (p) => fileURLToPath(new URL(p, import.meta.url));
const epg = new EmbeddedPostgres({ databaseDir: join(tmpdir(), 'reqpub-appr-' + process.pid), user: 'postgres', password: 'pw', port: 55467, persistent: false });
await epg.initialise(); await epg.start(); await epg.createDatabase('reqpub');
const db = new pg.Client({ host: 'localhost', port: 55467, user: 'postgres', password: 'pw', database: 'reqpub' });
await db.connect();
const sql = (f) => readFileSync(f, 'utf8');
const one = async (q, a) => (await db.query(q, a)).rows[0];
const rows = async (q, a) => (await db.query(q, a)).rows;
const run = (q) => db.query(q);
const asUser = (uid) => db.query(`select set_config('test.uid', '${uid || ''}', false)`);
let pass = 0, fail = 0;
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };

const MGR = '11111111-0000-0000-0000-0000000000a1';
const APPR = '22222222-0000-0000-0000-0000000000a2';   // team member, viewer, assigned approver
const RIVAL = '33333333-0000-0000-0000-0000000000a3';  // manager of another org, no access
const ORG = '44444444-0000-0000-0000-0000000000a4';
const RORG = '55555555-0000-0000-0000-0000000000a5';

try {
  await run(sql(rel('shim.sql')));
  await run(sql(rel('v1-backend.sql')));
  await run(sql(rel('../../supabase/schema.sql')));
  // Prove the standalone migration is idempotent on top of the base schema.
  await run(sql(rel('../../supabase/fix-approver-assignment.sql')));

  await run(`insert into auth.users(id,email) values
    ('${MGR}','mgr@collection.co'),('${APPR}','erik@collection.co'),('${RIVAL}','rival@other.co')`);
  await run(`insert into orgs(id,name,created_by) values ('${ORG}','Collection Ventures','${MGR}'),('${RORG}','Rival Co','${RIVAL}')`);
  await run(`insert into org_members(org_id,user_id,email,role) values
    ('${ORG}','${MGR}','mgr@collection.co','manager'),
    ('${ORG}','${APPR}','erik@collection.co','viewer'),
    ('${RORG}','${RIVAL}','rival@other.co','manager')`);
  await run(`insert into user_profiles(user_id,display_name) values ('${APPR}','Erik Lindqvist')`);
  await run(`insert into projects(id,org_id,name) values ('recordmade','${ORG}','RecordMade')`);
  const V = (await one(`insert into versions(project_id,seq,label,status,snapshot) values ('recordmade',1,'1.2','draft','{}') returning id`)).id;
  // One slot assigned to a teammate, one manual (name only).
  const selfSlot = (await one(`insert into version_approvals(version_id,approver_role,approver_name,approver_user_id) values ('${V}','Engineering Lead','Erik','${APPR}') returning id`)).id;
  const manualSlot = (await one(`insert into version_approvals(version_id,approver_role,approver_name) values ('${V}','Sponsor','External Sponsor') returning id`)).id;

  // The provenance trigger forces a fresh slot to 'pending' regardless of insert.
  check('new approver slots start pending', (await one(`select bool_and(status='pending') p from version_approvals where version_id='${V}'`)).p === true);

  // While the version is a draft, nothing is "waiting on you".
  await asUser(APPR);
  check('feed is empty while the version is a draft', (await rows(`select * from my_open_approvals()`)).length === 0);

  // Manager sends it for review.
  await asUser(MGR);
  check('manager can send for review', (await one(`select version_set_status('${V}','in_review') r`)).r.ok === true);

  // Now the assigned teammate sees exactly their slot; the manager sees none (nothing assigned to them).
  await asUser(APPR);
  const feed = await rows(`select * from my_open_approvals()`);
  check('assigned teammate sees one waiting-on-you item', feed.length === 1, feed);
  check('the item resolves the project name', feed[0] && feed[0].project_name === 'RecordMade', feed[0]);
  await asUser(MGR);
  check('a non-assigned manager has an empty feed', (await rows(`select * from my_open_approvals()`)).length === 0);

  // Authorization on decisions.
  await asUser(RIVAL);
  check('an outsider cannot decide any slot', (await one(`select approval_decide('${selfSlot}','approved') ok`)).ok === false);
  await asUser(APPR);
  check('the assignee cannot decide someone else’s (manual) slot', (await one(`select approval_decide('${manualSlot}','approved') ok`)).ok === false);
  check('the assignee CAN approve their own slot', (await one(`select approval_decide('${selfSlot}','approved') ok`)).ok === true);
  const decided = await one(`select status, decided_by from version_approvals where id='${selfSlot}'`);
  check('their sign-off is recorded as approved', decided.status === 'approved', decided.status);
  check('provenance attributes the sign-off to the assignee, not a manager', decided.decided_by === APPR, decided.decided_by);
  check('feed clears once they have signed off', (await rows(`select * from my_open_approvals()`)).length === 0);

  // The gate still holds: the manual slot is still pending.
  await asUser(MGR);
  check('version cannot be approved while the manual slot is pending',
    (await one(`select version_set_status('${V}','approved') r`)).r.error === 'approvals_pending');
  check('manager can decide the manual slot', (await one(`select approval_decide('${manualSlot}','approved') ok`)).ok === true);
  check('version approves once every slot is approved', (await one(`select version_set_status('${V}','approved') r`)).r.ok === true);

  // Roster picker: members can read the named roster; outsiders cannot.
  await asUser(MGR);
  const roster = await rows(`select * from org_members_named('${ORG}') order by email`);
  check('roster returns both org members', roster.length === 2, roster.map((r) => r.email));
  check('roster carries display names for the picker', roster.some((r) => r.display_name === 'Erik Lindqvist'), roster);
  await asUser(RIVAL);
  check('a non-member gets nothing from the roster', (await rows(`select * from org_members_named('${ORG}')`)).length === 0);

} catch (e) {
  fail++; console.log('  ✗ threw: ' + (e && e.message)); console.log(e && e.stack);
} finally {
  console.log(`\napprovals.test: ${pass} passed, ${fail} failed`);
  await db.end(); await epg.stop();
  process.exit(fail ? 1 : 0);
}
