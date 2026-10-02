import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { buildSchema } from 'type-graphql';
import { createRequire } from 'node:module';
import type { graphql as graphqlFn } from 'graphql';
const require = createRequire(import.meta.url);
const { graphql } = require('graphql') as { graphql: typeof graphqlFn };
import { AgentRunCollaborationResolver } from '../../../src/api/graphql/types/agent-run-collaboration.js';
import { AgentRunCollaborationRootManager } from '../../../src/agent-run-collaboration/services/agent-run-collaboration-root-manager.js';
import { AgentRootExecutionViewDtoSchema } from '@autobyteus/collaboration-stream-contracts';
import { projectAgentCollaborationView } from '../../../src/services/agent-streaming/agent-collaboration-view-projector.js';
import { eventually, summary } from '../../unit/agent-execution/recovery-native-fixture.js';
import { createNativeRootFixture, HOST } from './native-compaction-root-fixture.js';

describe('native recovery through admitted Agent-root collaborators', () => {
  for (const kind of ['agent', 'agent_team'] as const) {
    it.each([false, true])(`${kind}: reconnect preserves live input identity without replay (postResponse=%s)`, async postResponse => {
      const f = await createNativeRootFixture(kind, postResponse);
      let mainError: unknown;
      try {
        const first = await f.connect();
        const dormant = AgentRootExecutionViewDtoSchema.parse(projectAgentCollaborationView((await f.manager.getInspection(HOST))!));
        expect(dormant.root_agent.agent_input_states).toEqual([]);
        expect(dormant.root_agent.agent_statuses).toHaveLength(kind === 'agent' ? 1 : 2);
        expect(dormant.root_agent.agent_statuses.every(s => s.status === 'offline' && s.recoverableBlock === null)).toBe(true);
        expect(f.prepare).not.toHaveBeenCalled();
        if (!postResponse) f.request();
        f.compress.mockRejectedValueOnce(new Error('controlled compression exhaustion'));
        await f.send(first.session, 'A');
        await eventually(() => f.native.getCompactionRecovery()?.state === 'awaiting_user'
          && (!postResponse || (f.native.context.state.activeTurn === null && f.run.getInputStateSnapshot().entries.length === 0)));
        const held = f.run.getInputStateSnapshot();
        expect(held.entries.map(e => [e.message_id, e.state])).toEqual(postResponse ? [] : [['A', 'held']]);
        expect(f.parent.requests).toHaveLength(postResponse ? 4 : 3);
        let release!: (value: string) => void;
        f.compress.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
        await f.send(first.session, 'B');
        await eventually(() => !!release);
        const pending = f.run.getInputStateSnapshot();
        expect(pending.entries.map(e => e.message_id)).toEqual(postResponse ? ['B'] : ['A', 'B']);
        f.disconnect(first.session);
        const second = await f.connect();
        const frame = second.frames.find(frame => frame.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT');
        expect(frame?.type).toBe('ROOT_EXECUTION_VIEW_SNAPSHOT');
        if (frame?.type !== 'ROOT_EXECUTION_VIEW_SNAPSHOT') throw new Error('missing snapshot');
        const view = AgentRootExecutionViewDtoSchema.parse(frame.payload).root_agent;
        expect(view.agent_input_states).toEqual([{ agent_run_id: f.run.runId, state: pending }]);
        expect(view.agent_statuses.find(s => s.agent_run_id === f.run.runId)?.recoverableBlock).toEqual(pending.recoverableBlock);
        expect(view.agent_input_states.some(s => s.agent_run_id === HOST)).toBe(false);
        expect(f.prepare).toHaveBeenCalledOnce();
        release(summary);
        await eventually(() => f.parent.requests.length === 5 && f.run.getInputStateSnapshot().entries.length === 0);
        expect(f.parent.requests.slice(3).map(messages => messages.at(-1)?.content)).toEqual(['A', 'B']);
        expect(f.forwarded.mock.calls.filter(([event]) => event.message.content === 'A')).toHaveLength(1);
        expect(f.forwarded.mock.calls.filter(([event]) => event.message.content === 'B')).toHaveLength(1);
        expect(f.compress).toHaveBeenCalledTimes(2); // substitute strategy calls, not generation attempts
        expect(second.frames.filter(frame => frame.type === 'ERROR')).toEqual([]);
        const final = AgentRootExecutionViewDtoSchema.parse(projectAgentCollaborationView((await f.manager.getInspection(HOST))!)).root_agent;
        expect(final.agent_input_states[0]?.state.entries).toEqual([]);
        expect(f.prepare).toHaveBeenCalledOnce();
      } catch (error) { mainError = error; }
      try { await f.close(); } catch (cleanupError) {
        if (mainError) throw new AggregateError([mainError, cleanupError], 'Main assertion and root cleanup both failed');
        throw cleanupError;
      }
      if (mainError) throw mainError;
    }, 20000);
  }
});

describe('native Agent-root inspection and stop boundaries', () => {
  for (const kind of ['agent', 'agent_team'] as const) {
    it(`${kind}: GraphQL dormant and stored reads are strict and never activate a child/host`, async () => {
      const f = await createNativeRootFixture(kind, false);
      const singleton = vi.spyOn(AgentRunCollaborationRootManager, 'getInstance').mockReturnValue(f.manager);
      try {
        const schema = await buildSchema({ resolvers: [AgentRunCollaborationResolver], validate: false });
        const query = async () => {
          const result = await graphql({ schema, source: 'query($id:String!){agentRunCollaboration(runId:$id)}', variableValues: { id: HOST } });
          expect(result.errors).toBeUndefined();
          return AgentRootExecutionViewDtoSchema.parse(result.data?.agentRunCollaboration).root_agent;
        };
        const dormant = await query();
        expect(dormant.agent_statuses).toHaveLength(kind === 'agent' ? 1 : 2);
        expect(dormant.agent_statuses.every(s => s.status === 'offline' && s.recoverableBlock === null)).toBe(true);
        expect(dormant.agent_input_states).toEqual([]);
        expect(await f.manager.terminateRoot(HOST)).toBe(true);
        const stored = await query();
        expect(stored.is_active).toBe(false);
        expect(stored.agent_input_states).toEqual([]);
        expect(stored.execution_tree.collaborators).toEqual(dormant.execution_tree.collaborators);
        expect(f.prepare).not.toHaveBeenCalled();
        expect(f.restoreHost).not.toHaveBeenCalled();
        expect(f.parent.requests).toHaveLength(3); // test-only seed setup, no read-triggered work
      } finally { singleton.mockRestore(); await f.close(); }
    }, 20000);

    it.each([false, true])(`${kind}: root Stop cancels recovery without dispatch (postResponse=%s)`, async postResponse => {
      const f = await createNativeRootFixture(kind, postResponse);
      try {
        const connection = await f.connect();
        if (!postResponse) f.request();
        f.compress.mockRejectedValueOnce(new Error('controlled compression exhaustion'));
        await f.send(connection.session, 'A');
        await eventually(() => f.native.getCompactionRecovery()?.state === 'awaiting_user'
          && (!postResponse || (f.native.context.state.activeTurn === null && f.run.getInputStateSnapshot().entries.length === 0)));
        expect(await f.manager.terminateRoot(HOST)).toBe(true);
        expect(f.native.isRunning).toBe(false);
        expect(f.run.getInputStateSnapshot().entries).toEqual([]);
        expect(f.parent.requests).toHaveLength(postResponse ? 4 : 3);
        expect(f.compress).toHaveBeenCalledOnce();
        expect(f.manager.getActive(HOST)).toBeNull();
      } finally { await f.close(); }
    }, 20000);
  }
});
