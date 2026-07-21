import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApplicationAgentBindingRecord,
} from "../../../src/application-orchestration/domain/models.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { ApplicationRunBindingLifecycleHub } from "../../../src/application-orchestration/services/application-run-binding-lifecycle-hub.js";
import { ApplicationAgentTargetAuthorizationService } from "../../../src/application-orchestration/services/application-agent-target-authorization-service.js";
import { ApplicationOrchestrationHostService } from "../../../src/application-orchestration/services/application-orchestration-host-service.js";
import { ApplicationAgentStreamRuntimeSource } from "../../../src/application-agent-streaming/services/application-agent-stream-runtime-source.js";
import { ApplicationAgentStreamingService } from "../../../src/application-agent-streaming/services/application-agent-streaming-service.js";
import { ApplicationAgentCommunicationService } from "../../../src/application-agent-communication/services/application-agent-communication-service.js";
import {
  createApplicationBackendMountTransport,
} from "../../../../autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.js";
import { createApplicationClient } from "../../../../autobyteus-application-frontend-sdk/src/application-client.js";
import type { ApplicationAgentConnection } from "../../../../autobyteus-application-frontend-sdk/src/application-agent-connection.js";
import type {
  ApplicationAgentEvent,
  ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";

const communicationState = vi.hoisted(() => ({
  service: null as ApplicationAgentCommunicationService | null,
}));

vi.mock("../../../src/application-agent-communication/services/application-agent-communication-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/application-agent-communication/services/application-agent-communication-service.js")
  >("../../../src/application-agent-communication/services/application-agent-communication-service.js");
  return {
    ...actual,
    getApplicationAgentCommunicationService: () => {
      if (!communicationState.service) {
        throw new Error("Integration test application agent communication service was not initialized.");
      }
      return communicationState.service;
    },
  };
});

import { registerApplicationAgentCommunicationWebsocket } from "../../../src/api/websocket/application-agent-communication.js";

const APPLICATION_ID = "application-agent-streaming-integration";
const NOW = "2026-07-21T10:00:00.000Z";

const agentBinding: ApplicationAgentBindingRecord = {
  bindingId: "agent-binding",
  applicationId: APPLICATION_ID,
  launchRequestId: "agent-launch",
  status: "ATTACHED",
  executionResourceRef: { source: "bundle", kind: "AGENT", localId: "agent" },
  runtime: {
    subject: "AGENT_RUN",
    runId: "agent-run",
    definitionId: "agent-definition",
    members: [{
      memberName: "agent",
      memberRouteKey: "agent",
      displayName: "Agent",
      teamPath: [],
      runId: "agent-run",
      runtimeKind: "AGENT",
    }],
  },
  createdAt: NOW,
  updatedAt: NOW,
  terminatedAt: null,
  lastErrorMessage: null,
};

