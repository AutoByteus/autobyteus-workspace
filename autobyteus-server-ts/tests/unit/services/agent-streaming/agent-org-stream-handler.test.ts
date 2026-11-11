import { describe, expect, it, vi } from "vitest";
import { CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import { AgentOrgStreamHandler } from "../../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { RootEventPublisher } from "../../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import type { AgentOrgRunEvent } from "../../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { isAgentOrgMessageEvent } from "../../../../src/agent-org-execution/domain/agent-org-run-event.js";
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
  details: { status: "idle" as const, trigger: null, errorMessage: null, recoverableBlock: null },
  statusHint: "IDLE" as const,
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
    details: { status: "idle" as const, trigger: null, errorMessage: null, recoverableBlock: null },
    statusHint: "IDLE" as const,
  }));
  return { tree: executionTree, messages, inputStates: [], statuses: [...statuses, ...memberStatuses] };
};

const connection = () => {
  const sent: string[] = [];
  return { sent, socket: { send: (value: string) => sent.push(value), close: vi.fn() } };
};

const harness = (snapshot = { tree, messages, statuses, inputStates: [] }, options: Readonly<{ stopped?: boolean }> = {}) => {
  const publisher = new RootEventPublisher<AgentOrgRunEvent>({ isMessageEvent: isAgentOrgMessageEvent });
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
    localChildren: { viewerAttached: () => undefined, viewerDetached: () => undefined }, remoteChildren: { viewerAttached: vi.fn(), viewerDetached: vi.fn(), refresh: vi.fn(async () => undefined) },
    openPackageSnapshotConnection: () => publisher.openSnapshotConnection(() => snapshot),
    executeAgentCommand,
    executeAgentCommandWithExecutionKind,
  };
  // The run's registration (SR-046): managed (live) or stopped; a restore registers it, a stop unregisters it.
  let managed = !options.stopped;
  const feed = followTestChildRows();
  const registrations = testRegistrations();
  const identity = createAgentOrgRootExecutionIdentity(orgRunId);
  const service = {
    getActive: vi.fn((id: string) => id === orgRunId && managed ? run : null),
    restore: vi.fn(async () => { managed = true; registrations.register(identity); return run; }),
    recordRunActivity,
  };
  const readStoredTree = vi.fn(async (id: string) => id === orgRunId ? snapshot.tree : null);
  return { publisher, executeAgentCommand, executeAgentCommandWithExecutionKind, recordRunActivity, service, run, feed, registrations,
    stop: () => { managed = false; registrations.unregister(identity); },
    handler: new AgentOrgStreamHandler(service as never, { childRowsFeed: feed.feed, registrations, readStoredTree }) };
};

