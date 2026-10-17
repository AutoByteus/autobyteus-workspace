// DSK-001 (ticket-owned, temporary): runs the INSTALLED RELEASE's own native Task tools against the owned,
// stopped data root, so statuses and a context file are written by released code (the released UI has no
// status control; agents set statuses). Never point it at a production data root.
// Usage: node dsk-001-release-tool.mjs <releaseServerDir> <serverDataDir> <seeded.json> <contextFile> <out.json>
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [releaseServer, dataDir, seededPath, contextFile, out] = process.argv.slice(2);
if (!dataDir.includes('tkd-desktop-root')) throw new Error('Refusing: not the owned test data root');
const { appConfigProvider } = await import(pathToFileURL(path.join(releaseServer, 'dist/config/app-config-provider.js')).href);
const { UpdateTaskTool, ListProjectTasksTool } = await import(pathToFileURL(path.join(releaseServer, 'dist/agent-tools/project-tasks/project-task-native-tools.js')).href);
appConfigProvider.initialize({ appDataDir: dataDir });
const seeded = JSON.parse(await fs.readFile(seededPath, 'utf8'));
const byName = Object.fromEntries(seeded.projects.map(p => [p.name, p]));
const results = [];
const update = async args => { const r = JSON.parse(await new UpdateTaskTool().execute(null, args)); results.push({ args, r }); return r; };
const ab = byName['AutoByteus'].tasks, ob = byName['Customer Onboarding Experience Redesign'].tasks;
await update({ task_id: ab[1].taskId, status: 'DONE' });
await update({ task_id: ab[2].taskId, status: 'IN_PROGRESS' });
await update({ task_id: ab[3].taskId, status: 'CANCELLED' });
await update({ task_id: ab[4].taskId, context_files: [contextFile] });
await update({ task_id: ob[0].taskId, status: 'DONE' });
await update({ task_id: ob[1].taskId, status: 'IN_PROGRESS' });
const listed = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: byName['AutoByteus'].projectId }));
await fs.writeFile(out, JSON.stringify({ results, listedAutoByteus: listed }, null, 2));
console.log(results.map(x => JSON.stringify(x.r)).join('\n'));
