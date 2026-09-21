import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentOrgRunManager } from '../../../src/agent-org-execution/services/agent-org-run-manager.js';
import { AgentOrgRunExecutionTreeStore } from '../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { AgentOrgTaskDelegationRecordsV1Store } from '../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js';
import { AgentOrgCommunicationMessagesV1Store } from '../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js';
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
  tree.rootOrg.taskExecutions = [{ address: '/assistant', agentRunId: 'task-run', platformAgentRunId: 'task-provider',
    startedAt: tree.createdAt, settledAt: '2026-09-01T00:01:00.000Z' }];
  const tasks = { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org', records: [{
    taskId: 'task', delegatorAgentRunId: 'configured', recipientAddress: '/assistant', taskExecution: { agentRunId: 'task-run' },
    description: 'Inspect retained work', referenceFiles: [], status: 'interrupted', updates: [{
      interruptionId: 'stop', reason: 'Root stopped', createdAt: '2026-09-01T00:01:00.000Z',
    }], createdAt: tree.createdAt,
  }] };
  const messages = { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org', messages: [] };
  await new AgentOrgRunExecutionTreeStore().write(dir, tree);
  await new AgentOrgTaskDelegationRecordsV1Store().write(dir, tasks as never);
  await new AgentOrgCommunicationMessagesV1Store().write(dir, messages as never);
  const build = vi.fn();
  const manager = new AgentOrgRunManager({ memoryDir, scopeBuilder: { build } as never });
  return { memoryDir, dir, tree, tasks, manager, build };
};

describe('strict read-only Org inspection', () => {
  it('reads retained tasks without repair, activation, or writes and emits offline base-zero truth', async () => {
    const f = await fixture();
    const before = await Promise.all((await fs.readdir(f.dir)).map(async (name) => [name, await fs.readFile(path.join(f.dir, name), 'utf8')]));
    const result = await f.manager.getInspection('org');
    const dto = projectAgentOrgExecutionSnapshot(result);
    expect(result).toMatchObject({ isActive: false, baseChangeSequence: 0, snapshot: { tasks: f.tasks } });
    expect(dto.root_org.agent_statuses).toEqual([]);
    expect(f.manager.getActive('org')).toBeNull();
    expect(f.build).not.toHaveBeenCalled();
    for (const [name, content] of before) expect(await fs.readFile(path.join(f.dir, name!), 'utf8')).toBe(content);
  });

  it('rejects unavailable/corrupt packages instead of manufacturing an empty inspection', async () => {
    const f = await fixture();
    await expect(f.manager.getInspection('missing')).rejects.toThrow('unavailable');
    const file = (await fs.readdir(f.dir)).find((name) => name.includes('task'))!;
    await fs.writeFile(path.join(f.dir, file), '{broken');
    await expect(f.manager.getInspection('org')).rejects.toThrow();
    expect(await fs.readFile(path.join(f.dir, file), 'utf8')).toBe('{broken');
    expect(f.build).not.toHaveBeenCalled();
  });

  it('uses the task execution binding and physical path, with source configuration only', async () => {
    const f = await fixture();
    const locations = new AgentOrgExecutionTreeLocationService({ memoryDir: f.memoryDir,
      manager: { getActive: () => ({ getExecutionTreeSnapshot: () => f.tree }), listActiveOrgRunIds: () => ['org'] } as never });
    const exact = await locations.findAgent({ rootRunId: 'org', agentRunId: 'task-run', memberAddress: '/assistant' });
    expect(exact).toMatchObject({ agentRunId: 'task-run', platformAgentRunId: 'task-provider', isActive: false,
      configuredPlacement: { agentRunId: 'configured', platformAgentRunId: 'configured-provider' },
      memoryDir: path.join(f.dir, 'task-run') });
    const getRequiredProjectionFromMetadata = vi.fn(async (input) => ({ runId: input.runId, conversation: [], activities: [],
      summary: null, lastActivityAt: null, hasEarlierActiveTraceEvents: false }));
    const service = new AgentOrgMemberRunViewProjectionService({ memoryDir: f.memoryDir, locations,
      agentRunViewProjectionService: { getRequiredProjectionFromMetadata } as never });
    await expect(service.getProjection('org', '/assistant', 'task-run')).resolves.toMatchObject({ agentRunId: 'task-run', conversation: [] });
    expect(getRequiredProjectionFromMetadata).toHaveBeenCalledWith({ runId: 'task-run', metadata: expect.objectContaining({
      platformAgentRunId: 'task-provider', agentDefinitionId: 'definition-configured', memoryDir: path.join(f.dir, 'task-run'),
    }) });
    getRequiredProjectionFromMetadata.mockRejectedValueOnce(new Error('unreadable trace'));
    await expect(service.getProjection('org', '/assistant', 'task-run')).rejects.toThrow('unreadable trace');
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
    isActive: () => active, openPackageSnapshotConnection, deliverExactAgentMessage: vi.fn(),
    terminate: async () => { enter(); await held; active = false; return { accepted: true }; },
  }));
  const manager = new AgentOrgRunManager({ memoryDir: f.memoryDir, scopeBuilder: { build } as never,
    activeRootDirectory: new ActiveCollaborationRootDirectory() });
  await manager.create(testAgentOrgExecutionTree({ orgRunId: 'org', members: [testOrgAgentNode('/assistant', 'configured')] }));
  const stopping = manager.terminate('org'); await entered;
  let inspected = false;
  const reading = manager.getInspection('org').then((view) => { inspected = true; return view; });
  await Promise.resolve(); await Promise.resolve();
  expect(inspected).toBe(false);
  expect(openPackageSnapshotConnection).not.toHaveBeenCalled();
  finish(); expect(await stopping).toBe(true);
  expect(await reading).toMatchObject({ isActive: false, baseChangeSequence: 0 });
  expect(build).toHaveBeenCalledOnce();
});

it('does not substitute the configured external binding for a nullable actual task binding', async () => {
  const f = await fixture();
  f.tree.rootOrg.taskExecutions[0]!.platformAgentRunId = null;
  await new AgentOrgRunExecutionTreeStore().write(f.dir, f.tree);
  const location = await new AgentOrgExecutionTreeLocationService({ memoryDir: f.memoryDir })
    .findAgent({ rootRunId: 'org', agentRunId: 'task-run', memberAddress: '/assistant' });
  expect(location).toMatchObject({ platformAgentRunId: null, configuredPlacement: { platformAgentRunId: 'configured-provider' } });
});

it('distinguishes a real empty local task trace from a physical read failure without provider activation', async () => {
  const { AgentRunViewProjectionService } = await import('../../../src/run-history/services/agent-run-view-projection-service.js');
  const { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } = await import('autobyteus-ts/memory/store/memory-file-names.js');
  const f = await fixture();
  const service = new AgentOrgMemberRunViewProjectionService({ memoryDir: f.memoryDir,
    agentRunViewProjectionService: new AgentRunViewProjectionService(f.memoryDir),
    locations: new AgentOrgExecutionTreeLocationService({ memoryDir: f.memoryDir }) });
  await expect(service.getProjection('org', '/assistant', 'task-run')).resolves.toMatchObject({ conversation: [], activities: [] });
  await fs.mkdir(path.join(f.dir, 'task-run', RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), { recursive: true });
  await expect(service.getProjection('org', '/assistant', 'task-run')).rejects.toThrow();
  expect(f.build).not.toHaveBeenCalled();
});
