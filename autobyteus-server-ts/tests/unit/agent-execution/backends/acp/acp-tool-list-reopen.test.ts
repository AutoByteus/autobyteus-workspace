import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AcpAgentProcess } from "../../../../../src/runtime-management/acp/acp-agent-process.js";
import type { AcpAgentLaunchProfile } from "../../../../../src/runtime-management/acp/acp-agent-launch-profile.js";
import { AcpAgentRunBackendFactory } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.js";
import type { AcpAgentRunBackend } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-backend.js";
import { AcpAgentRunContext } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-context.js";
import { grokBuildSessionProfile } from "../../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";
import { TOOL_LIST_UPDATE_NOTICE_SENDER_ID } from "../../../../../src/agent-execution/domain/system-task-notification-senders.js";
import { createAgentToolMcpRunSessionsStub } from "../../../../helpers/agent-tool-mcp-run-sessions-stub.js";
import { FAKE_ACP_AGENT, fixturePath, fixtureSessionId, readFixture, waitFor, writeCustomFixture, type FixtureRow } from "./acp-fake-agent-harness.js";

// The Grok reopen sequence (design: "Grok reopen sequence", SR-003/SR-004): end first, then load,
// with the run's AcpPreparationOwner as the single holder of its process. The fake ACP agent
// replays recorded fixtures; each spawn takes the next fixture.

const tempDir = (prefix: string) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const backends: AcpAgentRunBackend[] = [];
afterEach(async () => {
  for (const backend of backends.splice(0)) await backend.terminate();
  vi.restoreAllMocks();
});

const failingLoadFixture = (): string => {
  const rows = readFixture("load");
  const loadIndex = rows.findIndex((row) => row.dir === "out" && row.msg.method === "session/load");
  const failing: FixtureRow[] = [...rows.slice(0, loadIndex + 1),
    { dir: "in", msg: { jsonrpc: "2.0", id: rows[loadIndex]!.msg.id, error: { code: -32603, message: "Session not found." } } }];
  return writeCustomFixture(failing);
};

const createRestoredRun = async (reopenFixtures: string[]) => {
  const fixtures = [fixturePath("load"), ...reopenFixtures];
  let spawned = 0;
  const launchProfile: AcpAgentLaunchProfile = {
    agentLabel: "Fake Grok",
    command: () => process.execPath,
    args: () => [FAKE_ACP_AGENT],
    env: (base) => ({ ...base, FAKE_ACP_FIXTURE: fixtures[Math.min(spawned++, fixtures.length - 1)]!, FAKE_ACP_REPORT_MCP_READY: "1" }),
    normalizeModels: () => [],
  };
  const processes: AcpAgentProcess[] = [];
  const spawn = AcpAgentProcess.spawn.bind(AcpAgentProcess);
  vi.spyOn(AcpAgentProcess, "spawn").mockImplementation((spec) => {
    const created = spawn(spec);
    processes.push(created);
    return created;
  });
  const skill = { name: "codebook" } as never;
  const cleanupSkills = vi.fn(async () => undefined);
  const mcpSessions = createAgentToolMcpRunSessionsStub({ enabledTools: () => ["alpha"] });
  const factory = new AcpAgentRunBackendFactory({
    launchProfile,
    sessionProfile: grokBuildSessionProfile,
    definitions: { getAgentDefinitionById: async () => new AgentDefinition({
      id: "def-1", name: "Reviewer", role: "Code reviewer", description: "Reviews code", toolNames: ["alpha"],
    }) } as never,
    skills: { resolveSkillScope: () => "CONFIGURED", resolveConfiguredSkillBindingsForAgent: () => [] } as never,
    workspaces: { resolveWorkingDirectory: async () => tempDir("acp-reopen-ws-") },
    mcpSessions: mcpSessions as never,
    skillMaterializer: {
      materializeConfiguredWorkspaceSkills: async (request: { onAcquired: (value: unknown) => void }) => {
        request.onAcquired(skill);
        return { materializedSkills: [skill], effectiveRequests: [] };
      },
      cleanupMaterializedWorkspaceSkills: cleanupSkills,
    } as never,
  });
  const sessionId = fixtureSessionId("load");
  const backend = await factory.beginPreparation({ kind: "restore", context: new AgentRunContext({
    runId: "run-grok",
    config: new AgentRunConfig({
      agentDefinitionId: "def-1", llmModelIdentifier: "grok-4.7", autoExecuteTools: false,
      memoryDir: tempDir("acp-reopen-memory-"), runtimeKind: RuntimeKind.GROK_BUILD,
    }),
    runtimeContext: new AcpAgentRunContext(sessionId),
  }) }).prepare();
  backends.push(backend);
  const events: AgentRunEvent[] = [];
  backend.subscribeToSourceEventBatches((batch) => { events.push(...batch); });
  const start = () => backend.dispatchUserInput({ kind: "start_turn", message: new AgentInputUserMessage("again") });
  const definition = (toolNames: string[]) => ({ toolNames }) as never;
  const alive = () => processes.filter((candidate) => candidate.exited === null);
  return { backend, processes, alive, events, start, definition, cleanupSkills, mcpSessions, sessionId };
};

