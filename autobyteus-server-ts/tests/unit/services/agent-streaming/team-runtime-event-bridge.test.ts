import { describe, expect, it, vi } from "vitest";
import { TeamRuntimeEventBridge } from "../../../../src/services/agent-streaming/team-runtime-event-bridge.js";
import { ServerMessage, ServerMessageType } from "../../../../src/services/agent-streaming/models.js";

describe("TeamRuntimeEventBridge", () => {
  it("maps runtime events using binding runtime kind and annotates member identity", async () => {
    const bindings = [
      { memberRunId: "run-codex", memberName: "Coder", runtimeKind: "codex_app_server" },
      { memberRunId: "run-claude", memberName: "Planner", runtimeKind: "claude_agent_sdk" },
    ];
    const codexAdapter = {
      subscribeToRunEvents: vi.fn((_: string, onEvent: (event: unknown) => void) => {
        onEvent({ method: "turn/started" });
        return () => {};
      }),
    };
    const claudeAdapter = {
      subscribeToRunEvents: vi.fn((_: string, onEvent: (event: unknown) => void) => {
        onEvent({ method: "turn/completed" });
        return () => {};
      }),
    };
    const runtimeAdapterRegistry = {
      resolveAdapter: vi.fn((runtimeKind: string) =>
        runtimeKind === "codex_app_server" ? codexAdapter : claudeAdapter,
      ),
    };
    const runtimeEventMessageMapper = {
      mapForRuntime: vi.fn((runtimeKind: string, event: unknown) => {
        const payload = event as Record<string, unknown>;
        return new ServerMessage(ServerMessageType.AGENT_STATUS, {
          runtime_kind: runtimeKind,
          method: String(payload.method ?? ""),
        });
      }),
    };
    const onMessage = vi.fn();

    const bridge = new TeamRuntimeEventBridge(
      { getTeamBindings: vi.fn(() => bindings) } as any,
      runtimeAdapterRegistry as any,
      runtimeEventMessageMapper as any,
    );

    const unsubscribe = bridge.subscribeTeam("team-1", onMessage);

    expect(runtimeAdapterRegistry.resolveAdapter).toHaveBeenCalledWith("codex_app_server");
    expect(runtimeAdapterRegistry.resolveAdapter).toHaveBeenCalledWith("claude_agent_sdk");
    expect(runtimeEventMessageMapper.mapForRuntime).toHaveBeenCalledWith(
      "codex_app_server",
      { method: "turn/started" },
    );
    expect(runtimeEventMessageMapper.mapForRuntime).toHaveBeenCalledWith(
      "claude_agent_sdk",
      { method: "turn/completed" },
    );
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: ServerMessageType.AGENT_STATUS,
        payload: expect.objectContaining({
          runtime_kind: "codex_app_server",
          agent_name: "Coder",
          agent_id: "run-codex",
        }),
      }),
    );
    expect(onMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: ServerMessageType.AGENT_STATUS,
        payload: expect.objectContaining({
          runtime_kind: "claude_agent_sdk",
          agent_name: "Planner",
          agent_id: "run-claude",
        }),
      }),
    );

    await unsubscribe();
  });

  it("emits bridge error when adapter resolution fails", () => {
    const bridge = new TeamRuntimeEventBridge(
      {
        getTeamBindings: vi.fn(() => [
          { memberRunId: "run-1", memberName: "A", runtimeKind: "claude_agent_sdk" },
        ]),
      } as any,
      {
        resolveAdapter: vi.fn(() => {
          throw new Error("missing adapter");
        }),
      } as any,
      { mapForRuntime: vi.fn() } as any,
    );

    const onMessage = vi.fn();
    bridge.subscribeTeam("team-1", onMessage);

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ServerMessageType.ERROR,
        payload: expect.objectContaining({
          code: "TEAM_RUNTIME_EVENT_BRIDGE_ERROR",
        }),
      }),
    );
  });

  it("emits bridge error when adapter does not support event subscriptions", () => {
    const bridge = new TeamRuntimeEventBridge(
      {
        getTeamBindings: vi.fn(() => [
          { memberRunId: "run-1", memberName: "A", runtimeKind: "codex_app_server" },
        ]),
      } as any,
      { resolveAdapter: vi.fn(() => ({})) } as any,
      { mapForRuntime: vi.fn() } as any,
    );

    const onMessage = vi.fn();
    bridge.subscribeTeam("team-1", onMessage);

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ServerMessageType.ERROR,
        payload: expect.objectContaining({
          code: "TEAM_RUNTIME_EVENT_BRIDGE_ERROR",
        }),
      }),
    );
  });

  it("builds initial team and member status snapshot messages from runtime adapters", () => {
    const bridge = new TeamRuntimeEventBridge(
      {
        getTeamBindings: vi.fn(() => [
          { memberRunId: "run-codex", memberName: "Professor", runtimeKind: "codex_app_server" },
          { memberRunId: "run-claude", memberName: "Student", runtimeKind: "claude_agent_sdk" },
        ]),
      } as any,
      {
        resolveAdapter: vi.fn((runtimeKind: string) =>
          runtimeKind === "codex_app_server"
            ? {
                getRunStatus: vi.fn(() => "RUNNING"),
                isRunActive: vi.fn(() => true),
              }
            : {
                isRunActive: vi.fn(() => true),
              },
        ),
      } as any,
      { mapForRuntime: vi.fn() } as any,
    );

    const messages = bridge.getInitialSnapshotMessages("team-1");

    expect(messages).toHaveLength(3);
    expect(messages[0]).toMatchObject({
      type: ServerMessageType.TEAM_STATUS,
      payload: {
        new_status: "PROCESSING",
      },
    });
    expect(messages[1]).toMatchObject({
      type: ServerMessageType.AGENT_STATUS,
      payload: {
        new_status: "RUNNING",
        agent_name: "Professor",
        agent_id: "run-codex",
      },
    });
    expect(messages[2]).toMatchObject({
      type: ServerMessageType.AGENT_STATUS,
      payload: {
        new_status: "IDLE",
        agent_name: "Student",
        agent_id: "run-claude",
      },
    });
  });
});
