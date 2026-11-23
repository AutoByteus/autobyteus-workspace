import 'reflect-metadata';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AgyRuntimeErrorFixture, until } from '../helpers/agy-runtime-error-fixture.js';
import { readParticipantMessages } from '../../helpers/collaboration-participant-messages.js';
import { restoreByMemberMessage } from '../helpers/restore-by-member-message.js';
import { addedRowKeysPerChange, delegatedRunsTree, hasTreeSnapshot, isRunRowKey, treeSnapshotRunsOf } from '../helpers/run-tree-delegated.js';

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

  it('keeps delegated-run/task identities, communication references, checkpoint and conversation through fresh reads, reconnect and Stop/restore', async () => {
    const run = await fixture.create('org', 'linked_skills');
    const other = await fixture.create('org', 'linked_skills');
    const helperName = 'publication-helper-' + randomUUID();
    const helperId = (await fixture.graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: helperName, description: 'Owned publication helper',
        instructions: 'Reply OK to ordinary requests.', toolNames: [] } })).createAgentDefinition.id;
    const read = async () => (await fixture.graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){root_run_id is_active org}}`,
      { id: run.rootId })).getAgentOrgRootHistory;
    const checkpoint = async () => (await fixture.graphql(`query($id:String!){getAgentOrgExecutionCheckpoint(orgRunId:$id){changeSequence hasOpenExecutionWork}}`,
      { id: run.rootId })).getAgentOrgExecutionCheckpoint;
    const stream = await fixture.connect(run);
    // autobyteus-461 SR-084: the Org's delegated copies come from its tree (its view and history carry its own parts only), and
    // a new copy reaches the open view as a tree change adding its row (key `agent:<id>` / `team:<id>`).
    const orgCopies = async () => (await delegatedRunsTree((query, variables) => fixture.graphql(query, variables), 'agent_org', run.rootId)).taskExecutions;
    const addedRunKeys = (frames: any[]) => addedRowKeysPerChange(frames).flat().filter(isRunRowKey);
    const keyOfCopy = (copy: any) => copy.teamRunId ? `team:${copy.teamRunId}` : `agent:${copy.agentRunId}`;
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
    // Messaging never brings anyone in (collaboration-model-contract): a message to an outside catalog address is not found and
    // creates nothing; delegation starts a root-hosted copy, which is then reached by its run ID.
    const helperAddress = '/' + helperName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    await call('send_message_to', { recipient_address: helperAddress, content: 'Reply OK.' });
    expect(JSON.stringify((await fixture.projection(run)).conversation)).toContain('COLLABORATION_TARGET_NOT_FOUND');
    expect(await orgCopies()).toEqual([]);
    expect(addedRunKeys(stream.frames), 'no copy row added').toEqual([]);
    await call('delegate_task', { recipient_address: helperAddress, description: 'Reply OK as a catalog copy.' });
    const helperCopy = (await orgCopies()).find((c: any) => c.address === helperAddress)!;
    expect(helperCopy).toMatchObject({ address: helperAddress, delegatorAgentRunId: run.runId });
    expect(helperCopy.agentRunId).toMatch(/_[0-9a-f]{32}$/);
    await until(() => addedRunKeys(stream.frames).includes(keyOfCopy(helperCopy)), "the copy's row added live to the Org's view");
    const afterAdmission = await checkpoint();
    expect(afterAdmission.changeSequence).toBeGreaterThan(baseline.changeSequence);
    const remaining = (await fixture.graphql(`query($id:String!){collaboratorMentionCandidates(rootSubjectKind:"agent_org",rootRunId:$id){candidates{definitionId}}}`,
      { id: run.rootId })).collaboratorMentionCandidates.candidates;
    // A definition delegated as a copy is not in the run: it stays an `@` candidate.
    expect(remaining.some((c: any) => c.definitionId === helperId)).toBe(true);

    const reference = path.join(fixture.workspace, 'publication-reference.txt');
    await fs.writeFile(reference, 'REFERENCE-BYTES-7719\n');
    await call('send_message_to', { target_agent_run_id: helperCopy.agentRunId, content: 'Please read this owned reference.', reference_files: [reference] });
    const referenced = (f: any) => f.type === 'ROOT_EXECUTION_EVENT' && f.payload.event.kind === 'communication'
      && f.payload.event.message.referenceFiles?.length > 0;
    await until(() => stream.frames.some(referenced), 'real communication publication');
    const communication = stream.frames.find(referenced)!.payload.event.message;
    expect(communication).toMatchObject({ senderAgentRunId: run.runId, receiverAgentRunId: helperCopy.agentRunId });
    expect(communication.referenceFiles).toEqual([reference]);
    const referenceId = createHash('sha256').update(`${communication.messageId}\0${reference}`).digest('hex');
    const referenceUrl = `/rest/collaboration-messages/agent_org/${run.rootId}/messages/${communication.messageId}/references/${referenceId}/content`;
    const referenceResponse = await fetch(new URL(referenceUrl, fixture.url));
    expect(referenceResponse.status).toBe(200);
    expect(await referenceResponse.text()).toBe('REFERENCE-BYTES-7719\n');
    const wrongReference = await fetch(new URL(referenceUrl.replace(run.rootId, other.rootId), fixture.url));
    expect(wrongReference.status).toBe(404);

    await call('delegate_task', { recipient_address: '/direct', description: 'Reply OK as a separate copy.' });
    // The sender is a member of the mounted `/team`: delegating its own mounted Team is refused and starts nothing.
    await call('delegate_task', { recipient_address: '/team', description: 'Reply OK as a separate Team copy.' });
    expect(JSON.stringify((await fixture.projection(run)).conversation)).toContain('COLLABORATION_SELF_TARGET_REJECTED');
    const tasks = await orgCopies();
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toHaveProperty('agentRunId');
    expect(tasks[1]).toHaveProperty('agentRunId');
    await until(() => tasks.every((task: any) => addedRunKeys(stream.frames).includes(keyOfCopy(task))), 'both copies added live');
    const started = stream.frames.filter(f => addedRunKeys([f]).length > 0);
    expect(addedRunKeys(stream.frames), 'two copy rows added, one each').toHaveLength(2);
    for (const task of tasks) expect(task.delegatorAgentRunId).toBe(run.runId);
    expect(tasks[1].agentRunId).not.toBe(run.tree.rootOrg.members.find((m: any) => m.address === '/direct').agentRunId);
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
    expect(await orgCopies()).toEqual(tasks);
    expect((await fixture.graphql(`query{getAgentOrgRootHistory(orgRunId:"unknown-owned-root"){root_run_id}}`)).getAgentOrgRootHistory).toBeNull();

    stream.socket.close();
    const reconnected = await fixture.connect(run);
    const snapshot = reconnected.frames.find(f => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT')!.payload.root_org;
    expect(snapshot.execution_tree.rootOrg).not.toHaveProperty('collaborators');
    // The view's own parts carry no copy; its tree snapshot lists them.
    expect(JSON.stringify(snapshot.execution_tree)).not.toContain(helperCopy.agentRunId);
    await until(() => hasTreeSnapshot(reconnected.frames), "the reconnected view's tree snapshot");
    expect(treeSnapshotRunsOf(reconnected.frames).taskExecutions).toEqual(tasks);
    // autobyteus-358: the snapshot carries no messages; the sender's Team tab loads the message.
    expect(snapshot).not.toHaveProperty('communication_messages');
    expect(await readParticipantMessages((query, variables) => fixture.graphql(query, variables), { rootKind: 'agent_org', rootRunId: run.rootId, agentRunId: communication.senderAgentRunId }))
      .toContainEqual(communication);
    const beforeStop = await fixture.projection({ ...run, runId: helperCopy.agentRunId, address: helperCopy.address });
    expect(JSON.stringify(beforeStop.conversation)).toContain('Please read this owned reference.');
    await fixture.terminate(run);
    const stopped = await read();
    expect(stopped.is_active).toBe(false);
    const copiesAtStop = await orgCopies();
    const treePath = path.join(fixture.dataDir, 'memory', 'agent_orgs', run.rootId, 'agent_org_run_execution_tree.json');
    const bytes = await fs.readFile(treePath);
    // autobyteus-461 CR-461-008: no restore mutation; the user's message to one of the Org's own members restores it.
    await restoreByMemberMessage({ url: `http://${fixture.url.host}`, gql: (query, variables) => fixture.graphql(query, variables),
      kind: 'org', runId: run.rootId, memberRunId: run.runId });
    fixture.runs.push(run);
    expect(await fs.readFile(treePath)).toEqual(bytes);
    expect(await orgCopies()).toEqual(copiesAtStop);
    expect((await fixture.projection({ ...run, runId: helperCopy.agentRunId, address: helperCopy.address })).conversation).toEqual(beforeStop.conversation);
    await fixture.save('org-publication-chain.json', { run, other, helperCopy, tasks, communication, referenceUrl,
      baseline, afterAdmission, sequence, frames: stream.frames, reconnectFrames: reconnected.frames, beforeStop, stopped, restore: { by: 'member message', active: (await read()).is_active } });
    await fixture.terminate(run);
    await fixture.terminate(other);
  }, 90000);
});
