// DSK-001 (ticket-owned, temporary): released-shape Projects data written by the installed released build.
// Usage: node dsk-001-seed-release.mjs <graphqlUrl> <out.json>
// Creates Projects/Tasks in a known order through the released app's public GraphQL. Statuses and a context
// file are set afterwards with the released server's own native tools (dsk-001-release-tool.mjs), because the
// released UI/GraphQL has no status mutation (agents set statuses).
import fs from 'node:fs/promises';
const [graphqlUrl, out] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const gql = async (query, variables = {}) => {
  const res = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await res.json(); if (body.errors) throw new Error(JSON.stringify(body.errors)); return body.data;
};
const project = async name => { await sleep(25); return (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId name createdAt}}', { i: { name } })).createProject; };
const task = async (projectId, description) => { await sleep(25); return (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId description status createdAt}}', { i: { projectId, description } })).createProjectTask; };
const seeded = { projects: [] };
const plan = [
  ['AutoByteus', ['Set up the repository layout', 'Design the Task board schema\nColumns, lanes and ordering', 'Ship the board UI', 'Prototype the old sync service', 'Write the API reference', 'Prepare the beta release notes']],
  ['Customer Onboarding Experience Redesign', ['Map the onboarding journey', 'Redesign the welcome screens', 'Usability test with five customers']],
  ['AutoByteus!', ['Collision check Task']],
  ['Doomed Project', ['Will be deleted with its Project']],
  ['Café Ops', ['Order the espresso beans']],
];
for (const [name, tasks] of plan) {
  const p = await project(name); const created = [];
  for (const d of tasks) created.push(await task(p.projectId, d));
  seeded.projects.push({ ...p, tasks: created });
}
const doomed = seeded.projects.find(p => p.name === 'Doomed Project');
seeded.deletedProject = { projectId: doomed.projectId, deleted: (await gql('mutation($id:String!){deleteProject(projectId:$id)}', { id: doomed.projectId })).deleteProject };
seeded.projectsAfter = (await gql('{projects{projectId name taskCount openTaskCount createdAt}}')).projects;
await fs.writeFile(out, JSON.stringify(seeded, null, 2));
console.log(JSON.stringify(seeded.projectsAfter));
