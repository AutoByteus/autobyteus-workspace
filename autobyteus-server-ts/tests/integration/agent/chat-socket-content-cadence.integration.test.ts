/**
 * Content cadence on the sequenced chat sockets (autobyteus-139): Team `/ws/agent-team`, Org
 * `/ws/agent-org` and delegated agents `/ws/agent-collaboration`. Real handlers, real
 * RootEventPublisher and real WebSockets; root events are published directly, as a live root would.
 *
 * Cases (each per socket): AC-001 30-delta burst with identical "running" statuses; AC-002 every
 * root sequence covered exactly once and in order; AC-003 interval change; AC-004 boundaries flush
 * pending text first; AC-009 two agents interleaved. Command: `pnpm -C autobyteus-server-ts exec
 * vitest run tests/integration/agent/chat-socket-content-cadence.integration.test.ts --no-watch`.
 */
import fs from "node:fs";
import path from "node:path";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import { parseTeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY } from "../../../src/config/streaming-content-flush-interval-setting.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import {
  createAgentOrgRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { AgentCollaborationStreamHandler } from "../../../src/services/agent-streaming/agent-collaboration-stream-handler.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import type { TeamAgentEvent, TeamTokenUsageDetails } from "../../../src/agent-team-execution/domain/team-agent-event.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails } from "../../../src/agent-team-execution/domain/team-agent-status.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { validateCollaborationCommunicationMessageArray } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message-schema.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import type { StandaloneRootEvent } from "../../../src/standalone-agent-run-root/domain/standalone-root-event.js";
import { emptyStandaloneRootMessages, emptyStandaloneRootTree } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

type AgentKey = "A" | "B";
type Frame = Readonly<{ at: number; label: string; first: number | null; through: number | null; texts: readonly string[] }>;
type Boundary = "segment_end" | "tool" | "error" | "terminal_status" | "token_usage" | "task_event";

/** One socket under test: how to open it, publish root events and read its frames. */
type Scenario = Readonly<{
  name: string;
  open(): Promise<{ url: string; close(): Promise<void>; publish: Publisher }>;
  read(raw: string): Frame;
}>;
type Publisher = Readonly<{
  status(agent: AgentKey, status?: "running" | "idle"): void;
  start(agent: AgentKey): void;
  content(agent: AgentKey, delta: string): void;
  boundary(agent: AgentKey, boundary: Boundary): void;
  currentSequence(): number;
  /** A direct root subscriber, as applications and the Team lifecycle observer subscribe. */
  subscribeRoot(listener: () => void): () => void;
}>;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const turnId = "turn-1";
const segmentId = (agent: AgentKey) => `segment-${agent}`;
const runningStatus = { trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null };

const tokenUsageDetails = (agentRunId: string): TeamTokenUsageDetails => ({
  usageEventId: `usage-${agentRunId}`, idempotencyKey: `usage-key-${agentRunId}`, observedAt: "2026-10-18T00:00:00.000Z",
  turnId, llmCallId: null, modelProvider: null, modelIdentifier: null, modelValue: null,
  usageScope: "per_call", inputTokenSemantic: "unknown",
  standardInputTokens: 10, cacheMissInputTokens: null, cacheReadInputTokens: null, cacheCreationInputTokens: null,
  cacheCreation5mInputTokens: null, cacheCreation1hInputTokens: null, cacheState: "unknown",
  reasoningOutputTokens: null, billableOutputTokens: 5, meterDeltaInputTokens: null, meterDeltaOutputTokens: null,
  meterDeltaTotalTokens: null, inputPricePerMillion: null, outputPricePerMillion: null,
  cachedInputReadPricePerMillion: null, cachedInputWritePricePerMillion: null, cachedInputWrite5mPricePerMillion: null,
  cachedInputWrite1hPricePerMillion: null, estimatedApiInputCost: null, estimatedApiStandardInputCost: null,
  estimatedApiCacheReadInputCost: null, estimatedApiCacheCreationInputCost: null, estimatedApiCacheCreation5mInputCost: null,
  estimatedApiCacheCreation1hInputCost: null, estimatedApiOutputCost: null, estimatedApiReasoningOutputCost: null,
  estimatedApiTotalCost: null, currency: null, apiCostStatus: "price_missing", missingPriceDimensions: [],
  pricingPolicyKey: null, selectedPricingTierId: null, latestPromptTokens: null, effectiveContextWindowTokens: null,
  contextWindowUsagePercent: null, contextCompactionThresholdTokens: null, reportsModelCall: true,
  outputThroughput: null, runSummaryAfterEvent: null, qualityFlags: [],
});

