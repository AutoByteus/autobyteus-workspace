import { describe, expect, it, vi } from "vitest";
import { GlobalAgentRunMessageRouter } from "../../../src/agent-communication/services/global-agent-run-message-router.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberExecutionContext } from "../../fixtures/current-team-run-fixtures.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";

const sender = buildAgentRunMessageSenderContext({
  senderRunId: "sender-run",
  senderName: "Sender",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const createTargetRun = (input: {
  runId?: string;
  accepted?: boolean;
  message?: string | null;
} = {}) => {
  const emittedEvents: AgentRunEvent[] = [];
  const postUserMessage = vi.fn(async () => ({
    accepted: input.accepted ?? true,
    message: input.message ?? null,
    turnId: "turn-1",
  }));
  const run = {
    runId: input.runId ?? "target-run",
    config: { memberExecutionContext: null },
    postUserMessage,
    publishEvent: vi.fn(async (event: AgentRunEvent) => {
      emittedEvents.push(event);
    }),
  } as unknown as AgentRun;
  return { run, postUserMessage, emittedEvents };
};

const createRouter = (targetRun: AgentRun | null) => {
  const agentRunManager = {
    getActiveRun: vi.fn(() => targetRun),
  };
  return {
    router: new GlobalAgentRunMessageRouter({ crossRun: { route: async () => null, peerRunAdmission: async () => null }, channel: () => null, coordinators: { teamCoordinatorOf: async () => null }, agentRunManager }),
    agentRunManager,
  };
};

describe("GlobalAgentRunMessageRouter", () => {
  it("delivers to an active standalone run and emits a direct INTER_AGENT_MESSAGE without team projection fields", async () => {
    const target = createTargetRun({ runId: "standalone-target" });
    const { router, agentRunManager } = createRouter(target.run);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "standalone-target",
      content: "Direct body.",
      messageType: "direct_note",
      referenceFiles: ["/tmp/direct.md"],
    });

    expect(result).toMatchObject({ accepted: true, agentRunId: "standalone-target" });
    expect(agentRunManager.getActiveRun).toHaveBeenCalledWith("standalone-target");
    expect(target.postUserMessage).toHaveBeenCalledTimes(1);
    const postedMessage = target.postUserMessage.mock.calls[0]?.[0] as { content?: string; metadata?: Record<string, unknown> };
    expect(postedMessage.content).toContain("Direct body.");
    expect(postedMessage.content).toContain("/tmp/direct.md");
    expect(postedMessage.metadata).toEqual(expect.objectContaining({
      input_origin: "direct_inter_agent_delivery",
      sender_agent_id: "sender-run",
      receiver_run_id: "standalone-target",
      reference_files: ["/tmp/direct.md"],
    }));
    expect(target.emittedEvents).toHaveLength(1);
    expect(target.emittedEvents[0]).toEqual(expect.objectContaining({
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "standalone-target",
      payload: expect.objectContaining({
        sender_agent_id: "sender-run",
        receiver_run_id: "standalone-target",
        content: "Direct body.",
        message_type: "direct_note",
        reference_files: ["/tmp/direct.md"],
      }),
    }));
    expect(target.emittedEvents[0]!.payload).not.toHaveProperty("team_run_id");
    expect(target.emittedEvents[0]!.payload).not.toHaveProperty("reference_file_entries");
  });

  it("delivers to an active team-member AgentRun as the same direct route without Team Communication fields", async () => {
    const target = createTargetRun({ runId: "team-member-run" });
    const { router } = createRouter(target.run);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "team-member-run",
      content: "Direct to member.",
    });

    expect(result).toMatchObject({ accepted: true, agentRunId: "team-member-run" });
    expect(target.emittedEvents[0]!.payload).toEqual(expect.objectContaining({
      receiver_run_id: "team-member-run",
      content: "Direct to member.",
    }));
    expect(target.emittedEvents[0]!.payload).not.toHaveProperty("team_run_id");
  });

  it("confirms the exact accepting AgentRun when same-root delivery uses the Team owner", async () => {
    const memberExecutionContext = testMemberExecutionContext({
      rootTeamRunId: "root-team-run",
      memberAddress: "/sender",
      agentRunId: "sender-run",
    });
    const sameRootSender = buildAgentRunMessageSenderContext({
      senderRunId: "sender-run",
      senderName: "Sender",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberExecutionContext,
    });
    const target = createTargetRun({ runId: "same-root-target" });
    const targetTeamContext = testMemberExecutionContext({
      rootTeamRunId: "root-team-run",
      memberAddress: "/target",
      agentRunId: "same-root-target",
    });
    (target.run as unknown as { config: { memberExecutionContext: unknown } })
      .config.memberExecutionContext = targetTeamContext;
    const deliverExactAgentMessage = vi.fn(async () => ({
      accepted: true,
      code: "DELIVERED",
      message: "Delivered by Team owner.",
    }));
    const activeRootDirectory = new ActiveCollaborationRootDirectory();
    const hasAgentExecution = vi.fn((agentRunId: string) => agentRunId === "same-root-target");
    activeRootDirectory.reserve(memberExecutionContext.identity.root, { hasAgentExecution, ownsAgentRun: hasAgentExecution, deliverExactAgentMessage, deliverToPeerRun: vi.fn() }).commit();
    const router = new GlobalAgentRunMessageRouter({ crossRun: { route: async () => null, peerRunAdmission: async () => null }, channel: () => null, coordinators: { teamCoordinatorOf: async () => null },
      agentRunManager: { getActiveRun: vi.fn(() => target.run) },
      activeRootDirectory,
    });

    await expect(router.deliver({
      sender: sameRootSender,
      targetAgentRunId: "same-root-target",
      content: "Exact Team message.",
    })).resolves.toMatchObject({
      accepted: true,
      agentRunId: "same-root-target",
    });
    expect(deliverExactAgentMessage).toHaveBeenCalledOnce();
  });

  it("routes a same-root shut-down delegated target through the sender root so delivery can wake it", async () => {
    const memberExecutionContext = testMemberExecutionContext({
      rootTeamRunId: "root-team-run",
      memberAddress: "/sender",
      agentRunId: "sender-run",
    });
    const sameRootSender = buildAgentRunMessageSenderContext({
      senderRunId: "sender-run",
      senderName: "Sender",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberExecutionContext,
    });
    const deliverExactAgentMessage = vi.fn(async () => ({
      accepted: true,
      code: "DELIVERED",
      message: "Restored and delivered.",
    }));
    const activeRootDirectory = new ActiveCollaborationRootDirectory();
    activeRootDirectory.reserve(memberExecutionContext.identity.root, {
      hasAgentExecution: (agentRunId: string) => agentRunId === "dormant-child",
      ownsAgentRun: (agentRunId: string) => agentRunId === "dormant-child",
      deliverExactAgentMessage,
      deliverToPeerRun: vi.fn(),
    }).commit();
    const getActiveRun = vi.fn(() => null);
    const router = new GlobalAgentRunMessageRouter({ crossRun: { route: async () => null, peerRunAdmission: async () => null }, channel: () => null, coordinators: { teamCoordinatorOf: async () => null }, agentRunManager: { getActiveRun }, activeRootDirectory });

    await expect(router.deliver({
      sender: sameRootSender,
      targetAgentRunId: "dormant-child",
      content: "Follow-up.",
    })).resolves.toMatchObject({ accepted: true, agentRunId: "dormant-child" });
    expect(deliverExactAgentMessage).toHaveBeenCalledWith(expect.objectContaining({
      targetAgentRunId: "dormant-child", content: "Follow-up.",
    }));
    expect(getActiveRun).not.toHaveBeenCalled();

    await expect(router.deliver({
      sender: sameRootSender,
      targetAgentRunId: "other-root-dormant",
      content: "Cross-root.",
    })).resolves.toMatchObject({ accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE" });
    expect(deliverExactAgentMessage).toHaveBeenCalledOnce();
  });

  it("refuses a Team copy's team run ID with its coordinator's agent run ID, for same-root and cross-root senders (AC-012, REQ-009)", async () => {
    const memberExecutionContext = testMemberExecutionContext({ rootTeamRunId: "root-team-run", memberAddress: "/sender", agentRunId: "sender-run" });
    const sameRootSender = buildAgentRunMessageSenderContext({ senderRunId: "sender-run", senderName: "Sender",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, memberExecutionContext });
    const deliverExactAgentMessage = vi.fn(async () => ({ accepted: true }));
    const activeRootDirectory = new ActiveCollaborationRootDirectory();
    activeRootDirectory.reserve(memberExecutionContext.identity.root, {
      hasAgentExecution: (agentRunId: string) => agentRunId === "copy-lead",
      ownsAgentRun: (agentRunId: string) => agentRunId === "copy-lead",
      teamCoordinatorOf: (teamRunId: string) => teamRunId === "copy-team" ? "copy-lead" : null,
      deliverToPeerRun: vi.fn(),
      deliverExactAgentMessage,
    }).commit();
    const getActiveRun = vi.fn(() => null);
    const router = new GlobalAgentRunMessageRouter({ crossRun: { route: async () => null, peerRunAdmission: async () => null }, channel: () => null, coordinators: { teamCoordinatorOf: async () => null }, agentRunManager: { getActiveRun }, activeRootDirectory });
    const refusal = { accepted: false, code: "TARGET_IS_TEAM_RUN",
      message: "copy-team is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: copy-lead." };

    // Same root as the copy, and an unrelated sender (another root, or none).
    await expect(router.deliver({ sender: sameRootSender, targetAgentRunId: "copy-team", content: "Hi." })).resolves.toEqual(refusal);
    await expect(router.deliver({ sender, targetAgentRunId: "copy-team", content: "Hi." })).resolves.toEqual(refusal);
    expect(deliverExactAgentMessage).not.toHaveBeenCalled();
    expect(getActiveRun).not.toHaveBeenCalled();
    // The coordinator's agent run ID is delivered as before.
    await expect(router.deliver({ sender: sameRootSender, targetAgentRunId: "copy-lead", content: "Hi." }))
      .resolves.toMatchObject({ accepted: true, agentRunId: "copy-lead" });
    // A team run in no active root gets the usual not-active refusal, like an agent run ID there.
    await expect(router.deliver({ sender, targetAgentRunId: "stopped-team", content: "Hi." }))
      .resolves.toMatchObject({ accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE" });
  });

  it("rejects unknown, inactive, preallocated, or recoverable-only targets via the same not-active result", async () => {
    const { router, agentRunManager } = createRouter(null);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "preallocated-or-recoverable-run",
      content: "Should fail.",
    });

    expect(agentRunManager.getActiveRun).toHaveBeenCalledWith("preallocated-or-recoverable-run");
    expect(result).toEqual({
      accepted: false,
      code: "TARGET_AGENT_RUN_NOT_ACTIVE",
      message: "No running agent has the run id 'preallocated-or-recoverable-run', so the message was not sent. A stopped agent is not woken. Use an exact run id you were given: a sender run id (from a message or your new task), a run id delegate_task returned to you, or one list_running_agents lists. For an agent on another node, also pass node.",
    });
  });

  it("does not emit an event when the active target rejects input", async () => {
    const target = createTargetRun({ accepted: false, message: "busy" });
    const { router } = createRouter(target.run);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "target-run",
      content: "Rejected body.",
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("TARGET_AGENT_RUN_REJECTED_INPUT");
    expect(result.message).toBe("The agent 'target-run' did not accept the message: busy");
    expect(result.agentRunId).toBeUndefined();
    expect(target.emittedEvents).toEqual([]);
  });

  it("reports publication failure without rolling back accepted runtime delivery", async () => {
    const target = createTargetRun();
    vi.mocked(target.run.publishEvent).mockRejectedValueOnce(new Error("listener path failed"));
    const { router } = createRouter(target.run);

    const result = await router.deliver({
      sender,
      targetAgentRunId: "target-run",
      content: "Accepted body.",
    });

    expect(result).toMatchObject({
      accepted: true,
      code: "DELIVERED_EVENT_PUBLICATION_FAILED",
      agentRunId: "target-run",
    });
    expect(target.postUserMessage).toHaveBeenCalledTimes(1);
  });

  it("autobyteus-492 (R-9 removed): an agent of a collaboration root that no live root runs is not running for a collaboration sender; nothing is posted", async () => {
    const senderContext = testMemberExecutionContext({ rootTeamRunId: "eng", memberAddress: "/coder", agentRunId: "coder" });
    const targetContext = testMemberExecutionContext({ rootTeamRunId: "legacy-team", memberAddress: "/lead", agentRunId: "legacy-lead" });
    const target = createTargetRun({ runId: "legacy-lead" });
    (target.run as unknown as { config: unknown }).config = { memberExecutionContext: targetContext };
    const crossRun = { route: vi.fn(async () => null), peerRunAdmission: vi.fn(async () => null) };
    const router = new GlobalAgentRunMessageRouter({ agentRunManager: { getActiveRun: vi.fn(() => target.run) },
      activeRootDirectory: new ActiveCollaborationRootDirectory(), crossRun, coordinators: { teamCoordinatorOf: async () => null }, channel: () => null });
    const collaborationSender = buildAgentRunMessageSenderContext({ senderRunId: "coder", senderName: "Coder",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, memberExecutionContext: senderContext });
    await expect(router.deliver({ sender: collaborationSender, targetAgentRunId: "legacy-lead", content: "Hi" })).resolves.toMatchObject({
      accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE" });
    expect(crossRun.route).toHaveBeenCalledOnce();
    expect(target.postUserMessage).not.toHaveBeenCalled();
  });

  describe("autobyteus-492 DS-004: send_message_to with node", () => {
    const senderContext = testMemberExecutionContext({ rootTeamRunId: "eng", memberAddress: "/coder", agentRunId: "coder" });
    const collaborationSender = buildAgentRunMessageSenderContext({ senderRunId: "coder", senderName: "Coder",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, memberExecutionContext: senderContext });
    const setup = (options: { closed?: boolean; peer?: "found" | "refused"; channel?: boolean; root?: boolean } = {}) => {
      const deliverToPeerRun = vi.fn(async () => ({ accepted: true as const, message: "Delivered message to pm_b on node \"docker\"." }));
      const directory = new ActiveCollaborationRootDirectory();
      if (options.root !== false) directory.reserve(senderContext.identity.root, { hasAgentExecution: () => false, ownsAgentRun: () => false, deliverExactAgentMessage: vi.fn(), deliverToPeerRun }).commit();
      const closed = { accepted: false as const, code: "TASK_AGENT_RESOURCE_CLOSED", message: "closed" };
      const crossRun = { route: vi.fn(async () => null), peerRunAdmission: vi.fn(async () => options.closed ? closed : null) };
      const findPeer = vi.fn(async (name: string) => options.peer === "refused"
        ? { accepted: false as const, code: "PEER_NOT_REGISTERED", message: `No peer node named "${name}".` } : { nodeId: "srv_b", name });
      const router = new GlobalAgentRunMessageRouter({ agentRunManager: { getActiveRun: vi.fn(() => null) }, activeRootDirectory: directory, crossRun,
        coordinators: { teamCoordinatorOf: async () => null }, channel: () => options.channel === false ? null : { findPeer } as never });
      return { router, deliverToPeerRun, crossRun, findPeer };
    };
    const send = (router: GlobalAgentRunMessageRouter, sender = collaborationSender) =>
      router.deliver({ sender, targetAgentRunId: "pm_b", node: "docker", content: "Hello B", referenceFiles: [] });

    it("the peer by name, this node's admission of the run (closed, or on another node: autobyteus-587 RF-14), then the sender's root sends it to that node's ID; only the sender's root is asked", async () => {
      const h = setup();
      await expect(send(h.router)).resolves.toMatchObject({ accepted: true, agentRunId: "pm_b" });
      expect(h.findPeer).toHaveBeenCalledWith("docker");
      expect(h.crossRun.peerRunAdmission).toHaveBeenCalledWith({ agentRunId: "pm_b", node: { nodeId: "srv_b", name: "docker" } });
      expect(h.deliverToPeerRun).toHaveBeenCalledWith(expect.objectContaining({ nodeId: "srv_b", targetAgentRunId: "pm_b", content: "Hello B",
        sender: expect.objectContaining({ identity: senderContext.identity, displayName: "Coder" }) }));
      expect(h.crossRun.route).not.toHaveBeenCalled();
    });

    it("entry-form row 13 with node (AR-001): a run this node's Tasks closed is refused before anything is sent", async () => {
      const h = setup({ closed: true });
      await expect(send(h.router)).resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: "closed" });
      expect(h.deliverToPeerRun).not.toHaveBeenCalled();
    });

    it("row 9: an unknown peer and the switch off give today's peer refusals; row 10: a sender without a collaboration run is refused", async () => {
      const refused = setup({ peer: "refused" });
      await expect(send(refused.router)).resolves.toMatchObject({ accepted: false, code: "PEER_NOT_REGISTERED" });
      expect(refused.crossRun.peerRunAdmission).not.toHaveBeenCalled();
      await expect(send(setup({ channel: false }).router)).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
      const plain = setup();
      await expect(send(plain.router, sender)).resolves.toEqual({ accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED",
        message: "send_message_to with node needs an agent run that collaborates, so nothing was sent to another node." });
      expect(plain.findPeer).not.toHaveBeenCalled();
      await expect(send(setup({ root: false }).router)).resolves.toMatchObject({ accepted: false, code: "COLLABORATION_ROOT_NOT_ACTIVE" });
    });
  });

  it("R-12 (SR-071): a team run's ID is answered with its coordinator's run ID whether the team runs or not (nothing live here)", async () => {
    const teamCoordinatorOf = vi.fn(async (teamRunId: string) => teamRunId === "stopped-team" ? "stopped-lead" : null);
    const router = new GlobalAgentRunMessageRouter({ crossRun: { route: async () => null, peerRunAdmission: async () => null }, channel: () => null, coordinators: { teamCoordinatorOf }, agentRunManager: { getActiveRun: vi.fn(() => null) },
      activeRootDirectory: new ActiveCollaborationRootDirectory() });
    await expect(router.deliver({ sender, targetAgentRunId: "stopped-team", content: "Hi." })).resolves.toEqual({ accepted: false, code: "TARGET_IS_TEAM_RUN",
      message: "stopped-team is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: stopped-lead." });
    await expect(router.deliver({ sender, targetAgentRunId: "no-such-run", content: "Hi." })).resolves.toMatchObject({ accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE" });
  });
});

