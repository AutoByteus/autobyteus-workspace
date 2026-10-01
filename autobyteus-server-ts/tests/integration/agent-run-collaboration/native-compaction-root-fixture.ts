import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, vi } from 'vitest';
import { AgentDefinition } from '../../../src/agent-definition/domain/models.js';
import { AgentTeamDefinition, TeamMember } from '../../../src/agent-team-definition/domain/agent-team-definition.js';
import { createCollaboratorMentionAdmission } from '../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js';
import { ActiveCollaborationRootDirectory } from '../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js';
import { RootedAgentMemoryLocator } from '../../../src/agent-collaboration/execution/services/rooted-agent-memory-locator.js';
import { AgentRunCollaborationRootManager } from '../../../src/agent-run-collaboration/services/agent-run-collaboration-root-manager.js';
import { FlatTeamExecutionFactory } from '../../../src/agent-team-execution/local/flat-team-execution-factory.js';
import { createTaskExecutionIdentityCapabilities } from '../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js';
import { AgentCollaborationStreamHandler } from '../../../src/services/agent-streaming/agent-collaboration-stream-handler.js';
import { CollaborationStreamServerMessageSchema } from '@autobyteus/collaboration-stream-contracts';
import type { AgentRun } from '../../../src/agent-execution/domain/agent-run.js';
import { createRecoveryFixture } from '../../unit/agent-execution/recovery-native-fixture.js';

export const HOST = 'native-compaction-host';

/**
 * Only provisioning, host and model behavior are fixtures. The prepared native run has
 * three ordinary seed turns before it is published to the real configured handle.
 * Root admission, persisted membership, Agent/Team handles, stream command parsing,
 * input FIFO, core recovery and root snapshot/event publication are production code.
 * No HTTP transport, provider inference, host runtime or renderer is implied.
 */
export async function createNativeRootFixture(kind: 'agent' | 'agent_team', postResponse: boolean) {
  const native = await createRecoveryFixture(postResponse);
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'native-root-compaction-'));
  const agents = ['host', 'reviewer', 'lead', 'peer'].map(id =>
    new AgentDefinition({ id, name: id, description: id, instructions: 'Keep scope.' }));
  const team = new AgentTeamDefinition({
    id: 'team', name: 'team', description: 'team', instructions: 'Work together.',
    nodes: ['lead', 'peer'].map(id => new TeamMember({ memberName: id, ref: id, refScope: 'shared' })),
    coordinatorMemberName: 'lead', handoffs: [],
  });
  const catalog = {
    listAgentDefinitions: async () => agents,
    listTeamDefinitions: async () => [team],
    getAgentDefinition: async (id: string) => agents.find(a => a.id === id) ?? null,
    getTeamDefinition: async (id: string) => id === 'team' ? team : null,
  };
  const active = new Map<string, AgentRun>();
  const prepare = vi.fn(async ({ runId }: { runId: string }) => {
    expect(runId).toBe(native.run.runId);
    return { runId, runtimeKind: 'autobyteus', platformAgentRunId: null,
      commitPublication: () => { active.set(runId, native.run); return native.run; },
      abort: async () => ({ kind: 'aborted' }) };
  });
  const runManager = {
    prepareNewAgentRun: prepare,
    getActiveRun: (id: string) => active.get(id) ?? null,
    prepareAgentRunTermination: (run: AgentRun) => run.prepareTermination(),
  };
  const memoryLocator = new RootedAgentMemoryLocator({ memoryDir });
  const hostRun = { runId: HOST, isActive: () => true, publishEvent: vi.fn() };
  const restoreHost = vi.fn(async () => hostRun);
  const metadata = {
    runId: HOST, agentDefinitionId: 'host', memoryDir: path.join(memoryDir, 'agents', HOST),
    workspaceRootPath: null, llmModelIdentifier: 'parent', llmConfig: null,
    autoExecuteTools: false, runtimeKind: 'autobyteus', platformAgentRunId: null,
    startedAt: '2026-10-01T00:00:00.000Z',
  };
  const manager = new AgentRunCollaborationRootManager({
    memoryDir, activeRootDirectory: new ActiveCollaborationRootDirectory(),
    definitions: { getAgentDefinitionById: catalog.getAgentDefinition },
    host: {
      getActiveRun: () => hostRun as unknown as AgentRun,
      resolveCommandReadyAgentRun: restoreHost as never,
      readMetadata: async () => metadata as never,
      recordCollaborationPackageCreated: async () => {},
    },
    rootDependencies: {
      agentRunManager: runManager as never,
      memoryLocator,
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ agentRunManager: runManager as never, memoryLocator }),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({
        allocateForAgentDefinition: async id =>
          id === (kind === 'agent' ? 'reviewer' : 'lead') ? native.run.runId : 'dormant-' + id,
      }),
      teamDefinitions: { getDefinitionById: catalog.getTeamDefinition },
      collaboratorAdmission: createCollaboratorMentionAdmission(catalog, {
        validateMany: async (inputs: unknown[]) => inputs.map(() => ({
          kind: 'valid', selection: { llmModelIdentifier: 'parent', llmConfig: null },
        })),
      } as never),
    },
  });
  const root = (await manager.ensureRoot(metadata as never))!;
  expect((await root.admitCollaboratorMentions({
    focusedAgentRunId: HOST, content: 'Please help',
    mentions: [{ kind, definitionId: kind === 'agent' ? 'reviewer' : 'team' }],
  })).admitted).toBe(true);
  const handler = new AgentCollaborationStreamHandler(manager);
  const sessions = new Set<string>();
  const connect = async () => {
    const frames: ReturnType<typeof CollaborationStreamServerMessageSchema.parse>[] = [];
    const session = await handler.connect({
      send: value => { frames.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(value))); },
      close: vi.fn(),
    }, HOST);
    expect(session, JSON.stringify(frames)).toBeTruthy();
    sessions.add(session!);
    return { session: session!, frames };
  };
  const send = (session: string, text: string) => handler.handleMessage(session, JSON.stringify({
    type: 'SEND_MESSAGE', payload: {
      root_subject_kind: 'agent', root_run_id: HOST, target_agent_run_id: native.run.runId,
      command_id: 'command-' + text, content: text, message_id: text, dedupe_key: 'input:' + text,
      context_file_paths: [], image_urls: [],
    },
  }));
  return { ...native, manager, root, prepare, runManager, restoreHost, connect, send,
    disconnect: (session: string) => { handler.disconnect(session); sessions.delete(session); },
    close: async () => {
      for (const session of sessions) handler.disconnect(session);
      try { await manager.terminateRoot(HOST); }
      finally { await native.close(); await fs.rm(memoryDir, { recursive: true, force: true }); }
    },
  };
}
