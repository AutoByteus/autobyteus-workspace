import { describe, expect, it, vi } from "vitest";
import { CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import { AgentOrgStreamHandler } from "../../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import type { AgentOrgRunEvent } from "../../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { delegatedChild, followTestChildRows, testRegistrations } from "../../../helpers/child-rows-feed.js";

const orgRunId = "org-run-1";
const agent = testOrgAgentNode("/director", "agent-run-1");
const tree = testAgentOrgExecutionTree({ orgRunId, members: [agent] });
const messages = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId, messages: [] };
const execution = createCollaborationMemberExecutionIdentity({
  root: createAgentOrgRootExecutionIdentity(orgRunId),
  memberAddress: agent.address,
  agentRunId: agent.agentRunId,
});
const statuses = [{
  execution,
  details: { status: "idle" as const, backgroundTasksRunning: 0, trigger: null, errorMessage: null, recoverableBlock: null },
  statusHint: "IDLE" as const, occurredAt: 1795452909697,
}];

const orgPackage = () => {
  const worker = testOrgAgentNode("/worker", "agent-worker-configured");
  const lead = testOrgAgentNode("/team/lead", "agent-lead-configured");
  const teamWorker = testOrgAgentNode("/team/worker", "agent-team-worker-configured");
  const team = testOrgTeamNode({
    address: "/team", teamRunId: "team-run-configured",
    coordinatorAddress: lead.address, members: [lead, teamWorker],
  });
  const base = testAgentOrgExecutionTree({ orgRunId, members: [agent, worker, team] });
  const executionTree = base;
  const memberStatuses = [worker, lead, teamWorker].map((member) => ({
    execution: createCollaborationMemberExecutionIdentity({
      root: createAgentOrgRootExecutionIdentity(orgRunId),
      memberAddress: member.address,
      agentRunId: member.agentRunId,
    }),
    details: { status: "idle" as const, backgroundTasksRunning: 0, trigger: null, errorMessage: null, recoverableBlock: null },
    statusHint: "IDLE" as const, occurredAt: 1795452909697,
  }));
  return { tree: executionTree, messages, inputStates: [], statuses: [...statuses, ...memberStatuses] };
};

const connection = () => {
  const sent: string[] = [];
  return { sent, socket: { send: (value: string) => sent.push(value), close: vi.fn() } };
};

const harness = (snapshot = { tree, messages, statuses, inputStates: [] },
  options: Readonly<{ stopped?: boolean }> = {}) => {
  // The run's one view stream (SR-062): the live run publishes into it, the feed and the stopped view's snapshot too.
  const feed = followTestChildRows();
  const publisher = feed.streams.streamOf<AgentOrgRunEvent>(createAgentOrgRootExecutionIdentity(orgRunId));
  const executeAgentCommand = vi.fn(async () => ({ accepted: true }));
  const executeAgentCommandWithExecutionKind = vi.fn(async (agentRunId: string) => ({
    result: { accepted: true },
    // A child row's command goes to the child's own run: no execution kind of this Org (autobyteus-461).
    executionKind: agentRunId.includes("child") ? null : "configured" as const,
  }));
  const recordRunActivity = vi.fn(async () => undefined);
  const run = {
    orgRunId,
    isActive: () => true,
    getExecutionTreeSnapshot: () => snapshot.tree,
    localChildren: { viewerAttached: () => undefined, viewerDetached: () => undefined },
    openPackageSnapshotConnection: () => publisher.openSnapshotConnection(() => snapshot),
    openViewSnapshotConnection: (atBase: () => unknown, read: (own: unknown, rows: unknown) => unknown) =>
      publisher.openSnapshotConnection(() => { const rows = atBase(); return read(snapshot, rows); }),
    executeAgentCommand,
    executeAgentCommandWithExecutionKind,
  };
  // The run's registration (SR-046): managed (live) or stopped; a restore registers it, a stop unregisters it.
  let managed = !options.stopped;
  const registrations = testRegistrations();
  const identity = createAgentOrgRootExecutionIdentity(orgRunId);
  const service = {
    getActive: vi.fn((id: string) => id === orgRunId && managed ? run : null),
    // The first message's restore (SR-046), after base's admission (SR-078; admitted unless a test says otherwise).
    restoreForInput: vi.fn(async () => { managed = true; registrations.register(identity); return run as unknown; }),
    restoreRefusal: vi.fn(async (_id: string): Promise<{ accepted: false; code: string; message: string } | null> => null),
    recordRunActivity,
  };
  const readStoredTree = vi.fn(async (id: string) => id === orgRunId ? snapshot.tree : null);
  return { publisher, executeAgentCommand, executeAgentCommandWithExecutionKind, recordRunActivity, service, run, feed, registrations, readStoredTree,
    stop: () => { managed = false; registrations.unregister(identity); },
    handler: new AgentOrgStreamHandler(service as never,
      { streams: feed.streams, rows: feed.rows, registrations, readStoredTree }) };
};

