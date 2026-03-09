import { describe, expect, it, vi } from "vitest";
import {
  CodexAppServerRuntimeService,
  mapCodexModelListRowToModelInfo,
  normalizeCodexReasoningEffort,
  resolveCodexSessionReasoningEffort,
} from "../../../../src/runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import { createCodexSessionStartupState } from "../../../../src/runtime-execution/codex-app-server/codex-runtime-shared.js";

const createReadyStartupState = () => {
  const startup = createCodexSessionStartupState();
  startup.resolveReady();
  return startup;
};

describe("codex-app-server-runtime-service helpers", () => {
  it("normalizes codex reasoning effort values", () => {
    expect(normalizeCodexReasoningEffort("HIGH")).toBe("high");
    expect(normalizeCodexReasoningEffort(" medium ")).toBe("medium");
    expect(normalizeCodexReasoningEffort("invalid")).toBeNull();
    expect(normalizeCodexReasoningEffort(null)).toBeNull();
  });

  it("resolves reasoning effort from llmConfig first, then runtime metadata", () => {
    expect(
      resolveCodexSessionReasoningEffort(
        { reasoning_effort: "high" },
        { reasoningEffort: "low" },
      ),
    ).toBe("high");

    expect(resolveCodexSessionReasoningEffort(null, { reasoningEffort: "MEDIUM" })).toBe(
      "medium",
    );

    expect(
      resolveCodexSessionReasoningEffort(
        { reasoning_effort: "not-a-valid-effort" },
        { reasoning_effort: "low" },
      ),
    ).toBe("low");
  });

  it("maps codex model rows with reasoning config schema", () => {
    const mapped = mapCodexModelListRowToModelInfo({
      id: "gpt-5.3-codex",
      model: "gpt-5.3-codex",
      displayName: "gpt-5.3-codex",
      supportedReasoningEfforts: [
        { reasoningEffort: "low" },
        { reasoningEffort: "medium" },
        { reasoningEffort: "high" },
      ],
      defaultReasoningEffort: "medium",
    });

    expect(mapped).not.toBeNull();
    expect(mapped?.display_name).toContain("default reasoning: medium");
    const schema = mapped?.config_schema as {
      parameters?: Array<{ name?: string; default_value?: unknown; enum_values?: unknown[] }>;
    };
    expect(schema.parameters?.[0]?.name).toBe("reasoning_effort");
    expect(schema.parameters?.[0]?.default_value).toBe("medium");
    expect(schema.parameters?.[0]?.enum_values).toEqual(["low", "medium", "high"]);
  });

  it("returns null when model row is missing an identifier", () => {
    expect(mapCodexModelListRowToModelInfo({ displayName: "missing-id" })).toBeNull();
  });
});