/** Team-agent events; the root envelope reuses their presentation bodies. */
const teamAgentEvent = (agentRunId: string, kind: "status" | "start" | "content" | Boundary, value = "", status: "running" | "idle" = "running"): TeamAgentEvent => {
  const segment = { segmentId: segmentId(agentRunId.endsWith("a") ? "A" : "B"), turnId };
  switch (kind) {
    case "status": return { eventType: "AGENT_STATUS", statusHint: status, details: createTeamAgentStatusDetails({ status, trigger: null }) } as TeamAgentEvent;
    case "terminal_status": return { eventType: "AGENT_STATUS", statusHint: "idle", details: createTeamAgentStatusDetails({ status: "idle", trigger: null }) } as TeamAgentEvent;
    case "start": return { eventType: "SEGMENT_START", statusHint: "running", details: { ...segment, segmentType: "text", metadata: null } };
    case "content": return { eventType: "SEGMENT_CONTENT", statusHint: "running", details: { ...segment, segmentType: "text", delta: value } };
    case "segment_end": return { eventType: "SEGMENT_END", statusHint: "running", details: { ...segment, metadata: null, interrupted: false, reason: null, failed: false, error: null } };
    case "tool": return { eventType: "TOOL_EXECUTION_STARTED", statusHint: "running", details: { invocationId: `tool-${agentRunId}`, toolName: "run_bash", turnId, arguments: {} } };
    case "error": return { eventType: "ERROR", statusHint: "running", details: { code: "TOOL_DIAGNOSTIC", message: "diagnostic", errorScope: "turn", errorEffect: "diagnostic", turnId } } as TeamAgentEvent;
    case "token_usage": return { eventType: "TOKEN_USAGE_UPDATED", statusHint: "running", details: tokenUsageDetails(agentRunId) };
    case "task_event": throw new Error("A task event is a root event, not an agent event.");
  }
};

