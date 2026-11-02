import { RootRunPackageCurrentValidator } from "../../../../src/run-history/services/root-run-package-current-validator.js";
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentMemoryLayout } from '../../../../src/agent-memory/store/agent-memory-layout.js';
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from '../../../../src/run-history/services/root-run-package-readiness-index.js';
import { TeamRunExecutionTreeStore } from '../../../../src/run-history/store/team-run-execution-tree-store.js';
import { TeamCommunicationStore } from '../../../../src/services/team-communication/team-communication-store.js';
import { AgentOrgRunExecutionTreeStore } from '../../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { AgentOrgCommunicationMessagesStore } from '../../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js';
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
  await new TeamCommunicationStore().write(packagePath, { schemaVersion: 1, rootTeamRunId: id, messages: [] });
  return packagePath;
};

const writeOrg = async (memoryDir: string, id: string): Promise<string> => {
  const packagePath = new AgentMemoryLayout(memoryDir).getOrgDirPath(id);
  await fs.mkdir(packagePath, { recursive: true });
  await new AgentOrgRunExecutionTreeStore().write(packagePath, testAgentOrgExecutionTree({
    orgRunId: id,
    members: [testOrgAgentNode('/direct', `${id}-agent`)],
  }));
  await new AgentOrgCommunicationMessagesStore().write(packagePath, { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: id, messages: [] });
  return packagePath;
};

