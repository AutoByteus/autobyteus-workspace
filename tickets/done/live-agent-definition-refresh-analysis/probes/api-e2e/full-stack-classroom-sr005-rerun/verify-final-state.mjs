import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const evidenceDir = path.resolve('tickets/in-progress/live-agent-definition-refresh-analysis/probes/api-e2e/full-stack-classroom-sr005-rerun');
const browserEvidence = JSON.parse(await fs.readFile(path.join(evidenceDir, 'browser-evidence.json'), 'utf8'));
const runId = browserEvidence.snapshots.createTeamRun.teamRunId;
const runDir = path.resolve(`.autobyteus/development/server-data/memory/agent_teams/${runId}`);
const treePath = path.join(runDir, 'team_run_execution_tree.json');
const treeBytes = await fs.readFile(treePath);
const tree = JSON.parse(treeBytes);
const professor = tree.rootTeam.members.find((member) => member.address === '/professor');
const tracePath = path.join(runDir, professor.agentRunId, 'raw_traces_active.jsonl');
const traceBytes = await fs.readFile(tracePath);
const traces = traceBytes.toString('utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const response = await fetch('http://127.0.0.1:38123/graphql', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    operationName: 'FinalTeamRunResumeConfig',
    query: `query FinalTeamRunResumeConfig($teamRunId: String!) {
      getTeamRunResumeConfig(teamRunId: $teamRunId) {
        teamRunId isActive executionTree
        modelConfigEditability { editable reason }
      }
    }`,
    variables: { teamRunId: runId },
  }),
});
const graphql = await response.json();
const assistantTrace = [...traces].reverse().find((row) => row.trace_type === 'assistant');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const result = {
  checkedAt: new Date().toISOString(),
  runId,
  backendHealth: await (await fetch('http://127.0.0.1:38123/rest/health')).json(),
  graphqlHttpStatus: response.status,
  graphql,
  persistedTree: {
    path: treePath,
    sha256: sha256(treeBytes),
    runtimeKind: tree.rootTeam.defaultLaunchConfiguration.runtimeKind,
    modelIdentifier: tree.rootTeam.defaultLaunchConfiguration.llmModelIdentifier,
    rootReasoningEffort: tree.rootTeam.defaultLaunchConfiguration.llmConfig?.reasoning_effort ?? null,
    memberReasoningEfforts: tree.rootTeam.members.map((member) => ({
      address: member.address,
      reasoningEffort: member.launchConfiguration.llmConfig?.reasoning_effort ?? null,
    })),
  },
  providerTrace: {
    path: tracePath,
    sha256: sha256(traceBytes),
    assistantTrace,
  },
};
await fs.writeFile(path.join(evidenceDir, 'final-state-verification.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
