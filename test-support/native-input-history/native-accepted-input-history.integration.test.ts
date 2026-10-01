import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { readFileSync, writeFileSync } from 'node:fs';
import { AgentInputUserMessage } from '../../autobyteus-ts/dist/agent/message/agent-input-user-message.js';
import { ContextFile } from '../../autobyteus-ts/dist/agent/message/context-file.js';
import { ContextFileType } from '../../autobyteus-ts/dist/agent/message/context-file-type.js';
import { SenderType } from '../../autobyteus-ts/dist/agent/sender-type.js';
import path from 'node:path';
import { createNativeRootFixture, HOST } from '../../autobyteus-server-ts/tests/integration/agent-run-collaboration/native-compaction-root-fixture';
import { eventually, summary } from '../../autobyteus-server-ts/tests/unit/agent-execution/recovery-native-fixture';
import { projectAgentCollaborationView } from '../../autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector';
import { toMemoryTraceEvent } from '../../autobyteus-server-ts/src/agent-memory/services/raw-trace-record-normalizer';
import { buildHistoricalReplayEvents } from '../../autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events';
import { buildRunProjectionBundleFromEvents } from '../../autobyteus-server-ts/src/run-history/projection/run-projection-utils';
import { dedupeRunProjectionConversationEntries } from '../../autobyteus-server-ts/src/run-history/projection/run-projection-dedupe';
import { AgentRootExecutionViewDtoSchema } from '@autobyteus/collaboration-stream-contracts';
import { stageAgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationHydration';
import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler';

const query = vi.hoisted(() => vi.fn());
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query }) }));
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({}) }));
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }));