describe("AgentOrgStreamHandler", () => {
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
    expect(messages.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "ROOT_LIFECYCLE"]);
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
    expect(initial.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "ROOT_LIFECYCLE"]);
    const snapshot = initial[1]; expect(snapshot.type).toBe("ROOT_EXECUTION_VIEW_SNAPSHOT");
    if (snapshot.type === "ROOT_EXECUTION_VIEW_SNAPSHOT") expect(snapshot.payload).toMatchObject({ root_subject_kind: "agent_org", root_run_id: orgRunId, root_org: { execution_tree: { rootOrg: { orgRunId } } } });
    test.publisher.publish({
      kind: "agent_presentation",
      execution,
      message: { type: "AGENT_STATUS", payload: {
        status: "running", trigger: "user", tool_name: null,
        error_message: null, error_details: null, recoverableBlock: null,
      } },
    });
    // The run's own end reaches the view as its unregistration (SR-046), not as the run's lifecycle event.
    test.publisher.publish({ kind: "lifecycle", isActive: false });
    const emitted = client.sent.slice(3).map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)));
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

  it("sends pending reply text before the stopped Org's stored snapshot, and keeps the stream (autobyteus-139, SR-046)", async () => {
    const test = harness(); const client = connection();
    expect(await test.handler.connect(client.socket, orgRunId)).toBeTruthy();
    test.publisher.publish({ kind: "agent_presentation", execution, message: { type: "SEGMENT_CONTENT", payload: {
      segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "last words",
    } } });
    expect(client.sent).toHaveLength(3);
    test.stop();
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
    const emitted = client.sent.slice(3).map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)));
    expect(emitted).toMatchObject([
      { type: "ROOT_EXECUTION_EVENT", payload: { change_sequence: 1, change_sequence_through: 1, event: {
        kind: "agent_presentation_batch", items: [{ agent_run_id: agent.agentRunId, message: { payload: { delta: "last words" } } }],
      } } },
      { type: "ROOT_EXECUTION_VIEW_SNAPSHOT", payload: { root_org: { is_active: false, base_change_sequence: 0 } } },
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
        segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "unsent",
      } } });
      test.handler.disconnect(sessionId!);
      vi.advanceTimersByTime(2_000);
      expect(client.sent).toHaveLength(3);
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

  describe("SR-046: a stopped Org's view (stored mode), never restored to serve the view", () => {
    const flush = async () => { for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };
    const parse = (client: ReturnType<typeof connection>) => client.sent.map((raw) => CollaborationStreamServerMessageSchema.parse(JSON.parse(raw)));

    it("connects from its stored tree with no statuses, a fresh base and lifecycle stopped; the Org stays stopped", async () => {
      const test = harness(undefined, { stopped: true }); const client = connection();
      expect(await test.handler.connect(client.socket, orgRunId)).toBeTruthy();
      const messages = parse(client);
      expect(messages.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "ROOT_LIFECYCLE"]);
      expect(messages[1]).toMatchObject({ payload: { root_org: { is_active: false, base_change_sequence: 0, agent_statuses: [], live_sequence_id: expect.stringMatching(/^stored-/) } } });
      expect(messages[2]).toMatchObject({ payload: { is_active: false } });
      expect(test.service.restore).not.toHaveBeenCalled();
      test.feed.report({ run: createAgentOrgRootExecutionIdentity(orgRunId), added: [delegatedChild("analyst")], removed: [] });
      await test.feed.settled();
      expect(parse(client).at(-1)).toMatchObject({ type: "CHILD_RUNS_CHANGED" });
    });

    it("an interrupt for an agent of the stopped Org is refused and restores nothing; a message to it restores the Org, then one live snapshot", async () => {
      const test = harness(undefined, { stopped: true }); const client = connection();
      const sessionId = await test.handler.connect(client.socket, orgRunId);
      await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: {
        root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId, command_id: "c-1" } }));
      expect(parse(client).at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "rejected", code: "AGENT_ORG_STOPPED" } });
      expect(test.service.restore).not.toHaveBeenCalled();
      await test.handler.handleMessage(sessionId!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agent.agentRunId, command_id: "c-2",
        content: "Start please", context_file_paths: [], image_urls: [], message_id: "m-1", dedupe_key: "d-1" } }));
      await flush();
      expect(test.service.restore).toHaveBeenCalledOnce();
      expect(test.executeAgentCommandWithExecutionKind).toHaveBeenCalledOnce();
      const tail = parse(client).slice(-3);
      expect(tail.map((message) => message.type)).toEqual(["AGENT_COMMAND_ACK", "ROOT_EXECUTION_VIEW_SNAPSHOT", "ROOT_LIFECYCLE"]);
      expect(tail[1]).toMatchObject({ payload: { root_org: { is_active: true } } });
      expect(tail[2]).toMatchObject({ payload: { is_active: true } });
      expect(client.socket.close).not.toHaveBeenCalled();
    });
  });

  it("autobyteus-461 SR-042: an open Org view gets each child-row change, unsequenced, after its snapshot", async () => {
    const { handler, run, feed } = harness();
    const open = run.openPackageSnapshotConnection;
    run.openPackageSnapshotConnection = async () => {
      feed.report({ run: createAgentOrgRootExecutionIdentity(orgRunId), added: [delegatedChild("analyst")], removed: [] });
      await feed.settled();
      return open();
    };
    const client = connection();
    const sessionId = await handler.connect(client.socket, orgRunId);
    const types = client.sent.map((raw) => CollaborationStreamServerMessageSchema.parse(JSON.parse(raw)).type);
    expect(types.slice(0, 3)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "CHILD_RUNS_CHANGED"]);
    expect(JSON.parse(client.sent[2]!)).toMatchObject({ payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
      event: { kind: "child_runs_changed", run_id: orgRunId, added: [{ agentRunId: "analyst" }], removed: [] } } });
    feed.report({ run: createAgentOrgRootExecutionIdentity(orgRunId), added: [], removed: [{ teamRunId: "eng" }] });
    await feed.settled();
    expect(JSON.parse(client.sent.at(-1)!)).toMatchObject({ type: "CHILD_RUNS_CHANGED", payload: { event: { removed: [{ teamRunId: "eng" }] } } });
    handler.disconnect(sessionId!);
  });
});

