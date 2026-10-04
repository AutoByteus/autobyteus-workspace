import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, vi } from 'vitest';
import { AgentDefinition } from '../../../src/agent-definition/domain/models.js';
import { AgentTeamDefinition, TeamMember } from '../../../src/agent-team-definition/domain/agent-team-definition.js';
import { createCollaboratorAdmission } from '../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js';
import { ActiveCollaborationRootDirectory } from '../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js';
import { RootedAgentMemoryLocator } from '../../../src/agent-collaboration/execution/services/rooted-agent-memory-locator.js';
import { StandaloneAgentRunRootManager } from '../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js';
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
  let memoryDir: string | undefined;
  let manager: StandaloneAgentRunRootManager | undefined;
  let handler: AgentCollaborationStreamHandler | undefined;
  const sessions = new Set<string>();
  const close = async () => {
    const errors: unknown[] = [];
    for (const session of sessions) {
      try { handler?.disconnect(session); } catch (error) { errors.push(error); }
    }
    sessions.clear();
    try { await manager?.endRoot(HOST); } catch (error) { errors.push(error); }
    try { await native.close(); } catch (error) { errors.push(error); }
    if (memoryDir) {
      try { await fs.rm(memoryDir, { recursive: true, force: true }); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, 'Native root fixture cleanup failed');
  };
  try {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'native-root-compaction-'));
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
    const metadata = {
      runId: HOST, agentDefinitionId: 'host', memoryDir: path.join(memoryDir, 'agents', HOST),
      workspaceRootPath: null, llmModelIdentifier: 'parent', llmConfig: null,
      autoExecuteTools: false, runtimeKind: 'autobyteus', platformAgentRunId: null,
      startedAt: '2026-10-01T00:00:00.000Z',
    };
    const restoreHost = vi.fn(async () => ({ run: hostRun as unknown as AgentRun, metadata: metadata as never }));
    const terminateHost = vi.fn(async () => ({ outcome: 'not_active' as const, runtimeKind: null }));
    manager = new StandaloneAgentRunRootManager({
      memoryDir, activeRootDirectory: new ActiveCollaborationRootDirectory(),
      definitions: { getAgentDefinitionById: catalog.getAgentDefinition },
      host: {
        getActiveRun: () => hostRun as unknown as AgentRun,
        activateHost: restoreHost,
        terminateHost,
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
        collaboratorAdmission: createCollaboratorAdmission(catalog, {
          validateMany: async (inputs: unknown[]) => inputs.map(() => ({
            kind: 'valid', selection: { llmModelIdentifier: 'parent', llmConfig: null },
          })),
        } as never),
      },
    });
    const root = (await manager.resolveRoot(HOST))!;
    expect((await root.admitCollaboratorMentions({
      focusedAgentRunId: HOST, content: 'Please help',
      mentions: [{ kind, definitionId: kind === 'agent' ? 'reviewer' : 'team' }],
    })).admitted).toBe(true);
    handler = new AgentCollaborationStreamHandler(manager);
    const streamHandler = handler;
    const rootManager = manager;
    const connect = async () => {
      const frames: ReturnType<typeof CollaborationStreamServerMessageSchema.parse>[] = [];
      const session = await streamHandler.connect({
        send: value => { frames.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(value))); },
        close: vi.fn(),
      }, HOST);
      expect(session, JSON.stringify(frames)).toBeTruthy();
      sessions.add(session!);
      return { session: session!, frames };
    };
    const send = (session: string, text: string) => streamHandler.handleMessage(session, JSON.stringify({
      type: 'SEND_MESSAGE', payload: {
        root_subject_kind: 'agent', root_run_id: HOST, target_agent_run_id: native.run.runId,
        command_id: 'command-' + text, content: text, message_id: text, dedupe_key: 'input:' + text,
        context_file_paths: [], image_urls: [],
      },
    }));
    return { ...native, manager: rootManager, root, prepare, runManager, restoreHost, terminateHost, connect, send,
      rootMemoryDir: memoryDir,
      disconnect: (session: string) => { streamHandler.disconnect(session); sessions.delete(session); },
      close,
    };
  } catch (error) {
    try { await close(); }
    catch (cleanupError) { console.error('Native root fixture setup cleanup failed; preserving setup error', cleanupError); }
    throw error;
  }
}
