// autobyteus-313 IMP-05: synthesized decision records for the development data root (no real data).
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const at = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const rec = (h, taskKey, title, agent, runtimeKind, llmModelIdentifier, source, extra = {}) => ({
  recordedAt: at(h), taskId: taskKey ? `t-${taskKey}` : null, taskKey, projectId: 'project-demo', taskTitle: title,
  delegatingRunId: 'pm-run', delegatingAgentName: 'product_manager', fromNode: null, copyAddress: '/software_engineering_team',
  copyKind: 'agent_team', agentAddress: `/software_engineering_team/${agent}`, runtimeKind, llmModelIdentifier, source,
  taskKind: null, choiceReason: null, routerFailure: null, skipped: [], ...extra,
});
const records = [
  rec(30, 'demo-1', 'Add CSV export', 'solution_designer', 'claude_agent_sdk', 'claude-sonnet-5-5', 'agent_default'),
  rec(30, 'demo-1', 'Add CSV export', 'implementation_engineer', 'codex_app_server', 'gpt-5-codex', 'model_router',
    { taskKind: 'implementation', choiceReason: 'Codex fits a server change.',
      skipped: [{ layer: 'agent_default', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus-4-1', detail: 'blocked until 2026-10-28 04:00 UTC (weekly).' }] }),
  rec(5, 'demo-2', 'Write the announcement', 'implementation_engineer', 'claude_agent_sdk', 'claude-sonnet-5-5', 'model_router',
    { taskKind: 'writing', choiceReason: 'Writing goes to Claude.' }),
];
fs.writeFileSync(path.join(dir, 'decisions_active.jsonl'), records.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`${records.length} records`);