const teamScenario: Scenario = {
  name: "Team /ws/agent-team",
  open: async () => {
    const fixtures = path.resolve(process.cwd(), "tests/fixtures");
    const json = (dir: string, name: string) => JSON.parse(fs.readFileSync(path.join(fixtures, dir, name), "utf8")) as unknown;
    const tree = validateTeamRunExecutionTreePayload(json("current-team-run-v2/case-001-delegated-task-team-forest", "team_run_execution_tree.json"), "team-run-root");
    // The root's in-memory communication snapshot, built from the fixture's message list.
    const messages = Object.freeze({
      schemaVersion: 1 as const,
      rootTeamRunId: "team-run-root",
      messages: validateCollaborationCommunicationMessageArray((json("app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team", "team_communication_messages.json") as { messages: unknown }).messages),
    });
    const publisher = new RootEventPublisher<TeamRunEvent>();
    const root = {
      teamRunId: "team-run-root",
      openPackageSnapshotConnection: () => publisher.openSnapshotConnection(() => ({ tree, closedTaskExecutions: [], messages, inputStates: [], statuses: [] })),
      executeAgentCommand: vi.fn(async () => ({ accepted: true })),
      getExecutionTreeSnapshot: () => tree,
    };
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      { resolveActiveTeamRun: vi.fn(async () => root), getActiveTeamRun: vi.fn(() => root), recordRunActivity: vi.fn(async () => undefined) } as never,
      { getLifecycleSnapshot: () => ({ teamRunId: "team-run-root", isActive: true }), subscribeToLifecycle: () => () => undefined } as never,
    );
    const bindings = { A: "member-run-a", B: "member-run-b" } as const;
    const execution = (agent: AgentKey) => createTeamAgentExecutionBinding({
      root: createTeamRootExecutionIdentity("team-run-root"), memberAddress: `/member-${agent}`, agentRunId: bindings[agent],
    });
    const agentEvent = (agent: AgentKey, kind: Parameters<typeof teamAgentEvent>[1], value?: string, status?: "running" | "idle") =>
      publisher.publish({ eventSourceType: TeamRunEventSourceType.AGENT, execution: execution(agent), payload: teamAgentEvent(bindings[agent], kind, value, status) });
    const app = await serve({ teamHandler: handler });
    return {
      url: `${app.baseUrl}/ws/agent-team/team-run-root`,
      close: app.close,
      publish: {
        status: (agent, status = "running") => agentEvent(agent, "status", "", status),
        start: (agent) => agentEvent(agent, "start"),
        content: (agent, delta) => agentEvent(agent, "content", delta),
        boundary: (agent, boundary) => boundary === "task_event"
          ? publisher.publish({ eventSourceType: TeamRunEventSourceType.TASK_EXECUTIONS_CLOSED, taskExecutions: [{ agentRunId: "task-run-1" }] })
          : agentEvent(agent, boundary),
        currentSequence: () => publisher.getCurrentChangeSequence(),
        subscribeRoot: (listener) => publisher.subscribe(listener),
      },
    };
  },
  read: (raw) => {
    const message = parseTeamStreamServerMessage(raw);
    const payload = message.payload as Record<string, unknown>;
    const first = typeof payload.change_sequence === "number" ? payload.change_sequence : null;
    if (message.type === "SEGMENT_CONTENT_BATCH") {
      return { at: Date.now(), label: "BATCH", first, through: message.payload.change_sequence_through,
        texts: message.payload.items.map((item) => `${item.agent_run_id.endsWith("a") ? "A" : "B"}:${item.delta}`) };
    }
    const label = message.type === "AGENT_STATUS" ? `AGENT_STATUS:${String(payload.status)}` : message.type;
    return { at: Date.now(), label, first, through: first, texts: [] };
  },
};

