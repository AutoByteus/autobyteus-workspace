import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentOrgRunManager } from '../../../src/agent-org-execution/services/agent-org-run-manager.js';
import { AgentOrgRunExecutionTreeStore } from '../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { AgentOrgCommunicationMessagesStore } from '../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js';
import { AgentOrgExecutionTreeLocationService } from '../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js';
import { AgentOrgMemberRunViewProjectionService } from '../../../src/run-history/services/agent-org-member-run-view-projection-service.js';
import { projectAgentOrgExecutionSnapshot } from '../../../src/services/agent-streaming/agent-org-execution-view-projector.js';
import { testAgentOrgExecutionTree, testOrgAgentNode } from '../../fixtures/current-agent-org-run-fixtures.js';

const dirs: string[] = [];
afterEach(async () => { for (const dir of dirs.splice(0)) await fs.rm(dir, { recursive: true, force: true }); });
const fixture = async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'org-inspection-')); dirs.push(memoryDir);
  const dir = path.join(memoryDir, 'agent_orgs', 'org');
  const tree = structuredClone(testAgentOrgExecutionTree({ orgRunId: 'org', members: [
    { ...testOrgAgentNode('/assistant', 'configured'), platformAgentRunId: 'configured-provider' },
  ] }));
  const messages = { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org', messages: [] };
  await new AgentOrgRunExecutionTreeStore().write(dir, tree);
  await new AgentOrgCommunicationMessagesStore().write(dir, messages as never);
  const build = vi.fn();
  const manager = new AgentOrgRunManager({ delegationIndex: noDelegations(), taskRecords: openTaskRecords(), memoryDir, scopeBuilder: { build } as never });
  return { memoryDir, dir, tree, messages, manager, build };
};

describe('strict read-only Org inspection', () => {
  it('reads the stored tree without repair, activation, or writes and emits offline base-zero truth', async () => {
    const f = await fixture();
    const before = await Promise.all((await fs.readdir(f.dir)).map(async (name) => [name, await fs.readFile(path.join(f.dir, name), 'utf8')]));
    const result = await f.manager.getInspection('org');
    const dto = projectAgentOrgExecutionSnapshot(result);
    expect(result).toMatchObject({ isActive: false, baseChangeSequence: 0, liveSequenceId: null, lastMessageChangeSequence: null });
    // autobyteus-358: the view reads the tree only; the messages are read through the records owner.
    expect(result.snapshot).not.toHaveProperty('messages');
    expect(result.snapshot).not.toHaveProperty('tasks');
    expect((await f.manager.getCollaborationRecordsSnapshot('org')).messages).toEqual(f.messages);
    // Its own parts only: the runs its agents delegated are its tree's rows (SR-084); nothing is hosted.
    expect(dto.root_org.execution_tree.rootOrg).not.toHaveProperty('taskExecutions');
    expect(await fs.readdir(f.dir)).not.toContain('agent_org_task_delegation_records.json');
    expect(dto.root_org.agent_statuses).toEqual([]);
    expect(f.manager.getActive('org')).toBeNull();
    expect(f.build).not.toHaveBeenCalled();
    for (const [name, content] of before) expect(await fs.readFile(path.join(f.dir, name!), 'utf8')).toBe(content);
  });

  it('rejects an unavailable package; a damaged log fails only the message read, and the view still opens (AC-006)', async () => {
    const f = await fixture();
    await expect(f.manager.getInspection('missing')).rejects.toThrow('unavailable');
    await expect(f.manager.getCollaborationRecordsSnapshot('missing')).rejects.toThrow('not found');
    const file = (await fs.readdir(f.dir)).find((name) => name.includes('communication'))!;
    // A complete malformed line (an unfinished last line would be ignored by design, REQ-005).
    await fs.writeFile(path.join(f.dir, file), '{broken\n');
    await expect(f.manager.getInspection('org')).resolves.toMatchObject({ orgRunId: 'org', isActive: false });
    await expect(f.manager.getCollaborationRecordsSnapshot('org')).rejects.toThrow();
    expect(await fs.readFile(path.join(f.dir, file), 'utf8')).toBe('{broken\n');
    expect(f.build).not.toHaveBeenCalled();
  });

  it('validates the stored log with the tree when the messages are read (autobyteus-358)', async () => {
    const f = await fixture();
    const file = (await fs.readdir(f.dir)).find((name) => name.includes('communication'))!;
    await new AgentOrgCommunicationMessagesStore().write(f.dir, { ...f.messages, messages: [{
      messageId: 'm-self', senderAgentRunId: 'configured', receiverAgentRunId: 'configured', content: 'hi',
      messageType: 'agent_message', referenceFiles: [], createdAt: '2026-11-01T00:00:00.000Z',
    }] } as never);
    expect(file).toBeTruthy();
    await expect(f.manager.getInspection('org')).resolves.toMatchObject({ orgRunId: 'org' });
    await expect(f.manager.getCollaborationRecordsSnapshot('org')).rejects.toThrow(/distinct AgentRun endpoints/);
  });

});

