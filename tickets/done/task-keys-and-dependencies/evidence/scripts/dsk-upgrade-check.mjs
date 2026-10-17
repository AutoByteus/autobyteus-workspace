// DSK-002 / DSK-006 (ticket-owned, temporary): checks the Projects files of the owned desktop data root against the
// pre-upgrade copy written by the released build, and the migration ledger through the instance's GraphQL.
// Usage: node dsk-upgrade-check.mjs <graphqlUrl> <projectsDir> <preUpgradeDir> <seeded.json> <out.json> [<compareToDir>]
//   With <compareToDir> (a copy taken after the first start), also asserts that nothing changed since then.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [graphqlUrl, projectsDir, preDir, seededPath, out, compareTo] = process.argv.slice(2);
const failures = []; const check = (ok, message, detail) => { if (!ok) failures.push({ message, detail }); };
const walk = async (dir, base = dir, acc = {}) => {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, base, acc); else acc[path.relative(base, full)] = await fs.readFile(full);
  }
  return acc;
};
const gql = async (query, variables = {}) => { const r = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors) throw new Error(JSON.stringify(b.errors)); return b.data; };
const seeded = JSON.parse(await fs.readFile(seededPath, 'utf8'));
const pre = await walk(preDir), post = await walk(projectsDir);
const sha = b => createHash('sha256').update(b).digest('hex');
const report = { files: {}, keys: {}, prefixes: {}, ledger: null, failures };
// Every pre-upgrade file still exists; JSON files equal the pre-upgrade object plus only the key fields.
for (const [rel, bytes] of Object.entries(pre)) {
  check(rel in post, 'file kept', rel);
  if (!(rel in post)) continue;
  if (!rel.endsWith('.json')) { check(sha(bytes) === sha(post[rel]), 'non-JSON file bytes unchanged', rel); report.files[rel] = 'bytes unchanged'; continue; }
  const before = JSON.parse(bytes), after = JSON.parse(post[rel]);
  const added = Object.keys(after).filter(k => !(k in before)), removed = Object.keys(before).filter(k => !(k in after));
  const changed = Object.keys(before).filter(k => k in after && JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  const expectedAdded = rel.endsWith('project.json') ? ['taskKeys'] : ['taskKey'];
  // After the first start only (DSK-002); with <compareToDir> (DSK-006) the user's later edits are expected, and the restart is checked below.
  if (!compareTo) check(JSON.stringify(added) === JSON.stringify(expectedAdded) && !removed.length && !changed.length, 'only the key field was added', { rel, added, removed, changed });
  report.files[rel] = { added, removed, changed };
}
const newFiles = Object.keys(post).filter(rel => !(rel in pre));
report.newFiles = newFiles;
// Keys in Task creation order per Project; prefixes in Project creation order (DEC-002/005, REQ-003/004).
const expectedPrefix = { 'AutoByteus': 'autobyteus', 'Customer Onboarding Experience Redesign': 'customer-onboarding-experience-redesign', 'AutoByteus!': 'autobyteus-2', 'Café Ops': 'cafe-ops' };
for (const p of seeded.projects.filter(p => p.name !== 'Doomed Project')) {
  const projectFile = JSON.parse(post[path.join(p.projectId, 'project.json')]);
  report.prefixes[p.name] = projectFile.taskKeys;
  const ordered = [...p.tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.taskId.localeCompare(b.taskId));
  const keys = ordered.map(t => JSON.parse(post[path.join(p.projectId, 'tasks', t.taskId, 'task.json')]).taskKey);
  report.keys[p.name] = Object.fromEntries(ordered.map((t, i) => [t.description.split('\n')[0], keys[i]]));
  check(projectFile.taskKeys?.prefix === expectedPrefix[p.name], 'prefix', { name: p.name, taskKeys: projectFile.taskKeys });
  if (!compareTo) check(projectFile.taskKeys?.lastNumber === ordered.length, 'lastNumber = Task count after upgrade', { name: p.name, taskKeys: projectFile.taskKeys });
  check(JSON.stringify(keys) === JSON.stringify(ordered.map((_, i) => `${expectedPrefix[p.name]}-${i + 1}`)), 'keys in creation order', { name: p.name, keys });
}
report.ledger = (await gql('{getAppDataMigrations{migrationId status attempts}}')).getAppDataMigrations.filter(m => /project/.test(m.migrationId));
const keysMigration = report.ledger.find(m => m.migrationId === '20261017_project_task_keys_v1');
check(keysMigration?.status === 'SUCCEEDED' && keysMigration.attempts === 1, 'keys migration SUCCEEDED once', keysMigration);
report.graphql = (await gql('{projects{projectId name taskCount}}')).projects;
check(report.graphql.length === 4, 'four Projects listed (the deleted one stays gone)', report.graphql);
if (compareTo) {
  const first = await walk(compareTo);
  const diffs = Object.keys({ ...first, ...post }).filter(rel => !(rel in first) || !(rel in post) || sha(first[rel]) !== sha(post[rel]));
  report.changedSinceFirstStart = diffs;
  check(diffs.length === 0, 'second start changed nothing', diffs);
}
report.result = failures.length ? 'Fail' : 'Pass';
await fs.writeFile(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ result: report.result, failures, keys: report.keys, prefixes: report.prefixes, ledger: report.ledger, newFiles, changedSinceFirstStart: report.changedSinceFirstStart }, null, 1));