describe("CodexAppServerRuntimeService.sendTurn", () => {
  it("uses session reasoning effort when dispatching turn/start", async () => {
    const service = new CodexAppServerRuntimeService();
    const request = vi.fn().mockResolvedValue({ turn: { id: "turn-1" } });

    (service as unknown as { sessions: Map<string, unknown> }).sessions.set("run-1", {
      runId: "run-1",
      client: {
        request,
        close: vi.fn().mockResolvedValue(undefined),
      },
      threadId: "thread-1",
      model: "gpt-5.3-codex",
      workingDirectory: "/tmp",
      reasoningEffort: "high",
      currentStatus: "IDLE",
      activeTurnId: null,
      startup: createReadyStartupState(),
      approvalRecords: new Map(),
      listeners: new Set(),
      unbindHandlers: [],
      sendMessageToEnabled: true,
    });

    await service.sendTurn("run-1", {
      content: "hello",
      contextFiles: [],
    } as any);

    expect(request).toHaveBeenCalledWith(
      "turn/start",
      expect.objectContaining({
        threadId: "thread-1",
        model: "gpt-5.3-codex",
        effort: "high",
      }),
    );
  });

  it("rejects send_message_to tool relay when capability is disabled for the session", () => {
    const service = new CodexAppServerRuntimeService();
    const respondSuccess = vi.fn();
    const respondError = vi.fn();
    const state = {
      runId: "run-1",
      client: {
        respondSuccess,
        respondError,
      },
      teamRunId: "team-1",
      memberName: "Professor",
      sendMessageToEnabled: false,
    } as any;

    const handled = (service as any).tryHandleInterAgentRelayRequest(
      state,
      "request-1",
      "item/tool/call",
      {
        tool: "send_message_to",
        arguments: {
          recipient_name: "Student",
          content: "hello",
        },
      },
    );

    expect(handled).toBe(true);
    expect(respondError).not.toHaveBeenCalled();
    expect(respondSuccess).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({
        success: false,
      }),
    );
  });

  it("waits for startup readiness before dispatching turn/start", async () => {
    const service = new CodexAppServerRuntimeService();
    const request = vi.fn().mockResolvedValue({ turn: { id: "turn-ready" } });
    const startup = createCodexSessionStartupState();

    (service as unknown as { sessions: Map<string, unknown> }).sessions.set("run-1", {
      runId: "run-1",
      client: {
        request,
        close: vi.fn().mockResolvedValue(undefined),
      },
      threadId: "thread-1",
      model: "gpt-5.3-codex",
      workingDirectory: "/tmp",
      reasoningEffort: "medium",
      currentStatus: "IDLE",
      activeTurnId: null,
      startup,
      approvalRecords: new Map(),
      listeners: new Set(),
      unbindHandlers: [],
      sendMessageToEnabled: true,
    });

    const sendPromise = service.sendTurn("run-1", {
      content: "hello",
      contextFiles: [],
    } as any);
    await Promise.resolve();

    expect(request).not.toHaveBeenCalled();

    startup.resolveReady();

    await expect(sendPromise).resolves.toEqual({ turnId: "turn-ready" });
    expect(request).toHaveBeenCalledWith(
      "turn/start",
      expect.objectContaining({
        threadId: "thread-1",
      }),
    );
  });

  it("returns the current status for an active run session", () => {
    const service = new CodexAppServerRuntimeService();

    (service as unknown as { sessions: Map<string, unknown> }).sessions.set("run-1", {
      runId: "run-1",
      client: {
        request: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
      },
      threadId: "thread-1",
      model: "gpt-5.3-codex",
      workingDirectory: "/tmp",
      reasoningEffort: "medium",
      currentStatus: "RUNNING",
      activeTurnId: "turn-1",
      startup: createReadyStartupState(),
      approvalRecords: new Map(),
      listeners: new Set(),
      unbindHandlers: [],
      sendMessageToEnabled: true,
    });

    expect(service.getRunStatus("run-1")).toBe("RUNNING");
    expect(service.getRunStatus("missing")).toBeNull();
  });

  it("emits synthetic sender tool-call events for intercepted send_message_to item/tool/call", async () => {
    const service = new CodexAppServerRuntimeService();
    service.setInterAgentRelayHandler(async () => ({
      accepted: true,
      message: "relayed",
    }));
    const respondSuccess = vi.fn();
    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    const state = {
      runId: "run-professor",
      teamRunId: "team-1",
      memberName: "Professor",
      sendMessageToEnabled: true,
      client: {
        respondSuccess,
        respondError: vi.fn(),
      },
      listeners: new Set([
        (event: { method: string; params: Record<string, unknown> }) => {
          events.push(event);
        },
      ]),
      approvalRecords: new Map(),
      unbindHandlers: [],
    } as any;

    (service as any).handleServerRequest(
      state,
      "request-1",
      "item/tool/call",
      {
        id: "call-send-1",
        tool: "send_message_to",
        arguments: {
          recipient_name: "Student",
          content: "hello",
          message_type: "agent_message",
        },
      },
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(respondSuccess).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({
        success: true,
      }),
    );
    expect(events.map((event) => event.method)).toEqual([
      "item/completed",
    ]);
    expect(events[0]?.params?.tool).toBe("send_message_to");
    expect((events[0]?.params?.arguments as Record<string, unknown>)?.recipient_name).toBe(
      "Student",
    );
  });

  it("intercepts send_message_to when server-request method uses item.toolCall alias", async () => {
    const service = new CodexAppServerRuntimeService();
    service.setInterAgentRelayHandler(async () => ({
      accepted: true,
      message: "relayed",
    }));
    const respondSuccess = vi.fn();
    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    const state = {
      runId: "run-professor",
      teamRunId: "team-1",
      memberName: "Professor",
      sendMessageToEnabled: true,
      client: {
        respondSuccess,
        respondError: vi.fn(),
      },
      listeners: new Set([
        (event: { method: string; params: Record<string, unknown> }) => {
          events.push(event);
        },
      ]),
      approvalRecords: new Map(),
      unbindHandlers: [],
    } as any;

    (service as any).handleServerRequest(
      state,
      "request-1",
      "item.toolCall",
      {
        item: {
          id: "call-send-2",
          name: "send_message_to",
          arguments: {
            recipient_name: "Student",
            content: "hello",
          },
        },
      },
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(respondSuccess).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({
        success: true,
      }),
    );
    expect(events.map((event) => event.method)).toEqual([
      "item/completed",
    ]);
    expect((events[0]?.params?.arguments as Record<string, unknown>)?.content).toBe("hello");
  });

  it("reuses command-scoped invocation id for intercepted send_message_to tool calls", async () => {
    const service = new CodexAppServerRuntimeService();
    service.setInterAgentRelayHandler(async () => ({
      accepted: true,
      message: "relayed",
    }));
    const respondSuccess = vi.fn();
    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    const state = {
      runId: "run-professor",
      teamRunId: "team-1",
      memberName: "Professor",
      sendMessageToEnabled: true,
      client: {
        respondSuccess,
        respondError: vi.fn(),
      },
      listeners: new Set([
        (event: { method: string; params: Record<string, unknown> }) => {
          events.push(event);
        },
      ]),
      approvalRecords: new Map(),
      unbindHandlers: [],
    } as any;

    (service as any).handleServerRequest(
      state,
      1,
      "item/tool/call",
      {
        tool: "send_message_to",
        command: {
          id: "call_3",
        },
        arguments: {
          recipient_name: "Student",
          content: "hello",
        },
      },
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(events.map((event) => event.method)).toEqual([
      "item/completed",
    ]);
    expect(events[0]?.params?.id).toBe("call_3");
    expect(events[0]?.params?.item_id).toBe("call_3");
    expect(events[0]?.params?.invocation_id).toBe("call_3");
    expect(events[0]?.params?.id).not.toBe("1");
  });

  it("emits synthetic sender tool-call events for intercepted send_message_to approval requests", async () => {
    const service = new CodexAppServerRuntimeService();
    service.setInterAgentRelayHandler(async () => ({
      accepted: true,
      message: "relayed-from-approval",
    }));
    const respondSuccess = vi.fn();
    const respondError = vi.fn();
    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    const state = {
      runId: "run-professor",
      teamRunId: "team-1",
      memberName: "Professor",
      sendMessageToEnabled: true,
      client: {
        respondSuccess,
        respondError,
      },
      listeners: new Set([
        (event: { method: string; params: Record<string, unknown> }) => {
          events.push(event);
        },
      ]),
      approvalRecords: new Map(),
      unbindHandlers: [],
    } as any;

    (service as any).handleServerRequest(
      state,
      "request-approval-1",
      "item/commandExecution/requestApproval",
      {
        item: {
          id: "approval-call-1",
        },
        command_name: "send_message_to",
        arguments: {
          recipient_name: "Student",
          content: "hello via approval path",
          message_type: "agent_message",
        },
      },
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(respondError).not.toHaveBeenCalled();
    expect(respondSuccess).toHaveBeenCalledWith("request-approval-1", { decision: "accept" });
    expect(events.map((event) => event.method)).toEqual([
      "item/completed",
    ]);
    expect((events[0]?.params?.arguments as Record<string, unknown>)?.recipient_name).toBe(
      "Student",
    );
    expect((events[0]?.params?.arguments as Record<string, unknown>)?.content).toBe(
      "hello via approval path",
    );
  });

  it("reuses command-scoped invocation id for intercepted send_message_to approvals", async () => {
    const service = new CodexAppServerRuntimeService();
    service.setInterAgentRelayHandler(async () => ({
      accepted: true,
      message: "relayed-from-approval",
    }));
    const respondSuccess = vi.fn();
    const respondError = vi.fn();
    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    const state = {
      runId: "run-professor",
      teamRunId: "team-1",
      memberName: "Professor",
      sendMessageToEnabled: true,
      client: {
        respondSuccess,
        respondError,
      },
      listeners: new Set([
        (event: { method: string; params: Record<string, unknown> }) => {
          events.push(event);
        },
      ]),
      approvalRecords: new Map(),
      unbindHandlers: [],
    } as any;

    (service as any).handleServerRequest(
      state,
      2,
      "item/commandExecution/requestApproval",
      {
        command_name: "send_message_to",
        command: {
          call_id: "call_4",
        },
        arguments: {
          recipient_name: "Student",
          content: "hello via approval path",
        },
      },
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(respondError).not.toHaveBeenCalled();
    expect(respondSuccess).toHaveBeenCalledWith(2, { decision: "accept" });
    expect(events[0]?.params?.id).toBe("call_4");
    expect(events[0]?.params?.item_id).toBe("call_4");
    expect(events[0]?.params?.invocation_id).toBe("call_4");
    expect(events[0]?.params?.id).not.toBe("2");
  });

  it("emits structured inter_agent_message event before recipient envelope turn dispatch", async () => {
    const service = new CodexAppServerRuntimeService();
    const request = vi.fn().mockResolvedValue({ turn: { id: "turn-1" } });
    const events: Array<{ method: string; params: Record<string, unknown> }> = [];

    (service as unknown as { sessions: Map<string, unknown> }).sessions.set("run-student", {
      runId: "run-student",
      client: {
        request,
        close: vi.fn().mockResolvedValue(undefined),
      },
      threadId: "thread-student",
      model: "gpt-5.3-codex",
      workingDirectory: "/tmp",
      reasoningEffort: "medium",
      currentStatus: "IDLE",
      activeTurnId: null,
      startup: createReadyStartupState(),
      approvalRecords: new Map(),
      listeners: new Set([
        (event: { method: string; params: Record<string, unknown> }) => {
          events.push(event);
        },
      ]),
      unbindHandlers: [],
      sendMessageToEnabled: true,
      teamRunId: "team-1",
      memberName: "Student",
    });

    await service.injectInterAgentEnvelope("run-student", {
      senderAgentRunId: "run-professor",
      senderAgentName: "Professor",
      recipientName: "Student",
      messageType: "agent_message",
      content: "hello student",
      teamRunId: "team-1",
    });

    expect(events[0]?.method).toBe("inter_agent_message");
    expect(events[0]?.params?.sender_agent_id).toBe("run-professor");
    expect(events[0]?.params?.recipient_role_name).toBe("Student");
    expect(events[0]?.params?.content).toBe("hello student");
    expect(events[0]?.params?.message_type).toBe("agent_message");
    expect(request).toHaveBeenCalledWith(
      "turn/start",
      expect.objectContaining({
        threadId: "thread-student",
      }),
    );
  });
});

describe("CodexAppServerRuntimeService team-manifest instructions", () => {
  it("injects developer instructions and recipient hints at thread/start for codex team member sessions", async () => {
    const request = vi.fn().mockResolvedValue({ thread: { id: "thread-1" } });
    const processManager = {
      getClient: vi.fn().mockResolvedValue({
        request,
        onNotification: vi.fn().mockReturnValue(() => {}),
        onServerRequest: vi.fn().mockReturnValue(() => {}),
        onClose: vi.fn().mockReturnValue(() => {}),
      }),
    } as any;
    const service = new CodexAppServerRuntimeService(processManager);
    service.setInterAgentRelayHandler(async () => ({ accepted: true }));

    await service.createRunSession("run-1", {
      modelIdentifier: "gpt-5-codex",
      workingDirectory: "/tmp/workspace",
      autoExecuteTools: true,
      runtimeMetadata: {
        teamRunId: "team-1",
        memberName: "Professor",
        sendMessageToEnabled: true,
        memberInstructionSources: {
          teamInstructions: "Coordinate with the rest of the team.",
          agentInstructions: "You implement and verify behavior changes.",
        },
        teamMemberManifest: [
          { memberName: "Professor", role: "coordinator", description: "Leads delegation" },
          { memberName: "Student", role: "implementer", description: "Executes tasks" },
        ],
      },
    });

    expect(request).toHaveBeenCalledWith(
      "thread/start",
      expect.objectContaining({
        baseInstructions: expect.stringContaining("## Team Instruction"),
        developerInstructions: expect.stringContaining("## Runtime Instruction"),
        experimentalRawEvents: true,
        persistExtendedHistory: true,
        dynamicTools: [
          expect.objectContaining({
            name: "send_message_to",
            inputSchema: expect.objectContaining({
              properties: expect.objectContaining({
                recipient_name: expect.objectContaining({
                  enum: ["Student"],
                }),
              }),
            }),
          }),
        ],
      }),
    );
    const payload = request.mock.calls[0]?.[1] as {
      baseInstructions?: string | null;
      developerInstructions?: string | null;
    };
    expect(payload.baseInstructions).toContain("## Agent Instruction");
    expect(payload.baseInstructions).toContain("Coordinate with the rest of the team.");
    expect(payload.baseInstructions).toContain("You implement and verify behavior changes.");
    expect(payload.developerInstructions).toContain("Student");
  });
});

describe("CodexAppServerRuntimeService listener continuity", () => {
  it("keeps run listeners attachable across close/restore boundaries", async () => {
    const request = vi.fn().mockImplementation(async (method: string) => {
      if (method === "thread/start" || method === "thread/resume") {
        return { thread: { id: "thread-rebind" } };
      }
      return {};
    });
    const processManager = {
      getClient: vi.fn().mockResolvedValue({
        request,
        onNotification: vi.fn().mockReturnValue(() => {}),
        onServerRequest: vi.fn().mockReturnValue(() => {}),
        onClose: vi.fn().mockReturnValue(() => {}),
        respondSuccess: vi.fn(),
        respondError: vi.fn(),
      }),
    } as any;
    const service = new CodexAppServerRuntimeService(processManager);
    const listener = vi.fn();

    const unsubscribe = service.subscribeToRunEvents("run-rebind", listener);
    expect(
      (service as unknown as { deferredListenersByRunId: Map<string, Set<unknown>> })
        .deferredListenersByRunId.get("run-rebind")?.size,
    ).toBe(1);

    await service.createRunSession("run-rebind", {
      modelIdentifier: "gpt-5-codex",
      workingDirectory: "/tmp/workspace",
      autoExecuteTools: false,
      runtimeMetadata: null,
    });

    const firstState = (service as unknown as { sessions: Map<string, unknown> }).sessions.get(
      "run-rebind",
    );
    expect(firstState).toBeTruthy();
    (service as unknown as { emitEvent: (state: unknown, event: unknown) => void }).emitEvent(firstState, {
      method: "turn/completed",
      params: {},
    });

    expect(listener).toHaveBeenCalledTimes(1);

    await service.closeRunSession("run-rebind");

    await service.restoreRunSession(
      "run-rebind",
      {
        modelIdentifier: "gpt-5-codex",
        workingDirectory: "/tmp/workspace",
        autoExecuteTools: false,
        runtimeMetadata: null,
      },
      { threadId: "thread-rebind", metadata: null },
    );

    const restoredState = (service as unknown as { sessions: Map<string, unknown> }).sessions.get(
      "run-rebind",
    );
    expect(restoredState).toBeTruthy();
    (service as unknown as { emitEvent: (state: unknown, event: unknown) => void }).emitEvent(
      restoredState,
      {
        method: "turn/completed",
        params: {},
      },
    );

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});

describe("CodexAppServerRuntimeService approval policy mapping", () => {
  it("uses approvalPolicy=never when autoExecuteTools=true", async () => {
    const request = vi.fn().mockResolvedValue({ thread: { id: "thread-1" } });
    const processManager = {
      getClient: vi.fn().mockResolvedValue({
        request,
        onNotification: vi.fn().mockReturnValue(() => {}),
        onServerRequest: vi.fn().mockReturnValue(() => {}),
        onClose: vi.fn().mockReturnValue(() => {}),
      }),
    } as any;
    const service = new CodexAppServerRuntimeService(processManager);

    await service.createRunSession("run-auto", {
      modelIdentifier: "gpt-5-codex",
      workingDirectory: "/tmp/workspace",
      autoExecuteTools: true,
      runtimeMetadata: null,
    });

    expect(request).toHaveBeenCalledWith(
      "thread/start",
      expect.objectContaining({
        approvalPolicy: "never",
      }),
    );
  });

  it("uses approvalPolicy=on-request when autoExecuteTools=false", async () => {
    const request = vi.fn().mockResolvedValue({ thread: { id: "thread-2" } });
    const processManager = {
      getClient: vi.fn().mockResolvedValue({
        request,
        onNotification: vi.fn().mockReturnValue(() => {}),
        onServerRequest: vi.fn().mockReturnValue(() => {}),
        onClose: vi.fn().mockReturnValue(() => {}),
      }),
    } as any;
    const service = new CodexAppServerRuntimeService(processManager);

    await service.createRunSession("run-manual", {
      modelIdentifier: "gpt-5-codex",
      workingDirectory: "/tmp/workspace",
      autoExecuteTools: false,
      runtimeMetadata: null,
    });

    expect(request).toHaveBeenCalledWith(
      "thread/start",
      expect.objectContaining({
        approvalPolicy: "on-request",
      }),
    );
  });
});