/** Org and delegated-agent sockets share the root execution envelope. */
const rootScenario = (kind: "agent_org" | "agent"): Scenario => ({
  name: kind === "agent_org" ? "Org /ws/agent-org" : "delegated agents /ws/agent-collaboration",
  open: async () => {
    const rootRunId = kind === "agent_org" ? "org-run-1" : "host-run-1";
    const runIds = { A: "agent-run-a", B: "agent-run-b" } as const;
    const execution = (agent: AgentKey) => createCollaborationMemberExecutionIdentity({
      root: createAgentOrgRootExecutionIdentity(rootRunId), memberAddress: `/member-${agent}` as never, agentRunId: runIds[agent],
    });
    const publisher = new RootEventPublisher<AgentOrgRunEvent & StandaloneRootEvent>();
    const present = (agent: AgentKey, event: TeamAgentEvent) => {
      const team = projectTeamAgentEventMessage(createTeamAgentExecutionBinding({
        root: createTeamRootExecutionIdentity("presentation"), memberAddress: `/member-${agent}`, agentRunId: runIds[agent],
      }), event, 1);
      const { change_sequence: _sequence, agent_run_id: _agent, ...payload } = team.payload as Record<string, unknown>;
      publisher.publish({ kind: "agent_presentation", execution: execution(agent), message: { type: team.type, payload } } as never);
    };
    const agentEvent = (agent: AgentKey, eventKind: Parameters<typeof teamAgentEvent>[1], value?: string, status?: "running" | "idle") =>
      present(agent, teamAgentEvent(runIds[agent], eventKind, value, status));
    let handlers: Parameters<typeof serve>[0];
    if (kind === "agent_org") {
      const members = [testOrgAgentNode("/member-A", runIds.A), testOrgAgentNode("/member-B", runIds.B)];
      const tree = testAgentOrgExecutionTree({ orgRunId: rootRunId, members });
      const statuses = members.map((member) => ({
        execution: createCollaborationMemberExecutionIdentity({ root: createAgentOrgRootExecutionIdentity(rootRunId), memberAddress: member.address, agentRunId: member.agentRunId }),
        details: { status: "idle" as const, trigger: null, errorMessage: null, recoverableBlock: null }, statusHint: "IDLE" as const,
      }));
      const snapshot = { tree, closedTaskExecutions: [], messages: { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: rootRunId, messages: [] }, statuses, inputStates: [] };
      const run = { orgRunId: rootRunId, isActive: () => true, openPackageSnapshotConnection: () => publisher.openSnapshotConnection(() => snapshot),
        executeAgentCommand: vi.fn(), executeAgentCommandWithExecutionKind: vi.fn() };
      handlers = { orgHandler: new AgentOrgStreamHandler({ getActive: (id: string) => id === rootRunId ? run : null, recordRunActivity: vi.fn(async () => undefined) } as never) };
    } else {
      const tree = emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: rootRunId, agentDefinitionId: "assistant" }, createdAt: "2026-10-18T00:00:00.000Z" });
      const snapshot = { tree, closedTaskExecutions: [], messages: emptyStandaloneRootMessages(rootRunId), statuses: [], inputStates: [] };
      const root = { ensureHostReady: vi.fn(async () => ({ runId: rootRunId })), isHostLive: () => true, getExecutionTreeSnapshot: () => tree,
        openPackageSnapshotConnection: () => publisher.openSnapshotConnection(() => snapshot as never) };
      handlers = { collaborationHandler: new AgentCollaborationStreamHandler({ resolveRoot: async () => root as never, getActive: () => root as never }) };
    }
    const app = await serve(handlers);
    return {
      url: `${app.baseUrl}/ws/${kind === "agent_org" ? "agent-org" : "agent-collaboration"}/${rootRunId}`,
      close: app.close,
      publish: {
        status: (agent, status = "running") => agentEvent(agent, "status", "", status),
        start: (agent) => agentEvent(agent, "start"),
        content: (agent, delta) => agentEvent(agent, "content", delta),
        boundary: (agent, boundary) => boundary === "task_event"
          ? publisher.publish({ kind: "task_executions_closed", taskExecutions: [{ agentRunId: "task-run-1" }] } as never)
          : agentEvent(agent, boundary),
        currentSequence: () => publisher.getCurrentChangeSequence(),
        subscribeRoot: (listener) => publisher.subscribe(listener),
      },
    };
  },
  read: (raw) => {
    const message = CollaborationStreamServerMessageSchema.parse(JSON.parse(raw));
    if (message.type !== "ROOT_EXECUTION_EVENT" || message.payload.root_subject_kind === "agent_team") {
      return { at: Date.now(), label: message.type, first: null, through: null, texts: [] };
    }
    const { change_sequence: first, change_sequence_through: through, event } = message.payload;
    if (event.kind === "agent_presentation_batch") {
      return { at: Date.now(), label: "BATCH", first, through: through ?? first,
        texts: event.items.map((item) => `${item.agent_run_id.endsWith("a") ? "A" : "B"}:${item.message.payload.delta}`) };
    }
    const label = event.kind !== "agent_presentation" ? event.kind
      : event.message.type === "AGENT_STATUS" ? `AGENT_STATUS:${event.message.payload.status}` : event.message.type;
    return { at: Date.now(), label, first, through: first, texts: [] };
  },
});