describe("AgentOrgStreamHandler", () => {
  it("CR-461-101: CONNECTED comes after every read, right before the snapshot, so a command sent on CONNECTED finds the session", async () => {
    const h = harness(undefined, { stopped: true });
    let release: () => void = () => undefined;
    h.readStoredTree.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve(tree); }));
    const sent: string[] = [];
    let sessionId: string | null = null;
    let readyOnConnected: boolean | null = null;
    // The client sends its command when CONNECTED arrives (a later task); the route takes messages once connect resolved.
    const socket = { close: vi.fn(), send: (value: string) => {
      sent.push(value);
      if (JSON.parse(value).type === "CONNECTED") setTimeout(() => { readyOnConnected = sessionId !== null; }, 0);
    } };
    const connecting = h.handler.connect(socket, orgRunId).then((id) => { sessionId = id; return id; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sent, "nothing while the snapshot is read").toEqual([]);
    release();
    const id = await connecting;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(readyOnConnected, "the session takes a command sent on CONNECTED").toBe(true);
    expect(sent.map((value) => JSON.parse(value).type).slice(0, 2)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT"]);
    h.handler.disconnect(id!);
  });

  it("sends the native snapshot for AGY Org root, direct Agents and nested Team members", async () => {
    const current = orgPackage();
    const agy = (launch: typeof current.tree.rootOrg.defaultLaunchConfiguration) => ({
      ...launch, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI,
    });
    const root = current.tree.rootOrg;
    const agyTree = {
      ...current.tree,
      rootOrg: {
        ...root,
        defaultLaunchConfiguration: agy(root.defaultLaunchConfiguration),
        members: root.members.map((member) => "agentRunId" in member
          ? { ...member, launchConfiguration: agy(member.launchConfiguration) }
          : { ...member, defaultLaunchConfiguration: agy(member.defaultLaunchConfiguration),
            members: member.members.map((child) => ({ ...child, launchConfiguration: agy(child.launchConfiguration) })) }),
      },
    };
    const test = harness({ ...current, tree: agyTree });
    const client = connection();
    const sessionId = await test.handler.connect(client.socket, orgRunId);

    expect(sessionId, client.sent.at(-1)).toBeTruthy();
    expect(client.socket.close).not.toHaveBeenCalled();
    const messages = client.sent.map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)));
    expect(messages.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "RUN_TREE_SNAPSHOT", "ROOT_LIFECYCLE"]);
    expect(messages[1]).toMatchObject({ payload: { root_org: { execution_tree: { rootOrg: {
      defaultLaunchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI },
      members: [
        { launchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI } },
        { launchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI } },
        { defaultLaunchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI },
          members: [
            { launchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI } },
            { launchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI } },
          ] },
      ],
    } } } } });
  });

  it("opens one correlated native Org snapshot barrier and sequences events", async () => {
    const test = harness(); const client = connection(); const sessionId = await test.handler.connect(client.socket, orgRunId);
    expect(sessionId).toBeTruthy();
    const initial = client.sent.map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)));
    expect(initial.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "RUN_TREE_SNAPSHOT", "ROOT_LIFECYCLE"]);
    const snapshot = initial[1]; expect(snapshot.type).toBe("ROOT_EXECUTION_VIEW_SNAPSHOT");
    if (snapshot.type === "ROOT_EXECUTION_VIEW_SNAPSHOT") expect(snapshot.payload).toMatchObject({ root_subject_kind: "agent_org", root_run_id: orgRunId, root_org: { execution_tree: { rootOrg: { orgRunId } } } });
    test.publisher.publish({
      kind: "agent_presentation",
      execution,
      message: { type: "AGENT_STATUS", payload: {
        status: "running", background_tasks_running: 0, trigger: "user", tool_name: null,
        error_message: null, error_details: null, recoverableBlock: null,
      } },
    });
    // The run's own end reaches the view as its unregistration (SR-046), not as the run's lifecycle event.
    test.publisher.publish({ kind: "lifecycle", isActive: false });
    // Every frame after the base is sent in order, through the view's ordered sends (SR-062).
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
    const emitted = client.sent.slice(4).map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)));
    expect(emitted.map((message) => message.type)).toEqual(["ROOT_EXECUTION_EVENT"]);
    expect(emitted[0]).toMatchObject({ payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, change_sequence: 1, event: { kind: "agent_presentation" } } });
  });

  it("rejects wrong-root commands and routes a correlated command only to the exact AgentRun", async () => {
    const test = harness(); const client = connection(); const sessionId = await test.handler.connect(client.socket, orgRunId); expect(sessionId).toBeTruthy();
    const command = (rootRunId: string, commandId: string) => JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: rootRunId, target_agent_run_id: agent.agentRunId, command_id: commandId, content: "Hello", context_file_paths: ["/tmp/context.txt"], image_urls: [], message_id: "message-1", dedupe_key: "dedupe-1" } });
    await test.handler.handleMessage(sessionId!, command("another-org", "wrong-root"));
    expect(test.executeAgentCommand).not.toHaveBeenCalled();
    expect(JSON.parse(client.sent.at(-1) ?? "{}")).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_id: "wrong-root", state: "failed", code: "AGENT_ORG_COMMAND_FAILED" } });
    await test.handler.handleMessage(sessionId!, command(orgRunId, "accepted"));
    expect(test.executeAgentCommandWithExecutionKind).toHaveBeenCalledTimes(1);
    expect(test.executeAgentCommandWithExecutionKind.mock.calls[0]?.[0]).toBe(agent.agentRunId);
    expect(test.executeAgentCommandWithExecutionKind.mock.calls[0]?.[1]).toMatchObject({ kind: "post_message", message: { content: "Hello", metadata: { input_origin: "user_message", message_id: "message-1", dedupe_key: "dedupe-1" } } });
    expect(test.recordRunActivity).toHaveBeenCalledWith(test.run, { summary: "Hello" });
    expect(JSON.parse(client.sent.at(-1) ?? "{}")).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_id: "accepted", state: "accepted" } });
  });

  it("keeps a child's and rejected sends out of Org history summary qualification", async () => {
    const test = harness(orgPackage()); const client = connection();
    const sessionId = await test.handler.connect(client.socket, orgRunId); expect(sessionId).toBeTruthy();
    const send = (target: string, id: string) => JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: target,
      command_id: id, content: "Do not title", context_file_paths: [], image_urls: [],
      message_id: `message-${id}`, dedupe_key: `dedupe-${id}`,
    } });
    await test.handler.handleMessage(sessionId!, send("agent-child-run", "child"));
    test.executeAgentCommandWithExecutionKind.mockResolvedValueOnce({
      result: { accepted: false, code: "NOT_ACCEPTED" }, executionKind: "configured",
    });
    await test.handler.handleMessage(sessionId!, send(agent.agentRunId, "rejected"));
    expect(test.recordRunActivity).not.toHaveBeenCalled();
  });

  it("preserves an accepted ACK when derived history metadata cannot be committed", async () => {
    const test = harness(); const client = connection();
    test.recordRunActivity.mockRejectedValueOnce(new Error("index unavailable"));
    const observed = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const sessionId = await test.handler.connect(client.socket, orgRunId); expect(sessionId).toBeTruthy();
    await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId,
      command_id: "metadata-failure", content: "Accepted once", context_file_paths: [], image_urls: [],
      message_id: "message-metadata", dedupe_key: "dedupe-metadata",
    } }));
    expect(JSON.parse(client.sent.at(-1) ?? "{}")).toMatchObject({
      type: "AGENT_COMMAND_ACK", payload: { command_id: "metadata-failure", state: "accepted" },
    });
    expect(observed).toHaveBeenCalledOnce();
    observed.mockRestore();
  });

  it("enqueues concurrent summary attempts in accepted-result completion order", async () => {
    const test = harness(); const client = connection();
    let acceptFirst!: (value: unknown) => void;
    let acceptSecond!: (value: unknown) => void;
    const firstResult = new Promise((resolve) => { acceptFirst = resolve; });
    const secondResult = new Promise((resolve) => { acceptSecond = resolve; });
    test.executeAgentCommandWithExecutionKind.mockImplementation((_id, command) =>
      ((command as { message: { content: string } }).message.content === "Arrived first" ? firstResult : secondResult) as never);
    const sessionId = await test.handler.connect(client.socket, orgRunId); expect(sessionId).toBeTruthy();
    const send = (content: string, commandId: string) => JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId,
      command_id: commandId, content, context_file_paths: [], image_urls: [],
      message_id: `message-${commandId}`, dedupe_key: `dedupe-${commandId}`,
    } });
    const first = test.handler.handleMessage(sessionId!, send("Arrived first", "first"));
    const second = test.handler.handleMessage(sessionId!, send("Completed first", "second"));
    acceptSecond({ result: { accepted: true }, executionKind: "configured" });
    await vi.waitFor(() => expect(test.recordRunActivity).toHaveBeenCalledTimes(1));
    acceptFirst({ result: { accepted: true }, executionKind: "configured" });
    await Promise.all([first, second]);
    expect(test.recordRunActivity.mock.calls.map((call) => call[1]?.summary))
      .toEqual(["Completed first", "Arrived first"]);
  });

  it.each([
    ["INTERRUPT_GENERATION", { kind: "interrupt" }],
    ["APPROVE_TOOL", { kind: "approve_tool", invocationId: "tool-1", approved: true, reason: "safe" }],
    ["DENY_TOOL", { kind: "approve_tool", invocationId: "tool-1", approved: false, reason: "blocked" }],
  ] as const)("acknowledges the strict %s command", async (type, expected) => {
    const test = harness(); const client = connection();
    const sessionId = await test.handler.connect(client.socket, orgRunId); expect(sessionId).toBeTruthy();
    const payload = {
      root_subject_kind: "agent_org", root_run_id: orgRunId,
      target_agent_run_id: agent.agentRunId, command_id: `command-${type}`,
      ...(type === "APPROVE_TOOL" || type === "DENY_TOOL"
        ? { invocation_id: "tool-1", reason: type === "APPROVE_TOOL" ? "safe" : "blocked" }
        : {}),
    };
    await test.handler.handleMessage(sessionId!, JSON.stringify({ type, payload }));
    expect(test.executeAgentCommand).toHaveBeenCalledWith(agent.agentRunId, expected);
    expect(JSON.parse(client.sent.at(-1) ?? "{}")).toMatchObject({
      type: "AGENT_COMMAND_ACK",
      payload: { command_id: `command-${type}`, command_type: type, state: "accepted" },
    });
  });

  it.each([
    ["INTERRUPT_GENERATION", "NO_ACTIVE_TURN", { state: "accepted", code: null }],
    ["INTERRUPT_GENERATION", "RUN_NOT_ACTIVE", { state: "accepted", code: null }],
    ["INTERRUPT_GENERATION", "RUNTIME_COMMAND_FAILED", { state: "rejected", code: "RUNTIME_COMMAND_FAILED" }],
    ["APPROVE_TOOL", "RUN_NOT_ACTIVE", { state: "rejected", code: "RUN_NOT_ACTIVE" }],
  ] as const)("answers a live agent's %s result %s with %o (autobyteus-533 AC-004)", async (type, code, ack) => {
    const test = harness(); const client = connection();
    test.executeAgentCommand.mockResolvedValueOnce({ accepted: false, code, message: "detail" } as never);
    const sessionId = await test.handler.connect(client.socket, orgRunId);
    await test.handler.handleMessage(sessionId!, JSON.stringify({ type, payload: {
      root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId, command_id: "c-r",
      ...(type === "APPROVE_TOOL" ? { invocation_id: "tool-1", reason: "safe" } : {}) } }));
    expect(JSON.parse(client.sent.at(-1) ?? "{}")).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_id: "c-r", ...ack } });
  });

  it("answers a peer row's Stop that is not running on its node as accepted (autobyteus-533 AC-004)", async () => {
    const test = harness(); const client = connection();
    const peer = { kind: "agent" as const, runId: "peer-run", postMessage: vi.fn(), interrupt: vi.fn(async () => ({ accepted: false, code: "RUN_NOT_ACTIVE", message: "AgentRun 'peer-run' is not running." })) };
    (test.feed.rows as { peerRunOf: unknown }).peerRunOf = (id: string) => id === "peer-run" ? peer : null;
    const sessionId = await test.handler.connect(client.socket, orgRunId);
    await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
      target_agent_run_id: "peer-run", command_id: "c-peer" } }));
    expect(JSON.parse(client.sent.at(-1)!)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_id: "c-peer", state: "accepted", code: null } });
  });

  it("sends pending reply text before the stopped Org's stored snapshot, and keeps the stream (autobyteus-139, SR-046)", async () => {
    const test = harness(); const client = connection();
    expect(await test.handler.connect(client.socket, orgRunId)).toBeTruthy();
    test.publisher.publish({ kind: "agent_presentation", execution, message: { type: "SEGMENT_CONTENT", payload: {
      segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "last words", occurred_at: "2026-11-23T16:55:09.697Z",
    } } });
    test.stop();
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
    const emitted = client.sent.slice(4).map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)));
    expect(emitted).toMatchObject([
      { type: "ROOT_EXECUTION_EVENT", payload: { change_sequence: 1, change_sequence_through: 1, event: {
        kind: "agent_presentation_batch", items: [{ agent_run_id: agent.agentRunId, message: { payload: { delta: "last words" } } }],
      } } },
      // The switch is an in-band snapshot at the current sequence, in the same live sequence (SR-062, DS-8).
      { type: "ROOT_EXECUTION_VIEW_SNAPSHOT", payload: { root_org: { is_active: false, base_change_sequence: 1, live_sequence_id: test.publisher.liveSequenceId } } },
      { type: "RUN_TREE_SNAPSHOT", payload: { base_change_sequence: 1 } },
      { type: "ROOT_LIFECYCLE", payload: { is_active: false } },
    ]);
    expect(client.socket.close).not.toHaveBeenCalled();
  });

  it("drops pending reply text when the client disconnects (autobyteus-139)", async () => {
    const test = harness(); const client = connection();
    const sessionId = await test.handler.connect(client.socket, orgRunId);
    vi.useFakeTimers();
    try {
      test.publisher.publish({ kind: "agent_presentation", execution, message: { type: "SEGMENT_CONTENT", payload: {
        segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "unsent", occurred_at: "2026-11-23T16:55:09.697Z",
      } } });
      test.handler.disconnect(sessionId!);
      vi.advanceTimersByTime(2_000);
      expect(client.sent).toHaveLength(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails closed for an Org run that does not exist (no stored tree)", async () => {
    const test = harness(undefined, { stopped: true }); const client = connection();
    expect(await test.handler.connect(client.socket, "missing")).toBeNull();
    expect(JSON.parse(client.sent.at(-1) ?? "{}")).toMatchObject({ type: "ERROR", payload: { code: "AGENT_ORG_NOT_FOUND" } });
    expect(client.socket.close).toHaveBeenCalledWith(4004);
  });

  describe("SR-078 (CR-461-069): a stopped Org its migration could not convert answers base's reasons, never a schema error", () => {
    const notCataloged = { accepted: false as const, code: "AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED", message: `AgentOrg '${orgRunId}' is not an admitted current package.` };
    const send = (sessionId: string, test: ReturnType<typeof harness>) => test.handler.handleMessage(sessionId, JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId, command_id: "c-1",
      content: "Start please", context_file_paths: [], image_urls: [], message_id: "m-1", dedupe_key: "d-1" } }));

    it("the view connect asks the restore admission before reading the stored file: refused, it answers the admission's code and text and closes (CR-461-073)", async () => {
      const test = harness(undefined, { stopped: true }); const client = connection();
      test.service.restoreRefusal.mockResolvedValue(notCataloged);
      expect(await test.handler.connect(client.socket, orgRunId)).toBeNull();
      expect(JSON.parse(client.sent.at(-1) ?? "{}")).toMatchObject({ type: "ERROR", payload: { code: notCataloged.code, message: notCataloged.message } });
      expect(client.socket.close).toHaveBeenCalledWith(4004);
      expect(test.readStoredTree).not.toHaveBeenCalled();
    });

    it("an admitted Org whose stored file cannot be parsed: answered as not restorable, the schema detail in the log only", async () => {
      const test = harness(undefined, { stopped: true }); const client = connection();
      test.readStoredTree.mockRejectedValueOnce(new Error("Invalid AgentOrg execution tree: rootOrg.members[0].schemaVersion must be 2"));
      expect(await test.handler.connect(client.socket, orgRunId)).toBeNull();
      const error = JSON.parse(client.sent.at(-1) ?? "{}");
      expect(error).toMatchObject({ type: "ERROR", payload: { code: "AGENT_ORG_RUN_NOT_RESTORABLE",
        message: `AgentOrg run '${orgRunId}' cannot be restored: its saved state cannot be read. Its files were left unchanged.` } });
      expect(JSON.stringify(client.sent)).not.toMatch(/schemaVersion|rootOrg/);
    });

    it("the first message answers the admission's own reason code and text on its acknowledgement; nothing is posted", async () => {
      const test = harness(undefined, { stopped: true }); const client = connection();
      const sessionId = await test.handler.connect(client.socket, orgRunId);
      test.service.restoreForInput.mockResolvedValueOnce({ accepted: false, code: "TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED",
        message: "Token usage history must finish migrating before existing runs can be restored." });
      await send(sessionId!, test);
      expect(JSON.parse(client.sent.at(-1) ?? "{}")).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "rejected",
        code: "TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED", message: "Token usage history must finish migrating before existing runs can be restored." } });
      expect(test.executeAgentCommandWithExecutionKind).not.toHaveBeenCalled();
      test.handler.disconnect(sessionId!);
    });
  });

  describe("SR-046: a stopped Org's view (stored mode), never restored to serve the view", () => {
    const flush = async () => { for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };
    const parse = (client: ReturnType<typeof connection>) => client.sent.map((raw) => CollaborationStreamServerMessageSchema.parse(JSON.parse(raw)));

    it("connects from its stored tree with no statuses, a fresh base and lifecycle stopped; the Org stays stopped", async () => {
      const test = harness(undefined, { stopped: true }); const client = connection();
      expect(await test.handler.connect(client.socket, orgRunId)).toBeTruthy();
      const messages = parse(client);
      expect(messages.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "RUN_TREE_SNAPSHOT", "ROOT_LIFECYCLE"]);
      // The run's one view stream (SR-062): the stopped view is numbered in it, under its live sequence.
      expect(messages[1]).toMatchObject({ payload: { root_org: { is_active: false, base_change_sequence: 0, agent_statuses: [], live_sequence_id: test.publisher.liveSequenceId } } });
      expect(messages[3]).toMatchObject({ payload: { is_active: false } });
      expect(test.service.restoreForInput).not.toHaveBeenCalled();
      test.feed.report({ run: createAgentOrgRootExecutionIdentity(orgRunId), added: [delegatedChild("analyst")], removed: [] });
      await test.feed.settled();
      // A stopped Org's view follows its tree too (SR-084).
      expect(parse(client).at(-1)).toMatchObject({ type: "ROOT_EXECUTION_EVENT", payload: { change_sequence: 1, event: { kind: "run_tree_changed", added: [{ key: "agent:analyst" }] } } });
    });

    it("SR-083, SR-084: a live Org's snapshot holds its own parts and statuses only; its delegated runs are its tree's rows", async () => {
      const test = harness(orgPackage());
      const org = createAgentOrgRootExecutionIdentity(orgRunId);
      test.feed.report({ run: org, added: [delegatedChild("idle", org), delegatedChild("fresh", org)], removed: [] });
      await test.feed.settled();
      const client = connection();
      const sessionId = await test.handler.connect(client.socket, orgRunId);
      const messages = parse(client);
      const snapshot = messages.find((message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT")!.payload as {
        root_org: { agent_statuses: Array<{ agent_run_id: string }>; execution_tree: { rootOrg: object } } };
      for (const delegated of ["idle", "fresh"]) expect(snapshot.root_org.agent_statuses.some((status) => status.agent_run_id === delegated)).toBe(false);
      expect(snapshot.root_org.execution_tree.rootOrg).not.toHaveProperty("taskExecutions");
      const tree = messages.find((message) => message.type === "RUN_TREE_SNAPSHOT")!.payload as { rows: Array<{ key: string }> };
      expect(tree.rows.map((row) => row.key)).toEqual(expect.arrayContaining(["agent:idle", "agent:fresh"]));
      test.handler.disconnect(sessionId!);
    });

    it("SR-066 (ARCH-REV-039 note 1): a peer child's message and interrupt reach its node through its handle; the stopped Org stays stopped", async () => {
      const test = harness(undefined, { stopped: true }); const client = connection();
      const peer = { kind: "agent" as const, runId: "peer-run", postMessage: vi.fn(async () => ({ accepted: true })), interrupt: vi.fn(async () => ({ accepted: true })) };
      (test.feed.rows as { peerRunOf: unknown }).peerRunOf = (id: string) => id === "peer-run" ? peer : null;
      const sessionId = await test.handler.connect(client.socket, orgRunId);
      await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
        target_agent_run_id: "peer-run", command_id: "c-send", content: "status?", context_file_paths: [], image_urls: [], message_id: "m-1", dedupe_key: "d-1" } }));
      expect(peer.postMessage).toHaveBeenCalledWith(expect.objectContaining({ content: "status?", messageId: "m-1", dedupeKey: "d-1" }));
      expect(JSON.parse(client.sent.at(-1)!)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "accepted" } });
      await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
        target_agent_run_id: "peer-run", command_id: "c-interrupt" } }));
      expect(peer.interrupt).toHaveBeenCalledOnce();
      // SR-069: a peer run takes no `@`, as at base; mentions that arrive anyway are refused and nothing is posted.
      await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
        target_agent_run_id: "peer-run", command_id: "c-mention", content: "@Code Reviewer?", context_file_paths: [], image_urls: [], message_id: "m-3", dedupe_key: "d-3",
        mentions: [{ kind: "agent", definition_id: "code-reviewer" }] } }));
      expect(JSON.parse(client.sent.at(-1)!)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "rejected", code: "REMOTE_RUN_MENTIONS_UNSUPPORTED" } });
      expect(peer.postMessage).toHaveBeenCalledOnce();
      expect(test.service.restoreForInput).not.toHaveBeenCalled();
      expect(test.executeAgentCommand).not.toHaveBeenCalled();
      test.handler.disconnect(sessionId!);
    });

    it("a Stop for an agent of the stopped Org finds nothing to stop and an approval is refused, restoring nothing; a message to it restores the Org, then one live snapshot", async () => {
      const test = harness(undefined, { stopped: true }); const client = connection();
      const sessionId = await test.handler.connect(client.socket, orgRunId);
      await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: {
        root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId, command_id: "c-1" } }));
      // autobyteus-533 AC-003: nothing to stop is accepted.
      expect(parse(client).at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_id: "c-1", state: "accepted", code: null, message: null } });
      await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "APPROVE_TOOL", payload: {
        root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId, command_id: "c-a", invocation_id: "tool-1", reason: "safe" } }));
      expect(parse(client).at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_id: "c-a", state: "rejected", code: "AGENT_ORG_STOPPED" } });
      expect(test.service.restoreForInput).not.toHaveBeenCalled();
      await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId, command_id: "c-2",
        content: "Start please", context_file_paths: [], image_urls: [], message_id: "m-1", dedupe_key: "d-1" } }));
      await flush();
      expect(test.service.restoreForInput).toHaveBeenCalledOnce();
      expect(test.executeAgentCommandWithExecutionKind).toHaveBeenCalledOnce();
      const tail = parse(client).slice(-4);
      expect(tail.map((message) => message.type)).toEqual(["AGENT_COMMAND_ACK", "ROOT_EXECUTION_VIEW_SNAPSHOT", "RUN_TREE_SNAPSHOT", "ROOT_LIFECYCLE"]);
      expect(tail[1]).toMatchObject({ payload: { root_org: { is_active: true } } });
      expect(tail[3]).toMatchObject({ payload: { is_active: true } });
      expect(client.socket.close).not.toHaveBeenCalled();
    });
  });

  it("autobyteus-461 SR-063, SR-084: an open Org view gets its tree's changes in the run's sequence, after its snapshot, each once", async () => {
    const { handler, run, feed } = harness();
    const open = run.openViewSnapshotConnection;
    // A delegation committed while the run's own parts are read: after the base, so a frame after the snapshot.
    run.openViewSnapshotConnection = (atBase, read) => open(atBase, (own, rows) => {
      feed.report({ run: createAgentOrgRootExecutionIdentity(orgRunId), added: [delegatedChild("analyst")], removed: [] });
      return read(own, rows);
    });
    const client = connection();
    const sessionId = await handler.connect(client.socket, orgRunId);
    await feed.settled();
    const sent = client.sent.map((raw) => CollaborationStreamServerMessageSchema.parse(JSON.parse(raw)));
    expect(sent.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "RUN_TREE_SNAPSHOT", "ROOT_LIFECYCLE", "ROOT_EXECUTION_EVENT"]);
    // The tree read at the same base; the row committed after it comes as the tree's change, once.
    expect(sent[2]).toMatchObject({ payload: { root_subject_kind: "agent_org", base_change_sequence: 0, rows: [{ key: `org_agent:${orgRunId}:delegator` }] } });
    expect(sent[4]).toMatchObject({ payload: { change_sequence: 1, event: { kind: "run_tree_changed",
      added: [{ key: "agent:analyst", parentKey: `org_agent:${orgRunId}:delegator`, depth: 1 }] } } });
    // Closed, then back after its assigner reactivated it: the tree is read when each notice is sent, so neither changes it.
    feed.report({ run: createAgentOrgRootExecutionIdentity(orgRunId), added: [], removed: [{ agentRunId: "analyst" }] });
    feed.report({ run: createAgentOrgRootExecutionIdentity(orgRunId), added: [delegatedChild("analyst")], removed: [] });
    await feed.settled();
    expect(JSON.parse(client.sent.at(-2)!)).toMatchObject({ payload: { change_sequence: 2, event: { kind: "run_tree_changed", added: [], removed: [], updated: [] } } });
    expect(JSON.parse(client.sent.at(-1)!)).toMatchObject({ payload: { change_sequence: 3, event: { kind: "run_tree_changed", added: [], removed: [], updated: [] } } });
    handler.disconnect(sessionId!);
  });
});
