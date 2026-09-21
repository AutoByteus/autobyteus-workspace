import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { validateReleasedTeamRunV2 } from '../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/released-team-run-v2-schema.js';
import { validateAgentOrgRunExecutionTreePayload } from '../../../src/run-history/store/agent-org-run-execution-tree-schema.js';
import { AgentOrgExecutionIndex } from '../../../src/agent-org-execution/services/agent-org-execution-index.js';
import { AgentMemoryLayout } from '../../../src/agent-memory/store/agent-memory-layout.js';

it('observes an actual strict source with an old locator and unique exact physical file; does not migrate', async () => {
  const root = '/home/autobyteus/data/memory';
  const orgRunId = 'software_development_department_03636d7482c04940987839d4fb0868a6';
  const sourceDir = path.join(root, 'agent_teams', orgRunId);
  const sourceTree = path.join(sourceDir, 'team_run_execution_tree.json');
  const beforeTree = await fs.readFile(sourceTree);
  const released = validateReleasedTeamRunV2(JSON.parse(beforeTree.toString('utf8')), orgRunId);
  expect(released.teamCount).toBeGreaterThan(0);
  const t = released.rootTeam;
  const target = validateAgentOrgRunExecutionTreePayload({
    schemaVersion: 1, subjectKind: 'agent_org', createdAt: released.root.createdAt,
    archivedAt: released.root.archivedAt, applicationBinding: released.root.applicationBinding, handoffs: released.root.handoffs,
    rootOrg: { address: '/', orgRunId, orgDefinitionId: t.teamDefinitionId,
      orgDefinitionName: t.teamDefinitionName, defaultLaunchConfiguration: t.defaultLaunchConfiguration,
      members: t.members, taskExecutions: t.taskExecutions },
  }, orgRunId);
  const tracePath = path.join(sourceDir, 'requirements_engineer_3bce6dff03fa4f379b8a458ec801ff6e/raw_traces_active.jsonl');
  const beforeTrace = await fs.readFile(tracePath);
  const locator: string = JSON.parse(beforeTrace.toString('utf8').split('\n')[1]!).media.images[0];
  const parts = locator.match(/^\/rest\/team-runs\/([^/]+)\/members\/([^/]+)\/context-files\/([^/]+)$/)!;
  expect(decodeURIComponent(parts[1]!)).toBe(orgRunId);
  const address = decodeURIComponent(parts[2]!);
  const filename = decodeURIComponent(parts[3]!);
  const index = new AgentOrgExecutionIndex(target);
  const layout = new AgentMemoryLayout(root);
  const candidates = index.listAgents().filter(a => a.address === address && a.host.hostKind === 'root');
  const proven: {agentRunId:string;filePath:string;sha256:string}[] = [];
  for (const agent of candidates) {
    const targetDir = layout.getRootedAgentRunDirPath(index.getPhysicalScopeForAgent(agent.agentRunId), agent.agentRunId);
    const sourceFile = path.join(sourceDir, path.relative(layout.getOrgDirPath(orgRunId), targetDir), 'context_files', filename);
    try {
      const bytes = await fs.readFile(sourceFile);
      proven.push({ agentRunId: agent.agentRunId, filePath: sourceFile, sha256: createHash('sha256').update(bytes).digest('hex') });
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  expect(proven).toHaveLength(1);
  expect(await fs.readFile(sourceTree)).toEqual(beforeTree);
  expect(await fs.readFile(tracePath)).toEqual(beforeTrace);
  console.log('CUTOVER_OBSERVATION', JSON.stringify({ sourceTree, tracePath, field:'line2.media.images[0]',
    releasedConfiguredTeamCount:released.teamCount, strictTargetValid:true, oldLocator:locator, proven,
    noWrite:true, noRuntime:true, note:'Read-only observed data, NOT migration or upload success.' }));
});