const serve = async (handlers: {
  teamHandler?: AgentTeamStreamHandler; orgHandler?: AgentOrgStreamHandler; collaborationHandler?: AgentCollaborationStreamHandler;
}) => {
  const app = fastify();
  await app.register(websocket);
  const unused = { connect: async () => null, handleMessage: async () => undefined, disconnect: async () => undefined };
  await registerAgentWebsocket(app, unused as never, (handlers.teamHandler ?? unused) as never, handlers.orgHandler, handlers.collaborationHandler);
  const address = new URL(await app.listen({ port: 0, host: "127.0.0.1" }));
  return { baseUrl: `ws://${address.hostname}:${address.port}`, close: async () => { await app.close(); } };
};

const scenarios = [teamScenario, rootScenario("agent_org"), rootScenario("agent")];
const openSockets: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(openSockets.splice(0).map((close) => close()));
  delete process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY];
});

const connect = async (scenario: Scenario, intervalMs = 500) => {
  process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] = String(intervalMs);
  const opened = await scenario.open();
  const socket = new WebSocket(opened.url);
  const frames: Frame[] = [];
  socket.on("message", (data) => frames.push(scenario.read(data.toString())));
  openSockets.push(async () => { socket.close(); await opened.close(); });
  const deadline = Date.now() + 2_000;
  // The lifecycle frame follows the barrier subscription: live events are published after it.
  while (!frames.some((frame) => frame.label.endsWith("LIFECYCLE")) && Date.now() < deadline) await wait(5);
  expect(frames.some((frame) => frame.label.endsWith("LIFECYCLE"))).toBe(true);
  const live = () => frames.filter((frame) => frame.first !== null);
  return { publish: opened.publish, frames, live };
};

/** AC-002: the sequenced frames cover 1..current exactly once, contiguous and in order. */
const expectContiguousCoverage = (frames: readonly Frame[], current: number): void => {
  let next = 1;
  for (const frame of frames) {
    expect(frame.first, JSON.stringify(frames.map((f) => [f.label, f.first, f.through]))).toBe(next);
    expect(frame.through!).toBeGreaterThanOrEqual(frame.first!);
    next = frame.through! + 1;
  }
  expect(next - 1).toBe(current);
};