const teamBinding: ApplicationAgentBindingRecord = {
  bindingId: "team-binding",
  applicationId: APPLICATION_ID,
  launchRequestId: "team-launch",
  status: "ATTACHED",
  executionResourceRef: { source: "bundle", kind: "AGENT_TEAM", localId: "team" },
  runtime: {
    subject: "TEAM_RUN",
    runId: "team-run",
    definitionId: "team-definition",
    members: [
      {
        memberName: "researcher",
        memberRouteKey: "researcher",
        displayName: "Researcher",
        teamPath: ["researcher"],
        runId: "researcher-run",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
      {
        memberName: "writer",
        memberRouteKey: "writer",
        displayName: "Writer",
        teamPath: ["writer"],
        runId: "writer-run",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
  terminatedAt: null,
  lastErrorMessage: null,
};

const waitFor = async (predicate: () => boolean, label: string): Promise<void> => {
  const deadline = Date.now() + 5_000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${label}.`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const waitForClose = (connection: ApplicationAgentConnection) =>
  new Promise<{ reason: string }>((resolve) => connection.onClose(resolve));

describe("Application agent communication WebSocket integration", () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let lifecycleHub: ApplicationRunBindingLifecycleHub;
  let agentListeners: Set<(event: AgentRunEvent) => void>;
  let teamListeners: Set<TeamRunEventListener>;
  let agentPostUserMessage: ReturnType<typeof vi.fn>;
  let teamPostMessage: ReturnType<typeof vi.fn>;
  const connections: ApplicationAgentConnection[] = [];

  beforeEach(async () => {
    lifecycleHub = new ApplicationRunBindingLifecycleHub();
    agentListeners = new Set();
    teamListeners = new Set();
    agentPostUserMessage = vi.fn(async () => ({ accepted: true }));
    teamPostMessage = vi.fn(async () => ({ accepted: true }));

    const bindingStore = {
      getBinding: vi.fn(async (applicationId: string, bindingId: string) => {
        if (applicationId !== APPLICATION_ID) return null;
        if (bindingId === agentBinding.bindingId) return structuredClone(agentBinding);
        if (bindingId === teamBinding.bindingId) return structuredClone(teamBinding);
        return null;
      }),
    };
    const startupGate = { awaitReady: vi.fn(async () => undefined) };
    const availabilityService = { requireApplicationActive: vi.fn(async () => undefined) };
    const authorization = new ApplicationAgentTargetAuthorizationService({
      startupGate: startupGate as never,
      availabilityService: availabilityService as never,
      bindingStore: bindingStore as never,
      lifecycleHub,
    });
    const orchestration = new ApplicationOrchestrationHostService({
      startupGate: startupGate as never,
      availabilityService: availabilityService as never,
      bindingStore: bindingStore as never,
      agentTargetAuthorizationService: authorization,
      agentRunService: {
        resolveAgentRun: vi.fn(async (runId: string) => runId === "agent-run"
          ? { postUserMessage: agentPostUserMessage }
          : null),
      } as never,
      teamRunService: {
        resolveTeamRun: vi.fn(async (runId: string) => runId === "team-run"
          ? { postMessage: teamPostMessage }
          : null),
      } as never,
    });
    const runtimeSource = new ApplicationAgentStreamRuntimeSource({
      agentRunManager: {
        getActiveRun: (runId: string) => runId === "agent-run" ? {
          subscribeToEvents: (listener: (event: AgentRunEvent) => void) => {
            agentListeners.add(listener);
            return () => agentListeners.delete(listener);
          },
        } : null,
      } as never,
      teamRunManager: {
        getActiveRun: (runId: string) => runId === "team-run" ? {
          subscribeToEvents: (listener: TeamRunEventListener) => {
            teamListeners.add(listener);
            return () => teamListeners.delete(listener);
          },
        } : null,
      } as never,
    });
    const streaming = new ApplicationAgentStreamingService({
      orchestrationHostService: orchestration,
      runtimeSource,
    });
    communicationState.service = new ApplicationAgentCommunicationService({
      streamingService: streaming,
      orchestrationService: orchestration,
    });

    app = fastify();
    await app.register(websocket);
    await registerApplicationAgentCommunicationWebsocket(app);
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected an ephemeral TCP address.");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    for (const connection of connections.splice(0)) connection.close();
    await app.close();
    communicationState.service = null;
  });

  it("routes agent, team, and selected-member input/events through the real SDK and WebSocket boundary", async () => {
    const transport = createApplicationBackendMountTransport({
      backendBaseUrl: `${baseUrl}/rest/applications/${APPLICATION_ID}/backend`,
      agentCommunicationWebSocketBaseUrl:
        `${baseUrl.replace("http://", "ws://")}/ws/applications/${APPLICATION_ID}/agent-communication`,
      agentCommunicationWebSocketFactory: (url) => new WebSocket(url) as never,
    });
    const client = createApplicationClient({ applicationId: APPLICATION_ID, transport });
    const agentAddress = {
      bindingId: agentBinding.bindingId,
      target: { kind: "AGENT_RUN" },
    } as const satisfies ApplicationAgentTargetAddress;
    const teamAddress = {
      bindingId: teamBinding.bindingId,
      target: { kind: "AGENT_TEAM_RUN" },
    } as const satisfies ApplicationAgentTargetAddress;
    const memberAddress = {
      bindingId: teamBinding.bindingId,
      target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "researcher" },
    } as const satisfies ApplicationAgentTargetAddress;

    const agentConnection = client.agentCommunication.connect(agentAddress);
    const teamConnection = client.agentCommunication.connect(teamAddress);
    const memberConnection = client.agentCommunication.connect(memberAddress);
    connections.push(agentConnection, teamConnection, memberConnection);
    const agentEvents: ApplicationAgentEvent[] = [];
    const teamEvents: ApplicationAgentEvent[] = [];
    const memberEvents: ApplicationAgentEvent[] = [];
    agentConnection.onEvent((event) => agentEvents.push(event));
    teamConnection.onEvent((event) => teamEvents.push(event));
    memberConnection.onEvent((event) => memberEvents.push(event));

    await Promise.all([agentConnection.ready, teamConnection.ready, memberConnection.ready]);
    expect([agentConnection.state, teamConnection.state, memberConnection.state]).toEqual(["open", "open", "open"]);

    await agentConnection.sendInput({ text: "agent input", metadata: { source: "integration" } });
    await teamConnection.sendInput({ text: "team root input" });
    await memberConnection.sendInput({ text: "member input" });
    expect(agentPostUserMessage).toHaveBeenCalledWith(expect.objectContaining({
      content: "agent input",
      metadata: { source: "integration" },
    }));
    expect(teamPostMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ content: "team root input" }),
      null,
    );
    expect(teamPostMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ content: "member input" }),
      { kind: "route_key", memberRouteKey: "researcher" },
    );

    for (const listener of agentListeners) listener({
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      runId: "agent-run",
      statusHint: null,
      payload: {
        segmentId: "segment-1",
        turnId: "turn-1",
        type: "text",
        delta: "hello",
        providerSecret: "must-not-cross",
      },
    });
    const emitTeam = (event: TeamRunEvent): void => {
      for (const listener of teamListeners) listener(event);
    };
    emitTeam({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-run",
      sourcePath: [],
      data: { status: "idle" } as never,
    });
    for (const [memberRouteKey, memberName, memberRunId, turnId] of [
      ["writer", "writer", "writer-run", "turn-writer"],
      ["researcher", "researcher", "researcher-run", "turn-researcher"],
    ] as const) {
      emitTeam({
        eventSourceType: TeamRunEventSourceType.AGENT,
        teamRunId: "team-run",
        sourcePath: [memberRouteKey],
        data: {
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memberName,
          memberRunId,
          memberPath: [memberRouteKey],
          memberRouteKey,
          agentEvent: {
            eventType: AgentRunEventType.TURN_STARTED,
            runId: memberRunId,
            statusHint: null,
            payload: { turnId, providerSecret: "must-not-cross" },
          },
        },
      });
    }

    await waitFor(
      () => agentEvents.length === 1 && teamEvents.length === 3 && memberEvents.length === 1,
      "projected application agent events",
    );
    expect(agentEvents[0]).toMatchObject({
      sequence: 1,
      applicationId: APPLICATION_ID,
      address: agentAddress,
      runtimeSubject: "AGENT_RUN",
      event: {
        source: "AGENT",
        type: "SEGMENT_CONTENT",
        data: { segmentId: "segment-1", turnId: "turn-1", kind: "TEXT", delta: "hello" },
      },
    });
    expect(JSON.stringify(agentEvents[0])).not.toContain("providerSecret");
    expect(teamEvents.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(teamEvents.map((event) => event.event.type)).toEqual([
      "TEAM_STATUS",
      "TURN_STARTED",
      "TURN_STARTED",
    ]);
    expect(memberEvents[0]).toMatchObject({
      sequence: 1,
      address: memberAddress,
      producer: { memberRouteKey: "researcher", runId: "researcher-run" },
      event: { source: "AGENT", type: "TURN_STARTED", data: { turnId: "turn-researcher" } },
    });

    const closePromise = waitForClose(agentConnection);
    lifecycleHub.publishTerminal({
      applicationId: APPLICATION_ID,
      bindingId: agentBinding.bindingId,
      status: "TERMINATED",
    });
    await expect(closePromise).resolves.toEqual({ reason: "BINDING_ENDED" });
    expect(agentConnection.state).toBe("closed");

    const invalidConnection = client.agentCommunication.connect({
      bindingId: teamBinding.bindingId,
      target: { kind: "AGENT_RUN" },
    });
    connections.push(invalidConnection);
    const invalidClose = waitForClose(invalidConnection);
    await expect(invalidConnection.ready).rejects.toMatchObject({
      code: "INVALID_TARGET",
      message: "The application agent target is invalid.",
      recoverable: false,
    });
    await expect(invalidClose).resolves.toEqual({ reason: "ESTABLISHMENT_FAILED" });
    expect(invalidConnection.state).toBe("closed");
  }, 20_000);
});
