// api417 setup: synthetic workspace + AGY agent run on the isolated instance's node (public GraphQL/WS only).
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { hostilePage, assets } from './pages.mjs';
const [nodeBase, cdnBase, root, pixel, font] = process.argv.slice(2);
const ws = path.join(root, 'workspace'), markers = path.join(root, 'markers');
await fs.mkdir(ws, { recursive: true }); await fs.mkdir(markers, { recursive: true });
for (const [name, body] of Object.entries(assets)) await fs.writeFile(path.join(ws, name), body);
await fs.copyFile(pixel, path.join(ws, 'pixel.png')); await fs.copyFile(font, path.join(ws, 'font.ttf'));
await fs.writeFile(path.join(ws, 'hostile.html'), hostilePage({ label: 'ws', version: 'WS-V1', nodeBase, cdnBase, markerDir: markers }));
const gql = async (query, variables) => { const b = await (await fetch(`${nodeBase}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
const defId = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Preview Writer', role: 'assistant', description: 'api417 synthetic agent', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: defId, workspaceRootPath: ws, autoExecuteTools: true, ...agy } })).createAgentRun;
if (!run.success) throw new Error(run.message);
const out = { defId, runId: run.runId, workspace: ws, markers };
await fs.writeFile(path.join(root, 'setup.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
