import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentMemoryLayout } from '../../../../src/agent-memory/store/agent-memory-layout.js';
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from '../../../../src/run-history/services/root-run-package-readiness-index.js';
import { TeamRunExecutionTreeStore } from '../../../../src/run-history/store/team-run-execution-tree-store.js';
import { TaskDelegationRecordsV1Store } from '../../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js';
import { TeamCommunicationV1Store } from '../../../../src/services/team-communication/team-communication-v1-store.js';
import { AgentOrgRunExecutionTreeStore } from '../../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { AgentOrgTaskDelegationRecordsV1Store } from '../../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js';
import { AgentOrgCommunicationMessagesV1Store } from '../../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js';
import { testAgentNode, testExecutionTree } from '../../../fixtures/current-team-run-fixtures.js';
import { testAgentOrgExecutionTree, testOrgAgentNode } from '../../../fixtures/current-agent-org-run-fixtures.js';

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    resetRootRunPackageReadinessIndex(root);
    await fs.rm(root, { recursive: true, force: true });
  }
});

const temporaryMemory = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'root-readiness-'));
  roots.push(root);
  return root;
};

const writeTeam = async (memoryDir: string, id: string): Promise<string> => {
  const packagePath = new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: id, ancestorTeamRunIds: [] });
  await fs.mkdir(packagePath, { recursive: true });
  await new TeamRunExecutionTreeStore().write(packagePath, testExecutionTree({
    rootTeamRunId: id,
    coordinatorAddress: '/coordinator',
    children: [testAgentNode('/coordinator', { agentRunId: `${id}-agent` })],
  }));
  await new TaskDelegationRecordsV1Store().write(packagePath, { schemaVersion: 1, rootTeamRunId: id, records: [] });
  await new TeamCommunicationV1Store().write(packagePath, { schemaVersion: 1, rootTeamRunId: id, messages: [] });
  return packagePath;
};

const writeOrg = async (memoryDir: string, id: string): Promise<string> => {
  const packagePath = new AgentMemoryLayout(memoryDir).getOrgDirPath(id);
  await fs.mkdir(packagePath, { recursive: true });
  await new AgentOrgRunExecutionTreeStore().write(packagePath, testAgentOrgExecutionTree({
    orgRunId: id,
    members: [testOrgAgentNode('/direct', `${id}-agent`)],
  }));
  await new AgentOrgTaskDelegationRecordsV1Store().write(packagePath, { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: id, records: [] });
  await new AgentOrgCommunicationMessagesV1Store().write(packagePath, { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: id, messages: [] });
  return packagePath;
};

describe('RootRunPackageReadinessIndex', () => {
  it('lazily shares one strict awaitReady generation across Team and Org facades', async () => {
    const memoryDir = await temporaryMemory();
    await writeTeam(memoryDir, 'team-lazy');
    await writeOrg(memoryDir, 'org-lazy');
    const first = new RootRunPackageReadinessIndex(memoryDir);
    const second = new RootRunPackageReadinessIndex(memoryDir);
    const rebuild = vi.spyOn(RootRunPackageReadinessIndex.prototype, 'rebuild');

    await Promise.all([first.awaitReady(), second.awaitReady(), first.awaitReady()]);

    expect(rebuild).toHaveBeenCalledTimes(1);
    expect(first.listAdmitted('agent_team')).toEqual(['team-lazy']);
    expect(second.listAdmitted('agent_org')).toEqual(['org-lazy']);
    expect(first.listDiagnostics()).toEqual([]);
  });

  it('admits exact current Team V2 and Org V1 packages', async () => {
    const memoryDir = await temporaryMemory();
    await writeTeam(memoryDir, 'team-1');
    await writeOrg(memoryDir, 'org-1');
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.listAdmitted('agent_team')).toEqual(['team-1']);
    expect(index.listAdmitted('agent_org')).toEqual(['org-1']);
    expect(index.listDiagnostics()).toEqual([]);
  });

  it('rejects the same root ID from both physical families', async () => {
    const memoryDir = await temporaryMemory();
    await writeTeam(memoryDir, 'collision');
    await writeOrg(memoryDir, 'collision');
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.listAdmitted('agent_team')).toEqual([]);
    expect(index.listAdmitted('agent_org')).toEqual([]);
    expect(index.listDiagnostics().map((item) => item.code)).toEqual(['ROOT_RUN_FAMILY_CONFLICT', 'ROOT_RUN_FAMILY_CONFLICT']);
  });

  it('rejects retired Team authority inside an Org package', async () => {
    const memoryDir = await temporaryMemory();
    const packagePath = await writeOrg(memoryDir, 'org-residue');
    await fs.writeFile(path.join(packagePath, 'team_run_execution_tree.json'), '{}');
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.isAdmitted('agent_org', 'org-residue')).toBe(false);
    expect(index.listDiagnostics('agent_org')[0]).toMatchObject({ code: 'ROOT_RUN_PACKAGE_MANIFEST_INVALID' });
  });

  it('rejects retired Org authority inside a Team package', async () => {
    const memoryDir = await temporaryMemory();
    const packagePath = await writeTeam(memoryDir, 'team-residue');
    await fs.writeFile(path.join(packagePath, 'agent_org_run_execution_tree.json'), '{}');
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.isAdmitted('agent_team', 'team-residue')).toBe(false);
    expect(index.listDiagnostics('agent_team')[0]).toMatchObject({ code: 'ROOT_RUN_PACKAGE_MANIFEST_INVALID' });
  });

  it('rejects strict sidecar correlation mismatch without trying another family', async () => {
    const memoryDir = await temporaryMemory();
    const packagePath = await writeOrg(memoryDir, 'org-mismatch');
    await fs.writeFile(path.join(packagePath, 'agent_org_task_delegation_records.json'), JSON.stringify({
      schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'other', records: [],
    }));
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.isAdmitted('agent_org', 'org-mismatch')).toBe(false);
    expect(index.listDiagnostics('agent_org')[0]).toMatchObject({ code: 'ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED' });
  });

  it('rebuilds the native flat Team zero-write cohort without changing bytes or stats', async () => {
    const memoryDir = await temporaryMemory();
    const packagePath = await writeTeam(memoryDir, 'team-zero-write');
    const before = await authoritySnapshot(packagePath);
    await new RootRunPackageReadinessIndex(memoryDir).rebuild();
    const after = await authoritySnapshot(packagePath);
    expect(after).toEqual(before);
  });
});

const authoritySnapshot = async (packagePath: string) => Object.fromEntries(await Promise.all([
  'team_run_execution_tree.json', 'task_delegation_records.json', 'team_communication_messages.json',
].map(async (name) => {
  const filePath = path.join(packagePath, name);
  const [bytes, stats] = await Promise.all([fs.readFile(filePath, 'base64'), fs.stat(filePath)]);
  return [name, { bytes, size: stats.size, mtimeMs: stats.mtimeMs, ino: stats.ino }];
})));
