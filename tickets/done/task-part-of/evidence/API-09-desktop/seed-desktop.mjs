#!/usr/bin/env node
// API-09 (task-part-of) test data package for the isolated desktop instance. Ticket-owned; not a package script.
// phase1 <graphqlUrl> <seed.json>   : while the instance runs, create Projects and Tasks (with parents) through its GraphQL.
// phase2 <serverDataDir> <seed.json>: while the instance is stopped, set statuses with the product's own update_task tool
//   (tests/fixtures/project-task-tool-writer.mjs, this worktree's build; GraphQL has no status mutation), and turn one Task
//   file into the step-1 shape (no partOfTaskId) for AC-016. Only the instance's own test-owned data root is touched.
// Run from the worktree root.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [phase, target, seedFile] = process.argv.slice(2);
const serverDir = path.join(process.cwd(), 'autobyteus-server-ts');

if (phase === 'phase1') {
  const gql = async (query, variables = {}) => {
    const response = await fetch(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    const body = await response.json();
    if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const project = async (name) => (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name } })).createProject.projectId;
  const create = async (projectId, description, extra = {}) => (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey}}',
    { i: { projectId, description, ...extra } })).createProjectTask;
  const main = await project('AutoByteus');
  const t = {};
  t.p = await create(main, 'Cross-node collaboration\nLet agents on different nodes delegate to each other.');
  t.handshake = await create(main, 'Design the node handshake', { partOfTaskId: t.p.taskId });
  t.relay = await create(main, 'Build the relay service', { partOfTaskId: t.p.taskId });
  t.docs = await create(main, 'Write the protocol docs', { partOfTaskId: t.p.taskId, dependsOnTaskIds: [t.relay.taskId] });
  t.bridge = await create(main, 'Retire the old bridge', { partOfTaskId: t.p.taskId });
  t.e2e = await create(main, 'Test cross-node delegation end to end with two nodes and a scripted runtime', { partOfTaskId: t.p.taskId });
  t.notes = await create(main, 'Release notes for 1.5.6');
  t.onboarding = await create(main, 'Onboarding redesign');
  t.welcome = await create(main, 'Welcome screen copy', { partOfTaskId: t.onboarding.taskId });
  t.signin = await create(main, 'Sign-in illustration', { partOfTaskId: t.onboarding.taskId });
  t.cleanup = await create(main, 'Old migration cleanup');
  t.tables = await create(main, 'Drop legacy tables', { partOfTaskId: t.cleanup.taskId });
  t.step1 = await create(main, 'A Task saved before this release (no parent field)');
  const long = await project('Enterprise Customer Onboarding Experience Redesign Program');
  const l = {};
  l.parent = await create(long, 'Redesign the enterprise onboarding journey');
  l.part = await create(long, 'Map the current enterprise sign-up funnel', { partOfTaskId: l.parent.taskId });
  fs.writeFileSync(seedFile, `${JSON.stringify({ main, long, tasks: t, longTasks: l }, null, 2)}\n`);
  console.log(JSON.stringify({ main, long, keys: Object.fromEntries(Object.entries({ ...t, ...l }).map(([k, v]) => [k, v.taskKey])) }));
} else if (phase === 'phase2') {
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const out = path.join(path.dirname(seedFile), 'tool-writer-out.json');
  const results = [];
  const update = (taskKey, status) => {
    const r = spawnSync(process.execPath, ['tests/fixtures/project-task-tool-writer.mjs', target, 'update_task', JSON.stringify({ task_id: taskKey, status }), out], { cwd: serverDir, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`${taskKey} ${status}: ${r.stderr}`);
    results.push(JSON.parse(fs.readFileSync(out, 'utf8')));
  };
  const k = (name) => seed.tasks[name].taskKey;
  update(k('p'), 'IN_PROGRESS');
  update(k('handshake'), 'DONE');
  update(k('relay'), 'IN_PROGRESS');
  update(k('bridge'), 'CANCELLED');
  update(k('e2e'), 'DONE');
  update(k('welcome'), 'DONE');
  update(k('signin'), 'DONE');
  update(k('tables'), 'CANCELLED');
  // AC-016: the step-1 shape of one Task file (every current key but partOfTaskId), as a released build wrote it.
  const file = path.join(target, 'projects', seed.main, 'tasks', seed.tasks.step1.taskId, 'task.json');
  const { partOfTaskId: _dropped, ...released } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bytes = `${JSON.stringify(released, null, 2)}\n`;
  fs.writeFileSync(file, bytes);
  fs.rmSync(out, { force: true });
  fs.writeFileSync(path.join(path.dirname(seedFile), 'step1-task.json'), bytes);
  console.log(JSON.stringify({ statuses: results.map((r) => [r.task.taskId, r.task.status]), step1File: file }));
} else {
  throw new Error('usage: phase1 <graphqlUrl> <seed.json> | phase2 <serverDataDir> <seed.json>');
}
