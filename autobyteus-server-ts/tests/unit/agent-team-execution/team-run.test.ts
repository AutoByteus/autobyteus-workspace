import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";

const createBackend = () => ({
  runId: "team-run-1",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  getRuntimeContext: () => null,
  isActive: () => true,
  getStatus: () => "IDLE",
  subscribeToEvents: vi.fn().mockImplementation(() => () => undefined),
  postMessage: vi.fn().mockResolvedValue({ accepted: true }),
  deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
  approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
  interrupt: vi.fn().mockResolvedValue({ accepted: true }),
  terminate: vi.fn().mockResolvedValue({ accepted: true }),
});

describe("TeamRun", () => {
  it("defaults omitted team messages to the coordinator member from active context", async () => {
    const backend = createBackend();
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-1",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        coordinatorMemberName: "Coordinator",
        config: new TeamRunConfig({
          teamDefinitionId: "team-def-1",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          coordinatorMemberName: "Coordinator",
          memberConfigs: [],
        }),
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    await run.postMessage(new AgentInputUserMessage("continue"));

    expect(backend.postMessage).toHaveBeenCalledWith(expect.any(AgentInputUserMessage), "Coordinator");
  });

  it("falls back to config coordinator member when context coordinator is absent", async () => {
    const backend = createBackend();
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-1",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        coordinatorMemberName: null,
        config: new TeamRunConfig({
          teamDefinitionId: "team-def-1",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          coordinatorMemberName: "Coordinator",
          memberConfigs: [],
        }),
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    await run.postMessage(new AgentInputUserMessage("continue"));

    expect(backend.postMessage).toHaveBeenCalledWith(expect.any(AgentInputUserMessage), "Coordinator");
  });
});