it('serializes inspection behind pending termination and never starts another scope', async () => {
  const { ActiveCollaborationRootDirectory } = await import('../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js');
  const { createAgentOrgRootExecutionIdentity } = await import('../../../src/agent-collaboration/execution/domain/root-execution-identity.js');
  const f = await fixture();
  let finish!: () => void;
  let enter!: () => void;
  const entered = new Promise<void>((resolve) => { enter = resolve; });
  const held = new Promise<void>((resolve) => { finish = resolve; });
  let active = true;
  const openPackageSnapshotConnection = vi.fn();
  const build = vi.fn(async () => ({ orgRunId: 'org', rootIdentity: createAgentOrgRootExecutionIdentity('org'),
    isActive: () => active, openPackageSnapshotConnection, hasAgentExecution: vi.fn(() => false), remoteNodeOf: () => null, ownsAgentRun: vi.fn(() => false), deliverExactAgentMessage: vi.fn(),
    terminate: async () => { enter(); await held; active = false; return { accepted: true }; },
  }));
  const manager = new AgentOrgRunManager({ delegationIndex: noDelegations(), taskRecords: openTaskRecords(), memoryDir: f.memoryDir, scopeBuilder: { build } as never,
    activeRootDirectory: new ActiveCollaborationRootDirectory() });
  await manager.create(testAgentOrgExecutionTree({ orgRunId: 'org', members: [testOrgAgentNode('/assistant', 'configured')] }));
  const stopping = manager.terminate('org'); await entered;
  let inspected = false;
  const reading = manager.getInspection('org').then((view) => { inspected = true; return view; });
  await Promise.resolve(); await Promise.resolve();
  expect(inspected).toBe(false);
  expect(openPackageSnapshotConnection).not.toHaveBeenCalled();
  finish(); expect(await stopping).toBe(true);
  expect(await reading).toMatchObject({ isActive: false, baseChangeSequence: 0, liveSequenceId: null, lastMessageChangeSequence: null });
  expect(build).toHaveBeenCalledOnce();
});

it('distinguishes a real empty local member trace from a physical read failure without provider activation', async () => {
  const { AgentRunViewProjectionService } = await import('../../../src/run-history/services/agent-run-view-projection-service.js');
  const { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } = await import('autobyteus-ts/memory/store/memory-file-names.js');
  const f = await fixture();
  const service = new AgentOrgMemberRunViewProjectionService({ tree: noDelegations(), peerRunOf: () => null, memoryDir: f.memoryDir,
    agentRunViewProjectionService: new AgentRunViewProjectionService(f.memoryDir),
    locations: new AgentOrgExecutionTreeLocationService({ memoryDir: f.memoryDir }) });
  await expect(service.getProjection('org', '/assistant', 'configured')).resolves.toMatchObject({ conversation: [], activities: [] });
  await fs.mkdir(path.join(f.dir, 'configured', RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), { recursive: true });
  await expect(service.getProjection('org', '/assistant', 'configured')).rejects.toThrow();
  expect(f.build).not.toHaveBeenCalled();
});
