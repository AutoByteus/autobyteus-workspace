// autobyteus-32 rendered check: synthesized decision records for a fresh development data root (no real data).
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
fs.mkdirSync(dir, { recursive: true });
const now = Date.now();
const at = (hoursAgo) => new Date(now - hoursAgo * 3600_000).toISOString();
const base = { projectId: 'project-demo', delegatingAgentName: 'product_manager', fromNode: null, copyKind: 'agent_team', notes: [] };
const team = (hoursAgo, taskId, taskKey, taskTitle, runId, agents) => agents.map((a) => ({
  ...base, recordedAt: at(hoursAgo), taskId, taskKey, taskTitle, delegatingRunId: runId, copyAddress: '/software_engineering_team',
  routerFailure: null, skipped: [], taskKind: null, choiceReason: null, ...a,
}));
const records = [
  ...team(50, 't-1', 'demo-1', 'Add CSV export to reports', 'pm-run-1', [
    { agentAddress: '/software_engineering_team/solution_designer', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus-4-1', source: 'agent_default' },
    { agentAddress: '/software_engineering_team/implementation_engineer', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5-codex', source: 'model_router', taskKind: 'implementation', choiceReason: 'Codex handles multi-file server changes well and has 62% of its weekly limit left.' },
    { agentAddress: '/software_engineering_team/code_reviewer', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-sonnet-4-5', source: 'model_router', taskKind: 'code review', choiceReason: 'Reviews go to Claude, as the knowledge file says.',
      skipped: [{ layer: 'agent_default', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5', detail: 'Codex · gpt-5 is blocked until 2026-10-27 04:00 UTC (weekly)' }] },
  ]),
  ...team(20, 't-2', 'demo-2', 'Write the release announcement', 'pm-run-2', [
    { agentAddress: '/software_engineering_team/solution_designer', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus-4-1', source: 'team_default' },
    { agentAddress: '/software_engineering_team/implementation_engineer', runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3-pro', source: 'model_router', taskKind: 'writing', choiceReason: 'Writing goes to Antigravity.' },
    { agentAddress: '/software_engineering_team/code_reviewer', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus-4-1', source: 'inherited',
      routerFailure: 'no valid answer within 40 seconds' },
  ]),
  ...team(2, null, null, 'Fix the login timeout', null, [
    { agentAddress: '/software_engineering_team/implementation_engineer', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5-codex', source: 'model_router', taskKind: 'implementation', choiceReason: 'A small server fix; Codex fits.', fromNode: 'docker-node', delegatingAgentName: 'run-from-peer' },
  ]),
];
fs.writeFileSync(path.join(dir, 'decisions_active.jsonl'), records.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`${records.length} records → ${dir}`);
