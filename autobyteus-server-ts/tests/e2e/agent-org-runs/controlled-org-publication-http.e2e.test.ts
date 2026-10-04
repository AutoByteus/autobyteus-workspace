import 'reflect-metadata';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AgyRuntimeErrorFixture, until } from '../helpers/agy-runtime-error-fixture.js';

// TESTING.md's real HTTP/WS server with a scripted CLI; no paid/provider inference.
// The CLI calls actual scoped MCP tools, not fabricated successful tool events.
// This is NOT the exact Codex/GPT-6.1 Sol packaged or performance proof.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? '';
const enabled = process.env.RUN_AGY_FAILURE_E2E === '1'
  && spawnSync(cli, ['--version'], { stdio: 'ignore' }).status === 0;
const suite = enabled ? describe : describe.skip;

suite('controlled agent drives Org publication through real public boundaries', () => {
  const fixture = new AgyRuntimeErrorFixture();
  beforeAll(() => fixture.start(), 60000);
  afterAll(() => fixture.close(), 60000);

  it('keeps collaborator/task identities, communication references, checkpoint and conversation through fresh reads, reconnect and Stop/restore', async () => {
    const run = await fixture.create('org', 'linked_skills');
    const other = await fixture.create('org', 'linked_skills');
    const helperId = (await fixture.graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: 'publication-helper-' + randomUUID(), description: 'Owned publication helper',
        instructions: 'Reply OK to ordinary requests.', toolNames: [] } })).createAgentDefinition.id;
    const read = async () => (await fixture.graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){root_run_id is_active org}}`,
      { id: run.rootId })).getAgentOrgRootHistory;
    const checkpoint = async () => (await fixture.graphql(`query($id:String!){getAgentOrgExecutionCheckpoint(orgRunId:$id){changeSequence hasOpenExecutionWork}}`,
      { id: run.rootId })).getAgentOrgExecutionCheckpoint;
    const stream = await fixture.connect(run);
    const send = async (content: string, extra = {}) => {
      const commandId = randomUUID();
      const before = stream.projected().filter(f => f.type === 'TURN_COMPLETED').length;
      stream.socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: {
        root_subject_kind: 'agent_org', root_run_id: run.rootId, target_agent_run_id: run.runId,
        command_id: commandId, message_id: randomUUID(), dedupe_key: randomUUID(), content,
        context_file_paths: [], image_urls: [], ...extra,
      } }));
      await until(() => stream.frames.some(f => f.type === 'AGENT_COMMAND_ACK' && f.payload.command_id === commandId), 'correlated command ACK');
      const ack = stream.frames.find(f => f.type === 'AGENT_COMMAND_ACK' && f.payload.command_id === commandId)!;
      expect(ack.payload.state, JSON.stringify(ack)).toBe('accepted');
      await until(() => stream.projected().filter(f => f.type === 'TURN_COMPLETED').length > before, 'emulated actor turn completed');
      return ack;
    };
    const call = (name: string, args: object) => send('CALL_TOOL:' + JSON.stringify({ name, arguments: args }));
    const baseline = await checkpoint();
    const candidates = (await fixture.graphql(`query($id:String!){collaboratorMentionCandidates(rootSubjectKind:"agent_org",rootRunId:$id){availability candidates{kind definitionId}}}`,
      { id: run.rootId })).collaboratorMentionCandidates;
    expect(candidates.availability).toBe('AVAILABLE');
    expect(candidates.candidates).toContainEqual({ kind: 'agent', definitionId: helperId });
    await send('Please include the helper.', { mentions: [{ kind: 'agent', definition_id: helperId }] });
    const admitted = await read();
    const collaborator = admitted.org.rootOrg.collaborators.find((c: any) => c.agentDefinitionId === helperId);
    expect(collaborator).toMatchObject({ kind: 'agent', addedViaAgentRunId: run.runId,
      launchConfiguration: { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low' } });
    expect(collaborator.agentRunId).toMatch(/_[0-9a-f]{32}$/);
    expect(stream.frames.some(f => f.type === 'ROOT_EXECUTION_EVENT' && f.payload.event.kind === 'collaborator_added'
      && f.payload.event.collaborator.agentRunId === collaborator.agentRunId)).toBe(true);
    const afterAdmission = await checkpoint();
    expect(afterAdmission.changeSequence).toBeGreaterThan(baseline.changeSequence);
    const remaining = (await fixture.graphql(`query($id:String!){collaboratorMentionCandidates(rootSubjectKind:"agent_org",rootRunId:$id){candidates{definitionId}}}`,
      { id: run.rootId })).collaboratorMentionCandidates.candidates;
    expect(remaining.some((c: any) => c.definitionId === helperId)).toBe(false);

    const reference = path.join(fixture.workspace, 'publication-reference.txt');
    await fs.writeFile(reference, 'REFERENCE-BYTES-7719\n');
    await call('send_message_to', { target_agent_run_id: collaborator.agentRunId, content: 'Please read this owned reference.', reference_files: [reference] });
    await until(() => stream.frames.some(f => f.type === 'ROOT_EXECUTION_EVENT' && f.payload.event.kind === 'communication'), 'real communication publication');
    const communication = stream.frames.find(f => f.type === 'ROOT_EXECUTION_EVENT' && f.payload.event.kind === 'communication')!.payload.event.message;
    expect(communication).toMatchObject({ senderAgentRunId: run.runId, receiverAgentRunId: collaborator.agentRunId });
    expect(communication.referenceFiles).toEqual([reference]);
    const referenceId = createHash('sha256').update(`${communication.messageId}\0${reference}`).digest('hex');
    const referenceUrl = `/rest/agent-org-runs/${run.rootId}/communication/messages/${communication.messageId}/references/${referenceId}/content`;
    const referenceResponse = await fetch(new URL(referenceUrl, fixture.url));
    expect(referenceResponse.status).toBe(200);
    expect(await referenceResponse.text()).toBe('REFERENCE-BYTES-7719\n');
    const wrongReference = await fetch(new URL(referenceUrl.replace(run.rootId, other.rootId), fixture.url));
    expect(wrongReference.status).toBe(404);

    await call('delegate_task', { recipient_address: '/direct', description: 'Reply OK as a separate copy.' });
    await call('delegate_task', { recipient_address: '/team', description: 'Reply OK as a separate Team copy.' });
    const tasks = (await read()).org.rootOrg.taskExecutions;
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toHaveProperty('agentRunId');
    expect(tasks[1]).toHaveProperty('teamRunId');
    expect(tasks[1].members).toHaveLength(1);
    const started = stream.frames.filter(f => f.type === 'ROOT_EXECUTION_EVENT' && f.payload.event.kind === 'task_execution_started');
    expect(started).toHaveLength(2);
    for (const task of tasks) {
      expect(task.delegatorAgentRunId).toBe(run.runId);
      expect(started.some(f => JSON.stringify(f.payload.event.execution).includes(task.agentRunId ?? task.teamRunId))).toBe(true);
    }
    expect(tasks[0].agentRunId).not.toBe(run.tree.rootOrg.members.find((m: any) => m.address === '/direct').agentRunId);
    expect(tasks[1].teamRunId).not.toBe(run.tree.rootOrg.members.find((m: any) => m.address === '/team').teamRunId);
    const sequence = (await checkpoint()).changeSequence;
    expect(sequence).toBeGreaterThanOrEqual(Math.max(...started.map(f => f.payload.change_sequence)));

    const foreignCommand = randomUUID();
    stream.socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: {
      root_subject_kind: 'agent_org', root_run_id: run.rootId, target_agent_run_id: other.runId,
      command_id: foreignCommand, message_id: randomUUID(), dedupe_key: randomUUID(), content: 'Must not cross roots.',
      context_file_paths: [], image_urls: [],
    } }));
    await until(() => stream.frames.some(f => f.type === 'AGENT_COMMAND_ACK' && f.payload.command_id === foreignCommand), 'foreign-target negative ACK');
    expect(stream.frames.find(f => f.type === 'AGENT_COMMAND_ACK' && f.payload.command_id === foreignCommand)!.payload.state).not.toBe('accepted');
    expect((await read()).org.rootOrg.taskExecutions).toEqual(tasks);
    expect((await fixture.graphql(`query{getAgentOrgRootHistory(orgRunId:"unknown-owned-root"){root_run_id}}`)).getAgentOrgRootHistory).toBeNull();

    stream.socket.close();
    const reconnected = await fixture.connect(run);
    const snapshot = reconnected.frames.find(f => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT')!.payload.root_org;
    expect(snapshot.execution_tree.rootOrg.collaborators.map((c: any) => c.agentRunId)).toContain(collaborator.agentRunId);
    expect(snapshot.execution_tree.rootOrg.taskExecutions).toEqual(tasks);
    expect(snapshot.communication_messages.messages).toContainEqual(communication);
    const beforeStop = await fixture.projection({ ...run, runId: collaborator.agentRunId, address: collaborator.address });
    expect(JSON.stringify(beforeStop.conversation)).toContain('Please read this owned reference.');
    await fixture.terminate(run);
    const stopped = await read();
    expect(stopped.is_active).toBe(false);
    const treePath = path.join(fixture.dataDir, 'memory', 'agent_orgs', run.rootId, 'agent_org_run_execution_tree.json');
    const bytes = await fs.readFile(treePath);
    const restore = (await fixture.graphql(`mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success agentOrgRunId}}`,
      { id: run.rootId })).restoreAgentOrgRun;
    expect(restore).toMatchObject({ success: true, agentOrgRunId: run.rootId });
    fixture.runs.push(run);
    expect(await fs.readFile(treePath)).toEqual(bytes);
    expect((await read()).org.rootOrg.taskExecutions).toEqual(stopped.org.rootOrg.taskExecutions);
    expect((await fixture.projection({ ...run, runId: collaborator.agentRunId, address: collaborator.address })).conversation).toEqual(beforeStop.conversation);
    await fixture.save('org-publication-chain.json', { run, other, collaborator, tasks, communication, referenceUrl,
      baseline, afterAdmission, sequence, frames: stream.frames, reconnectFrames: reconnected.frames, beforeStop, stopped, restore });
    await fixture.terminate(run);
    await fixture.terminate(other);
  }, 90000);
});