describe.each(scenarios)("content cadence on $name", (scenario) => {
  it("sends a 30-delta burst with identical running statuses as one batch after the window (AC-001, AC-002)", async () => {
    const test = await connect(scenario);
    test.publish.start("A");
    const deltas = Array.from({ length: 30 }, (_, index) => `${String(index).padStart(2, "0")}|`);
    const openedAt = Date.now();
    for (const delta of deltas) {
      test.publish.status("A");
      test.publish.content("A", delta);
    }
    await wait(350);
    expect(test.live().filter((frame) => frame.label === "BATCH")).toHaveLength(0);
    await wait(300);
    const batches = test.live().filter((frame) => frame.label === "BATCH");
    expect(batches).toHaveLength(1);
    expect(batches[0]!.texts).toEqual([`A:${deltas.join("")}`]);
    expect(batches[0]!.at - openedAt).toBeGreaterThanOrEqual(450);
    // Only the first status has no baseline on this connection; every later identical one is absorbed.
    expect(test.live().map((frame) => frame.label)).toEqual(["SEGMENT_START", "AGENT_STATUS:running", "BATCH"]);
    expectContiguousCoverage(test.live(), test.publish.currentSequence());
  });

  it("coalesces two interleaved agents into one batch, each agent's text in order (AC-009)", async () => {
    const test = await connect(scenario);
    test.publish.start("A"); test.publish.start("B");
    test.publish.status("A"); test.publish.status("B");
    for (let round = 0; round < 10; round += 1) {
      test.publish.content("A", `a${round}`); test.publish.status("B");
      test.publish.content("B", `b${round}`); test.publish.status("A");
    }
    await wait(350);
    expect(test.live().filter((frame) => frame.label === "BATCH")).toHaveLength(0);
    await wait(300);
    const batches = test.live().filter((frame) => frame.label === "BATCH");
    expect(batches.map((frame) => frame.texts)).toEqual([[
      `A:${Array.from({ length: 10 }, (_, round) => `a${round}`).join("")}`,
      `B:${Array.from({ length: 10 }, (_, round) => `b${round}`).join("")}`,
    ]]);
    expectContiguousCoverage(test.live(), test.publish.currentSequence());
  });

  it("lets a boundary from either interleaved agent close the batch first (AC-009, AC-004)", async () => {
    const test = await connect(scenario);
    test.publish.start("A"); test.publish.start("B");
    test.publish.content("A", "x"); test.publish.content("B", "1"); test.publish.content("A", "y");
    test.publish.boundary("B", "segment_end");
    await wait(100);
    expect(test.live().map((frame) => [frame.label, frame.texts])).toEqual([
      ["SEGMENT_START", []], ["SEGMENT_START", []], ["BATCH", ["A:xy", "B:1"]], ["SEGMENT_END", []],
    ]);
    expectContiguousCoverage(test.live(), test.publish.currentSequence());
  });

  it("delivers pending text before every boundary, immediately and contiguously (AC-004)", async () => {
    const test = await connect(scenario);
    const boundaries: Boundary[] = ["tool", "error", "token_usage", "task_event", "terminal_status", "segment_end"];
    test.publish.start("A");
    const openedAt = Date.now();
    boundaries.forEach((boundary, index) => {
      test.publish.content("A", `t${index}`);
      test.publish.boundary("A", boundary);
    });
    await wait(100);
    const live = test.live().slice(1);
    expect(live.map((frame) => frame.label)).toEqual(boundaries.flatMap((boundary) => ["BATCH", ({
      tool: "TOOL_EXECUTION_STARTED", error: "ERROR", token_usage: "TOKEN_USAGE_UPDATED",
      task_event: scenario === teamScenario ? "TASK_EXECUTIONS_CLOSED" : "task_executions_closed",
      terminal_status: "AGENT_STATUS:idle", segment_end: "SEGMENT_END",
    } as const)[boundary]]));
    expect(live.filter((frame) => frame.label === "BATCH").map((frame) => frame.texts)).toEqual(boundaries.map((_, index) => [`A:t${index}`]));
    expect(Math.max(...live.map((frame) => frame.at)) - openedAt).toBeLessThan(350);
    expectContiguousCoverage(test.live(), test.publish.currentSequence());
  });

  it("leaves direct root subscribers unthrottled while the socket holds the text (AC-005)", async () => {
    const test = await connect(scenario);
    let received = 0;
    const unsubscribe = test.publish.subscribeRoot(() => { received += 1; });
    test.publish.start("A");
    for (let index = 0; index < 30; index += 1) {
      test.publish.status("A");
      test.publish.content("A", `${index}|`);
    }
    expect(received).toBe(61);
    expect(test.live().filter((frame) => frame.label === "BATCH")).toHaveLength(0);
    unsubscribe();
  });

  it("uses a changed interval only for the next newly opened window (AC-003)", async () => {
    const test = await connect(scenario, 500);
    test.publish.start("A");
    test.publish.content("A", "first");
    process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] = "1000";
    await wait(350);
    expect(test.live().filter((frame) => frame.label === "BATCH")).toHaveLength(0);
    await wait(300);
    expect(test.live().filter((frame) => frame.label === "BATCH").map((frame) => frame.texts)).toEqual([["A:first"]]);
    test.publish.content("A", "second");
    await wait(650);
    expect(test.live().filter((frame) => frame.label === "BATCH")).toHaveLength(1);
    await wait(500);
    expect(test.live().filter((frame) => frame.label === "BATCH").map((frame) => frame.texts)).toEqual([["A:first"], ["A:second"]]);
    expectContiguousCoverage(test.live(), test.publish.currentSequence());
  });
});
