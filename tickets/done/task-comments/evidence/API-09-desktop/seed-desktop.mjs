#!/usr/bin/env node
// API-09 (task-comments) test data package for the isolated desktop instance. Ticket-owned; not a package script.
// phase1 <graphqlUrl> <seed.json>   : while the instance runs, create a Project and Tasks, and add two comments the app's way
//   (GraphQL addProjectTaskComment).
// phase2 <serverDataDir> <seed.json>: while the instance is stopped, add an agent's comment and a combined status + comment with
//   the product's own update_task tool (tests/fixtures/project-task-tool-writer.mjs, this worktree's build), and turn one Task
//   file into the shape a release before this one wrote (no `comments` key) for AC-011. Only the instance's own data root.
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
  const projectId = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: 'AutoByteus' } })).createProject.projectId;
  const create = async (description) => (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey}}', { i: { projectId, description } })).createProjectTask;
  const comment = async (taskId, text) => (await gql('mutation($i:AddProjectTaskCommentInput!){addProjectTaskComment(input:$i){taskId comments{id text}}}', { i: { projectId, taskId, text } })).addProjectTaskComment;
  const t = {};
  t.notes = await create('Release notes for 1.5.6\nCollect the changes since 1.5.5.');
  t.sidebar = await create('Fix the sidebar collapse state');
  t.onboarding = await create('Plan the onboarding redesign');
  t.old = await create('A Task saved before this release (no comments field)');
  await comment(t.notes.taskId, 'Dispatched with this direction: keep it short.');
  await comment(t.notes.taskId, 'User decided: mention the quokka mascot.\nSecond line of the same comment.');
  fs.writeFileSync(seedFile, `${JSON.stringify({ projectId, tasks: t }, null, 2)}\n`);
  console.log(JSON.stringify({ projectId, keys: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.taskKey])) }));
} else if (phase === 'phase2') {
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const out = path.join(path.dirname(seedFile), 'tool-writer-out.json');
  const results = [];
  const update = (args) => {
    const r = spawnSync(process.execPath, ['tests/fixtures/project-task-tool-writer.mjs', target, 'update_task', JSON.stringify(args), out], { cwd: serverDir, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`${JSON.stringify(args)}: ${r.stderr}`);
    results.push(JSON.parse(fs.readFileSync(out, 'utf8')));
  };
  update({ task_id: seed.tasks.notes.taskKey.toUpperCase(), add_comment: 'Agent: first draft is in the docs folder.' });
  update({ task_id: seed.tasks.notes.taskKey, status: 'IN_PROGRESS', add_comment: 'Agent: started the review.' });
  const file = path.join(target, 'projects', seed.projectId, 'tasks', seed.tasks.old.taskId, 'task.json');
  const { comments: _dropped, ...released } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bytes = `${JSON.stringify(released, null, 2)}\n`;
  fs.writeFileSync(file, bytes);
  fs.rmSync(out, { force: true });
  fs.writeFileSync(path.join(path.dirname(seedFile), 'old-task.json'), bytes);
  console.log(JSON.stringify({ acks: results, oldFile: file }));
} else {
  throw new Error('usage: phase1 <graphqlUrl> <seed.json> | phase2 <serverDataDir> <seed.json>');
}
