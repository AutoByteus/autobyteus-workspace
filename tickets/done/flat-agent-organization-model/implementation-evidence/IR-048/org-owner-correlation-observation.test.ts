import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { AgentMemoryLayout } from '../../../src/agent-memory/store/agent-memory-layout.js';
import { AgentOrgRunExecutionTreeStore } from '../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { validateAgentOrgRunExecutionTreePayload } from '../../../src/run-history/store/agent-org-run-execution-tree-schema.js';
import { AgentOrgExecutionTreeLocationService } from '../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js';
import { ContextFileOwnerResolver } from '../../../src/context-files/services/context-file-owner-resolver.js';
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from '../../fixtures/current-agent-org-run-fixtures.js';

it('observes actual final-owner ambiguity after approved same-address task retention, with exact-ID control and no activation', async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ir048-owner-correlation-'));
  try {
    const direct = testOrgAgentNode('/shared', 'configured-direct');
    const lead = testOrgAgentNode('/delivery/lead', 'configured-lead');
    const team = testOrgTeamNode({ address: '/delivery', teamRunId: 'configured-team', coordinatorAddress: lead.address, members: [lead] });
    const original = testAgentOrgExecutionTree({ orgRunId: 'org', members: [direct, team] });
    const directory = new AgentMemoryLayout(memoryDir).getOrgDirPath('org'), store = new AgentOrgRunExecutionTreeStore();
    const locations = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const resolver = new ContextFileOwnerResolver({ locations });
    await store.write(directory, original);
    for (const member of [direct, lead]) expect(await resolver.resolveFinalOwner({ kind: 'org_member_final', orgRunId: 'org', memberAddress: member.address })).toMatchObject({ agentRunId: member.agentRunId });
    const raw = structuredClone(original) as any;
    raw.rootOrg.taskExecutions = [
      { address: direct.address, agentRunId: 'retained-direct', platformAgentRunId: null, startedAt: '2026-09-01T00:00:01.000Z', settledAt: '2026-09-01T00:00:02.000Z' },
      { address: team.address, teamRunId: 'retained-team', members: [{ address: lead.address, agentRunId: 'retained-lead', platformAgentRunId: null }], taskExecutions: [], startedAt: '2026-09-01T00:00:01.000Z', settledAt: '2026-09-01T00:00:02.000Z' },
    ];
    const current = validateAgentOrgRunExecutionTreePayload(raw, 'org');
    await store.write(directory, current);
    for (const member of [direct, lead]) {
      const owner = { kind: 'org_member_final' as const, orgRunId: 'org', memberAddress: member.address };
      const exact = await locations.findAgent({ rootRunId: 'org', agentRunId: member.agentRunId, memberAddress: member.address });
      expect(exact).toMatchObject({ agentRunId: member.agentRunId, isActive: false });
      expect(await locations.findAgent({ rootRunId: 'org', memberAddress: member.address })).toBeNull();
      await expect(resolver.resolveFinalOwner(owner)).rejects.toThrow('Unable to resolve context-file owner');
      expect(() => resolver.resolveFinalOwnerSync(owner)).toThrow('Unable to resolve context-file owner');
      console.log(JSON.stringify({ owner, exactAgentRunId: exact!.agentRunId, actualCurrentTreeValid: true, addressOnlyFinalizationAndRead: 'unresolved', activation: false }));
    }
  } finally { await fs.rm(memoryDir, { recursive: true, force: true }); }
});