describe('RootRunPackageReadinessIndex', () => {
  it('admits structurally valid roots without auditing typed trace records', async () => {
    const memoryDir = await temporaryMemory();
    const teamPackage = await writeTeam(memoryDir, 'team-payload-independent');
    const orgPackage = await writeOrg(memoryDir, 'org-payload-independent');
    const historicalPayload = Buffer.alloc(2 * 1024 * 1024, 0x7b);
    await fs.mkdir(path.join(teamPackage, 'team-payload-independent-agent'), { recursive: true });
    await fs.mkdir(path.join(orgPackage, 'org-payload-independent-agent'), { recursive: true });
    await fs.writeFile(path.join(teamPackage, 'team-payload-independent-agent', 'raw_traces_active.jsonl'), historicalPayload);
    await fs.writeFile(path.join(orgPackage, 'org-payload-independent-agent', 'raw_traces_000001.jsonl'), historicalPayload);
    const readFile = vi.spyOn(fs, 'readFile');

    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();

    expect(index.listAdmitted('agent_team')).toEqual(['team-payload-independent']);
    expect(index.listAdmitted('agent_org')).toEqual(['org-payload-independent']);
    expect(index.listDiagnostics()).toEqual([]);
    await index.admitCurrent('agent_team', 'team-payload-independent');
    expect(readFile.mock.calls.filter(([file]) => /raw_traces_(?:active|\d+)\.jsonl$/.test(String(file)))).toHaveLength(0);
  });

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

  it('admits a run published during a rebuild after that rebuild, by its own package only (autobyteus-358)', async () => {
    const memoryDir = await temporaryMemory(); await writeTeam(memoryDir, 'old');
    const scan = RootRunPackageCurrentValidator.prototype.scan;
    let release!: () => void;
    let discovered!: () => void;
    const captured = new Promise<void>(resolve => { discovered = resolve; });
    const barrier = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    const scanner = vi.spyOn(RootRunPackageCurrentValidator.prototype, 'scan').mockImplementation(async function () {
      const snapshot = await scan.call(this);
      if (++calls === 1) { discovered(); await barrier; }
      return snapshot;
    });
    const index = new RootRunPackageReadinessIndex(memoryDir);
    const rebuilding = index.rebuild(); await captured;
    await writeTeam(memoryDir, 'fresh');
    const publication = index.admitCurrent('agent_team', 'fresh');
    const single = vi.spyOn(RootRunPackageCurrentValidator.prototype, 'scanOne');
    release(); await Promise.all([rebuilding, publication]);
    expect(scanner).toHaveBeenCalledTimes(1);
    expect(single).toHaveBeenCalledWith('agent_team', 'fresh');
    expect(index.listAdmitted('agent_team')).toEqual(['fresh', 'old']);
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

  it('admits by structure: a log with an invalid message line is reported where it is read, not here (autobyteus-358)', async () => {
    const memoryDir = await temporaryMemory();
    const packagePath = await writeOrg(memoryDir, 'org-mismatch');
    await fs.writeFile(path.join(packagePath, 'agent_org_communication_messages_active.jsonl'), `${JSON.stringify({
      messageId: 'm1', senderAgentRunId: 'org-mismatch-agent', receiverAgentRunId: 'org-mismatch-agent', content: 'hi',
      messageType: 'agent_message', referenceFiles: ['relative/path.md'], createdAt: '2026-10-18T00:00:00.000Z',
    })}\n`);
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.isAdmitted('agent_org', 'org-mismatch')).toBe(true);
    expect(index.listDiagnostics('agent_org')).toEqual([]);
  });

  it('reads no message log at the first access or when a new run is admitted, and does not rescan (AC-005)', async () => {
    const memoryDir = await temporaryMemory();
    await writeTeam(memoryDir, 'team-old');
    await writeOrg(memoryDir, 'org-old');
    const logReads = [
      vi.spyOn(TeamCommunicationStore.prototype, 'read'), vi.spyOn(TeamCommunicationStore.prototype, 'readLog'),
      vi.spyOn(AgentOrgCommunicationMessagesStore.prototype, 'read'), vi.spyOn(AgentOrgCommunicationMessagesStore.prototype, 'readLog'),
    ];
    const scan = vi.spyOn(RootRunPackageCurrentValidator.prototype, 'scan');
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.awaitReady();
    await writeTeam(memoryDir, 'team-new');
    await index.admitCurrent('agent_team', 'team-new');
    await writeOrg(memoryDir, 'org-new');
    await index.admitCurrent('agent_org', 'org-new');
    expect(index.listAdmitted('agent_team')).toEqual(['team-new', 'team-old']);
    expect(index.listAdmitted('agent_org')).toEqual(['org-new', 'org-old']);
    expect(scan).toHaveBeenCalledTimes(1);
    logReads.forEach((read) => expect(read).not.toHaveBeenCalled());
  });

  it('refuses to admit a new package whose structure is invalid, and reports it', async () => {
    const memoryDir = await temporaryMemory();
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.awaitReady();
    const packagePath = await writeTeam(memoryDir, 'team-no-log');
    await fs.rm(path.join(packagePath, 'team_communication_messages_active.jsonl'));
    await expect(index.admitCurrent('agent_team', 'team-no-log')).rejects.toThrow('could not be admitted');
    expect(index.listDiagnostics('agent_team')).toEqual([expect.objectContaining({ rootRunId: 'team-no-log', code: 'ROOT_RUN_PACKAGE_MANIFEST_INVALID' })]);
  });

  it('admits a log in the append-only layout whether it has an active file or only sealed files', async () => {
    const memoryDir = await temporaryMemory();
    const teamPackage = await writeTeam(memoryDir, 'team-sealed-only');
    await fs.rename(path.join(teamPackage, 'team_communication_messages_active.jsonl'), path.join(teamPackage, 'team_communication_messages_000001.jsonl'));
    await writeOrg(memoryDir, 'org-active');
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.listAdmitted('agent_team')).toEqual(['team-sealed-only']);
    expect(index.listAdmitted('agent_org')).toEqual(['org-active']);
  });

  it('rejects a package without a message log, and one that still holds a JSON message log (unconverted residue)', async () => {
    const memoryDir = await temporaryMemory();
    const missing = await writeTeam(memoryDir, 'team-no-log');
    await fs.rm(path.join(missing, 'team_communication_messages_active.jsonl'));
    const residue = await writeOrg(memoryDir, 'org-json-residue');
    await fs.writeFile(path.join(residue, 'agent_org_communication_messages.json'), '{}');
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.listAdmitted('agent_team')).toEqual([]);
    expect(index.listAdmitted('agent_org')).toEqual([]);
    expect(index.listDiagnostics('agent_team')[0]).toMatchObject({ code: 'ROOT_RUN_PACKAGE_MANIFEST_INVALID',
      reason: 'Current package is missing required authorities: team_communication_messages.' });
    expect(index.listDiagnostics('agent_org')[0]).toMatchObject({ code: 'ROOT_RUN_PACKAGE_MANIFEST_INVALID',
      reason: 'Current package still contains retired root authorities: agent_org_communication_messages.json.' });
  });

  it('admits current packages that still carry a retained released records file without reading or touching it', async () => {
    const memoryDir = await temporaryMemory();
    const teamPackage = await writeTeam(memoryDir, 'team-retained-records');
    const orgPackage = await writeOrg(memoryDir, 'org-retained-records');
    const teamRecords = path.join(teamPackage, 'task_delegation_records.json');
    const orgRecords = path.join(orgPackage, 'agent_org_task_delegation_records.json');
    await fs.writeFile(teamRecords, '{"released":true}');
    await fs.writeFile(orgRecords, '{"released":true}');
    const before = await Promise.all([teamRecords, orgRecords].map((file) => fs.stat(file)));
    const index = new RootRunPackageReadinessIndex(memoryDir);
    await index.rebuild();
    expect(index.isAdmitted('agent_team', 'team-retained-records')).toBe(true);
    expect(index.isAdmitted('agent_org', 'org-retained-records')).toBe(true);
    const after = await Promise.all([teamRecords, orgRecords].map((file) => fs.stat(file)));
    expect(after.map((stat) => stat.mtimeMs)).toEqual(before.map((stat) => stat.mtimeMs));
    expect(await fs.readFile(teamRecords, 'utf8')).toBe('{"released":true}');
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
  'team_run_execution_tree.json', 'team_communication_messages_active.jsonl',
].map(async (name) => {
  const filePath = path.join(packagePath, name);
  const [bytes, stats] = await Promise.all([fs.readFile(filePath, 'base64'), fs.stat(filePath)]);
  return [name, { bytes, size: stats.size, mtimeMs: stats.mtimeMs, ino: stats.ino }];
})));