// Narrow in-process integration. Real native producer/FIFO and real saved/live hydration;
// provisioning + model are controlled. No HTTP, packaged reload or provider-quality claim.
describe('native-produced saved history joins actual hosted pending input', () => {
  it.each(['agent', 'agent_team'] as const)('%s: held A / queued B remains one each across fresh hydration and recovery', async kind => {
    setActivePinia(createPinia());
    const f = await createNativeRootFixture(kind, false);
    let release: ((value: string) => void) | undefined;
    try {
      const connection = await f.connect();
      f.request();
      f.compress.mockRejectedValueOnce(new Error('controlled compaction failure'));
      const files = [
        new ContextFile('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="skyblue"/%3E%3C/svg%3E', ContextFileType.IMAGE, 'Preview image.svg'),
        new ContextFile('/evidence/report.txt', ContextFileType.TEXT, 'Original acceptance report.txt'),
      ];
      expect((await f.root.executeAgentCommand(f.run.runId, { kind: 'post_message', message: new AgentInputUserMessage(
        'A', SenderType.USER, files, { message_id: 'A', dedupe_key: 'input:A' },
      ) })).accepted).toBe(true);
      await eventually(() => f.native.getCompactionRecovery()?.state === 'awaiting_user');
      const held = f.run.getInputStateSnapshot();
      expect(held.entries.map(e => [e.message_id, e.state])).toEqual([['A', 'held']]);
      const rawPath = path.join(f.native.context.config.memoryDir!, 'raw_traces_active.jsonl');
      const serialized = readFileSync(rawPath, 'utf8');
      const rows = serialized.trim().split('\n').map(row => JSON.parse(row));
      const a = rows.filter(row => row.trace_type === 'user' && row.message_id === 'A');
      expect(a).toHaveLength(1);
      expect(a[0]).toMatchObject({ message_id: 'A', dedupe_key: 'input:A' });
      expect(a[0].id).not.toBe('A');
      expect(a[0].file_attachments).toEqual([{ uri: files[1].uri, file_type: 'text', file_name: files[1].fileName }]);
      expect(a[0].media.images).toEqual([files[0].uri]);
      const conversation = dedupeRunProjectionConversationEntries(buildRunProjectionBundleFromEvents(
        f.run.runId, buildHistoricalReplayEvents(rows.map(toMemoryTraceEvent)),
      ).conversation);
      const savedA = conversation.find(e => e.messageId === 'A')!;
      expect(savedA).toMatchObject({ kind: 'message', role: 'user', dedupeKey: 'input:A' });
      query.mockImplementation(async ({ variables }) => ({ data: { agentRunCollaborationMemberProjection: {
        agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
        conversation: variables.agentRunId === f.run.runId ? conversation : [], activities: [], hasEarlierActiveTraceEvents: false,
      } } }));
      const hydrate = async () => {
        const view = AgentRootExecutionViewDtoSchema.parse(projectAgentCollaborationView((await f.manager.getInspection(HOST))!)).root_agent;
        const staged = await stageAgentRunCollaborationContext({ hostRunId: HOST, view });
        staged.commitActivities();
        return staged.context.getAgentContext(f.run.runId)!;
      };
      for (let i = 0; i < 2; i++) {
        const ctx = await hydrate();
        expect(ctx.conversation.messages.filter(m => m.type === 'user' && m.text === 'A')).toMatchObject([
          { messageId: 'A', pendingInput: { state: 'held' }, timestamp: new Date(savedA.ts! * 1000) },
        ]);
      }
      expect(readFileSync(rawPath, 'utf8')).toBe(serialized);
      expect(f.run.getInputStateSnapshot()).toEqual(held);
      expect(f.parent.requests).toHaveLength(3);
      expect(f.compress).toHaveBeenCalledOnce();
      f.compress.mockRejectedValueOnce(new Error('second controlled compaction failure'));
      await f.send(connection.session, 'B');
      await eventually(() => f.native.getCompactionRecovery()?.state === 'awaiting_user' && f.compress.mock.calls.length === 2);
      const pending = f.run.getInputStateSnapshot();
      expect(pending.entries.map(e => [e.message_id, e.state])).toEqual([['A', 'held'], ['B', 'queued']]);
      const ctx = await hydrate();
      expect(ctx.conversation.messages.filter(m => m.type === 'user' && ['A', 'B'].includes(m.text))).toMatchObject([
        { messageId: 'A', pendingInput: { state: 'held' } }, { messageId: 'B', pendingInput: { state: 'queued' } },
      ]);
      expect((ctx.conversation.messages.find(m => m.type === 'user' && m.messageId === 'A') as any).contextFilePaths).toEqual(expect.arrayContaining([
        expect.objectContaining({ locator: files[0].uri, type: 'Image', displayName: 'Preview image.svg' }),
        expect.objectContaining({ locator: files[1].uri, displayName: files[1].fileName }),
      ]));
      // Optional local-check artifacts are newly produced by this test, never inputs/oracles.
      if (process.env.NATIVE_INPUT_CAPTURE_DIR) writeFileSync(path.join(process.env.NATIVE_INPUT_CAPTURE_DIR, `${kind}.json`), JSON.stringify({
        raw: rows, conversation, pending, messages: ctx.conversation.messages.filter(m => m.type === 'user' && ['A', 'B'].includes(m.text)),
      }, null, 2));
      expect(handleAgentInputState(pending, ctx)).toBe(false);
      expect(f.parent.requests).toHaveLength(3);
      // A genuinely new user C authorizes the next retry; no hydration command does.
      f.compress.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
      await f.send(connection.session, 'C');
      await eventually(() => !!release);
      release!(summary);
      await eventually(() => f.parent.requests.length === 6 && f.run.getInputStateSnapshot().entries.length === 0);
      handleAgentInputState(f.run.getInputStateSnapshot(), ctx);
      expect(ctx.conversation.messages.filter(m => m.type === 'user' && ['A', 'B'].includes(m.text))).toHaveLength(2);
      expect(ctx.conversation.messages.every(m => m.type !== 'user' || !m.pendingInput)).toBe(true);
      expect(f.parent.requests.slice(3).map(messages => messages.at(-1)?.content)).toEqual([a[0].content, 'B', 'C']);
      expect(f.forwarded.mock.calls.filter(([event]) => event.message.content === 'A')).toHaveLength(1);
      expect(f.forwarded.mock.calls.filter(([event]) => event.message.content === 'B')).toHaveLength(1);
      expect(f.compress).toHaveBeenCalledTimes(3);
    } finally { release?.(summary); await f.close(); }
  }, 20000);
});
