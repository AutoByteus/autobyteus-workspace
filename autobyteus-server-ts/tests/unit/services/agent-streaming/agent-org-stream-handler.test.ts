import { describe, expect, it, vi } from "vitest";
import { CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import { AgentOrgStreamHandler } from "../../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { RootEventPublisher } from "../../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import type { AgentOrgRunEvent } from "../../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const orgRunId = "org-run-1";
const agent = testOrgAgentNode("/director", "agent-run-1");
const tree = testAgentOrgExecutionTree({ orgRunId, members: [agent] });
const tasks = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId, records: [] };
const messages = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId, messages: [] };
const execution = createCollaborationMemberExecutionIdentity({
  root: createAgentOrgRootExecutionIdentity(orgRunId),
  memberAddress: agent.address,
  agentRunId: agent.agentRunId,
});
const statuses = [{
  execution,
  details: { status: "idle" as const, trigger: null, errorMessage: null },
  statusHint: "IDLE" as const,
}];

const taskBearingPackage = () => {
  const worker = testOrgAgentNode("/worker", "agent-worker-configured");
  const lead = testOrgAgentNode("/team/lead", "agent-lead-configured");
  const teamWorker = testOrgAgentNode("/team/worker", "agent-team-worker-configured");
  const team = testOrgTeamNode({
    address: "/team", teamRunId: "team-run-configured",
    coordinatorAddress: lead.address, members: [lead, teamWorker],
  });
  const base = testAgentOrgExecutionTree({ orgRunId, members: [agent, worker, team] });
  const taskAgent = {
    address: worker.address, agentRunId: "agent-worker-task", platformAgentRunId: null,
    startedAt: "2026-09-01T00:00:01.000Z", settledAt: null,
  } as const;
  const taskTeam = {
    address: team.address, teamRunId: "team-run-task",
    members: [
      { address: lead.address, agentRunId: "agent-task-lead", platformAgentRunId: null },
      { address: teamWorker.address, agentRunId: "agent-task-worker", platformAgentRunId: null },
    ],
    taskExecutions: [], startedAt: "2026-09-01T00:00:02.000Z", settledAt: null,
  } as const;
  const executionTree = {
    ...base,
    rootOrg: { ...base.rootOrg, taskExecutions: [taskAgent, taskTeam] },
  };
  const taskRecords = {
    schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId,
    records: [{
      taskId: "task-agent", delegatorAgentRunId: agent.agentRunId,
      recipientAddress: worker.address, taskExecution: { agentRunId: taskAgent.agentRunId },
      description: "Agent task", referenceFiles: [], status: "active" as const, updates: [],
      createdAt: taskAgent.startedAt,
    }, {
      taskId: "task-team", delegatorAgentRunId: agent.agentRunId,
      recipientAddress: team.address, taskExecution: { teamRunId: taskTeam.teamRunId },
      description: "Team task", referenceFiles: [], status: "active" as const, updates: [],
      createdAt: taskTeam.startedAt,
    }],
  };
  const taskStatuses = [worker, lead, teamWorker, taskAgent, ...taskTeam.members].map((member) => ({
    execution: createCollaborationMemberExecutionIdentity({
      root: createAgentOrgRootExecutionIdentity(orgRunId),
      memberAddress: member.address,
      agentRunId: member.agentRunId,
    }),
    details: { status: "idle" as const, trigger: null, errorMessage: null },
    statusHint: "IDLE" as const,
  }));
  return { tree: executionTree, tasks: taskRecords, messages, statuses: [...statuses, ...taskStatuses] };
};

const connection = () => {
  const sent: string[] = [];
  return { sent, socket: { send: (value: string) => sent.push(value), close: vi.fn() } };
};

const harness = (snapshot = { tree, tasks, messages, statuses }) => {
  const publisher = new RootEventPublisher<AgentOrgRunEvent>();
  const executeAgentCommand = vi.fn(async () => ({ accepted: true }));
  const executeAgentCommandWithExecutionKind = vi.fn(async (agentRunId: string) => ({
    result: { accepted: true },
    executionKind: agentRunId.includes("task") ? "task" as const : "configured" as const,
  }));
  const recordRunActivity = vi.fn(async () => undefined);
  const run = {
    orgRunId,
    isActive: () => true,
    openPackageSnapshotConnection: () => publisher.openSnapshotConnection(() => snapshot),
    executeAgentCommand,
    executeAgentCommandWithExecutionKind,
  };
  const service = { getActive: vi.fn((id: string) => id === orgRunId ? run : null), recordRunActivity };
  return { publisher, executeAgentCommand, executeAgentCommandWithExecutionKind, recordRunActivity, service, run, handler: new AgentOrgStreamHandler(service as never) };
};

describe("AgentOrgStreamHandler", () => {
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
        error_message: null, error_details: null,
      } },
    });
    test.publisher.publish({ kind: "lifecycle", isActive: false });
    const emitted = client.sent.slice(3).map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)));
    expect(emitted.map((message) => message.type)).toEqual(["ROOT_EXECUTION_EVENT", "ROOT_LIFECYCLE"]);
    expect(emitted[0]).toMatchObject({ payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, change_sequence: 1, event: { kind: "agent_presentation" } } });
    expect(emitted[1]).toMatchObject({ payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, is_active: false } });
  });

  it("projects restored task Agent and Team runs at their configured recipient addresses", async () => {
    const test = harness(taskBearingPackage()); const client = connection();
    const sessionId = await test.handler.connect(client.socket, orgRunId);
    expect(sessionId, client.sent.at(-1)).toBeTruthy();

    const snapshot = client.sent.map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)))
      .find((message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT");
    expect(snapshot).toMatchObject({
      type: "ROOT_EXECUTION_VIEW_SNAPSHOT",
      payload: { root_org: {
        execution_tree: { rootOrg: { taskExecutions: [
          { address: "/worker", agentRunId: "agent-worker-task" },
          { address: "/team", teamRunId: "team-run-task" },
        ] } },
        task_records: { records: [
          { recipientAddress: "/worker", taskExecution: { agentRunId: "agent-worker-task" } },
          { recipientAddress: "/team", taskExecution: { teamRunId: "team-run-task" } },
        ] },
      } },
    });
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

  it("keeps task-scoped and rejected sends out of Org history summary qualification", async () => {
    const test = harness(taskBearingPackage()); const client = connection();
    const sessionId = await test.handler.connect(client.socket, orgRunId); expect(sessionId).toBeTruthy();
    const send = (target: string, id: string) => JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: target,
      command_id: id, content: "Do not title", context_file_paths: [], image_urls: [],
      message_id: `message-${id}`, dedupe_key: `dedupe-${id}`,
    } });
    await test.handler.handleMessage(sessionId!, send("agent-worker-task", "task"));
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

  it("fails closed when the requested Org root is not active", async () => {
    const client = connection(); const handler = new AgentOrgStreamHandler({ getActive: () => null } as never);
    expect(await handler.connect(client.socket, "missing")).toBeNull();
    expect(JSON.parse(client.sent[0] ?? "{}")).toMatchObject({ type: "ERROR", payload: { code: "AGENT_ORG_NOT_ACTIVE" } });
    expect(client.socket.close).toHaveBeenCalledWith(4004);
  });
});
