// API-REV-019 temporary real-desktop upgrade probe.
//   node <this> seed <instance.json>     released app: write Projects/Tasks/files/draft through its public API
//   node <this> verify <instance.json>   upgraded build: same data through the current public API + on-disk layout
// Only the owned isolated instance named by <instance.json> is driven; the data root is test-created.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const E = 'tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-021';
const [mode, instanceFile] = process.argv.slice(2);
const i = JSON.parse(await fs.readFile(instanceFile, 'utf8')).result;
const dataRoot = (await fs.readFile(`${E}/api-207-data-root.txt`, 'utf8')).trim();
assert.equal(i.dataRoot, dataRoot, 'must be the test-created data root');
const projectsDir = path.join(dataRoot, 'server-data/projects');
async function gql(query, variables = {}) {
  const r = await fetch(i.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  assert.equal(r.status, 200);
  const j = await r.json(); assert(!j.errors, JSON.stringify(j.errors)); return j.data;
}
const sha = b => createHash('sha256').update(b).digest('hex');
const rest = p => `${i.backendUrl}/rest/projects/${p}`;
async function upload(projectId, draftId, name, content) {
  const form = new FormData(); form.append('file', new Blob([content], { type: 'text/plain' }), name);
  const r = await fetch(`${rest(projectId)}/task-context-drafts/${draftId}/context-files`, { method: 'POST', body: form });
  assert.equal(r.status, 200); return r.json();
}
async function newDraft(projectId) {
  const r = await fetch(`${rest(projectId)}/task-context-drafts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 200); return r.json();
}
const LIST = '{projects{projectId name description taskCount openTaskCount}}';
const TASKS = 'query($id:String!){projectTasks(projectId:$id){taskId description status createdAt updatedAt contextFiles{storedFilename displayName mimeType sizeBytes}}}';
async function publicView() {
  const projects = (await gql(LIST)).projects.sort((a, b) => a.projectId.localeCompare(b.projectId));
  const tasks = {}; const bytes = {};
  for (const p of projects) {
    tasks[p.projectId] = (await gql(TASKS, { id: p.projectId })).projectTasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
    for (const t of tasks[p.projectId]) for (const f of t.contextFiles) {
      const r = await fetch(`${rest(p.projectId)}/tasks/${t.taskId}/context-files/${f.storedFilename}`);
      assert.equal(r.status, 200); bytes[`${p.projectId}/${t.taskId}/${f.storedFilename}`] = await r.text();
    }
  }
  return { projects, tasks, bytes };
}

if (mode === 'seed') {
  const out = { at: new Date().toISOString(), instanceId: i.instanceId, app: i.executablePath };
  const a = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: 'Upgrade witness A', description: 'Written by the released app' } })).createProject;
  const b = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: 'Upgrade witness B', description: 'Second released Project' } })).createProject;
  const d1 = await newDraft(a.projectId);
  const f1 = await upload(a.projectId, d1.draftId, 'requirements.txt', 'API019 released saved file\n');
  const t1 = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId: a.projectId, description: 'Released Task with a saved file', contextDraft: { draftId: d1.draftId, storedFilenames: [f1.storedFilename] } } })).createProjectTask;
  const t2 = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId: a.projectId, description: 'Released Task without files' } })).createProjectTask;
  const t3 = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId: b.projectId, description: 'Released Task in Project B' } })).createProjectTask;
  // An unsaved draft with an uploaded file: the user's in-progress upload at upgrade time.
  const pending = await newDraft(a.projectId);
  const pendingFile = await upload(a.projectId, pending.draftId, 'draft-notes.txt', 'API019 pending draft bytes\n');
  out.ids = { a: a.projectId, b: b.projectId, t1: t1.taskId, t2: t2.taskId, t3: t3.taskId, pendingDraft: pending.draftId, pendingFile: pendingFile.storedFilename };
  out.view = await publicView();
  out.disk = { projectsJsonSha: sha(await fs.readFile(path.join(projectsDir, 'projects.json'))), entries: await fs.readdir(projectsDir) };
  await fs.copyFile(path.join(projectsDir, 'projects.json'), `${E}/api-207-released-projects.json`);
  await fs.writeFile(`${E}/api-207-seed.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out.disk), JSON.stringify(out.ids));
} else {
  assert.equal(mode, 'verify');
  const seed = JSON.parse(await fs.readFile(`${E}/api-207-seed.json`, 'utf8'));
  const out = { at: new Date().toISOString(), instanceId: i.instanceId, app: i.executablePath };
  out.migration = (await gql('{getAppDataMigrations{migrationId status attempts summary errorMessage logPath}}')).getAppDataMigrations.find(m => m.migrationId === '20261005_projects_per_folder_v1');
  out.view = await publicView();
  assert.deepEqual(out.view, seed.view, 'public Projects/Tasks/file bytes identical after upgrade');
  const ids = seed.ids;
  out.disk = {
    entries: (await fs.readdir(projectsDir)).sort(),
    retainedSha: sha(await fs.readFile(path.join(projectsDir, 'projects.pre-folders.json'))),
    projectsJsonPresent: await fs.access(path.join(projectsDir, 'projects.json')).then(() => true, () => false),
    taskA1: JSON.parse(await fs.readFile(path.join(projectsDir, ids.a, 'tasks', ids.t1, 'task.json'), 'utf8')),
    contextA1: await fs.readdir(path.join(projectsDir, ids.a, 'tasks', ids.t1, 'context')),
    pendingDraft: await fs.readdir(path.join(projectsDir, ids.a, 'drafts', ids.pendingDraft)),
  };
  assert.equal(out.disk.retainedSha, seed.disk.projectsJsonSha, 'retained original is the released file');
  assert.equal(out.disk.projectsJsonPresent, false);
  assert(!out.disk.entries.includes('task_context_files') && !out.disk.entries.includes('task_context_drafts'), 'released directories retired');
  const r = await fetch(`${rest(ids.a)}/task-context-drafts/${ids.pendingDraft}/context-files/${ids.pendingFile}`);
  assert.equal(r.status, 200); out.pendingDraftBytes = await r.text();
  assert.equal(out.pendingDraftBytes, 'API019 pending draft bytes\n');
  await fs.writeFile(`${E}/api-207-verify-${path.basename(instanceFile, '.json')}.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ migration: out.migration, entries: out.disk.entries }));
}