describe("AcpAgentRunBackend tool list reopen (Grok)", () => {
  it("ends the open process first, loads the same session in a new one, then sends the prompt", async () => {
    const run = await createRestoredRun([fixturePath("load")]);
    const failure = vi.spyOn(run.backend, "handleSessionFailure");
    expect(run.alive()).toHaveLength(1);

    expect(await run.backend.applyDefinitionTools(run.definition(["alpha", "beta"])))
      .toEqual({ kind: "on_next_turn", toolNames: ["alpha", "beta"] });
    expect(run.backend.getToolNames()).toEqual(["alpha"]);

    const result = await run.start();
    expect(result).toMatchObject({ forwarded: true, platformAgentRunId: run.sessionId });
    expect(run.processes).toHaveLength(2);
    await waitFor(() => run.processes[0]!.exited !== null);
    expect(run.alive()).toEqual([run.processes[1]]);
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(run.backend.getToolNames()).toEqual(["alpha", "beta"]);
    // The deliberate end of the first process is not a run failure.
    expect(failure).not.toHaveBeenCalled();
    expect(run.backend.isActive()).toBe(true);
    expect(run.cleanupSkills).not.toHaveBeenCalled();
  });

  it("ends the reopened process when the run is stopped after a reopen", async () => {
    const run = await createRestoredRun([fixturePath("load")]);
    await run.backend.applyDefinitionTools(run.definition(["alpha", "beta"]));
    await run.start();
    await run.backend.terminate();
    backends.splice(0);
    await waitFor(() => run.alive().length === 0);
    expect(run.processes).toHaveLength(2);
    expect(run.cleanupSkills).toHaveBeenCalledOnce();
  });

  it("leaves no runtime session after a failed reopen: notice shown, input not sent, every operation safe, retried next turn start", async () => {
    const run = await createRestoredRun([failingLoadFixture(), fixturePath("load")]);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await run.backend.applyDefinitionTools(run.definition(["alpha", "beta"]));

    const failed = await run.start();
    expect(failed).toMatchObject({ forwarded: false, code: "RUNTIME_SESSION_REOPEN_FAILED", turnId: null });
    expect(failed.message).toContain("Session not found.");
    await waitFor(() => run.alive().length === 0);
    expect(run.events.filter((event) => event.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION).map((event) => event.payload))
      .toEqual([{ sender_id: TOOL_LIST_UPDATE_NOTICE_SENDER_ID, content: "Couldn't give this run its new tools.", action: "restart_run" }]);
    expect(run.events.some((event) => event.eventType === AgentRunEventType.TURN_STARTED)).toBe(false);

    expect(run.backend.isActive()).toBe(true);
    expect(run.backend.getLifecycleSnapshot()).toEqual({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    expect(await run.backend.approveToolInvocation("call-1", true)).toMatchObject({ accepted: false, code: "NO_PENDING_APPROVAL" });
    expect(await run.backend.interrupt("turn-1")).toMatchObject({ accepted: false, code: "NO_ACTIVE_TURN" });
    expect(await run.backend.dispatchUserInput({
      kind: "append_to_active_turn", turnId: "turn-1", message: new AgentInputUserMessage("x"),
    })).toMatchObject({ forwarded: false, code: "UNSUPPORTED_RUNTIME_COMMAND" });
    expect(run.backend.getPlatformAgentRunId()).toBe(run.sessionId);
    expect(run.backend.getToolNames()).toEqual(["alpha"]);

    expect(await run.start()).toMatchObject({ forwarded: true });
    expect(run.backend.getToolNames()).toEqual(["alpha", "beta"]);
    expect(run.alive()).toHaveLength(1);
  });

  it("stopping after a failed reopen ends nothing more and releases the skills", async () => {
    const run = await createRestoredRun([failingLoadFixture()]);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await run.backend.applyDefinitionTools(run.definition(["alpha", "beta"]));
    await run.start();
    await waitFor(() => run.alive().length === 0);
    const stops = run.processes.map((candidate) => vi.spyOn(candidate, "stop"));

    expect(await run.backend.terminate()).toEqual({ accepted: true });
    backends.splice(0);
    for (const stop of stops) expect(stop).not.toHaveBeenCalled();
    expect(run.cleanupSkills).toHaveBeenCalledOnce();
    expect(run.backend.isActive()).toBe(false);
  });

  it("needs no reopen for a change reverted before the next turn start", async () => {
    const run = await createRestoredRun([fixturePath("load")]);
    await run.backend.applyDefinitionTools(run.definition(["alpha", "beta"]));
    expect(await run.backend.applyDefinitionTools(run.definition(["alpha"]))).toEqual({ kind: "unchanged", toolNames: ["alpha"] });
    expect(await run.start()).toMatchObject({ forwarded: true });
    expect(run.processes).toHaveLength(1);
  });
});
