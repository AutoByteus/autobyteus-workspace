import { afterEach, describe, expect, it, vi } from "vitest";
import { submitLaunchChoices, SUBMIT_LAUNCH_CHOICES_NOT_ROUTER } from "../../../src/agent-tools/model-routing/submit-launch-choices-contract.js";
import { routingDecisionDraftOf } from "../../../src/agent-collaboration/collaborators/routing-decision-draft.js";
import type { ModelRouting } from "../../../src/model-routing/services/model-routing-binding.js";
import { ModelRoutingSessions } from "../../../src/model-routing/services/model-routing-sessions.js";
import { decisionRecordsOf, type RoutingDecisionRecord } from "../../../src/model-routing/domain/model-routing-types.js";
import { configureRoutingDecisionRecorder } from "../../../src/model-routing/domain/routing-decision-recorder-binding.js";
import { PeerStartedRunDecisions } from "../../../src/remote-collaboration/inbound/peer-started-run-decisions.js";
import { peerRefusalText } from "../../../src/remote-collaboration/domain/remote-refusals.js";
import { nodeFacts, routingRequest, validChoices } from "./model-routing-fixtures.js";

const routingWith = (sessions: ModelRoutingSessions) =>
  ({ sessions, agent: { storedRunId: async () => "router_run_1" } }) as unknown as ModelRouting;

describe("submit_launch_choices (DS-004)", () => {
  it("accepts only the node's Model Router agent's run; validates and settles through the sessions", async () => {
    const sessions = new ModelRoutingSessions(() => "req_1");
    const session = sessions.openSession(routingRequest(), nodeFacts());
    const routing = routingWith(sessions);
    await expect(submitLaunchChoices("another_run", { requestId: "req_1", choices: validChoices() }, routing))
      .resolves.toEqual({ text: SUBMIT_LAUNCH_CHOICES_NOT_ROUTER, isError: true });
    await expect(submitLaunchChoices("router_run_1", { requestId: "req_1", choices: "none" }, routing)).resolves.toMatchObject({ isError: true });
    await expect(submitLaunchChoices("router_run_1", { requestId: "req_1", choices: validChoices() }, routing))
      .resolves.toEqual({ text: "Accepted: 2 launch choices for request req_1.", isError: false });
    await expect(session.outcome).resolves.toMatchObject({ kind: "chosen" });
    await expect(submitLaunchChoices("router_run_1", { requestId: "req_1", choices: validChoices() }, null)).resolves.toMatchObject({ isError: true });
  });
});

describe("decision records (REQ-012, DS-002)", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("a routed Team copy's draft lists every member with its source, task kind, reason, router failure and notes", () => {
    const launch = (runtimeKind: string, llmModelIdentifier: string) =>
      ({ runtimeKind, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" }) as never;
    const draft = routingDecisionDraftOf({
      kind: "agent_team", name: "SE", address: "/set" as never, teamDefinitionId: "se", coordinatorAddress: "/set/sd" as never, handoffs: [],
      defaultLaunchConfiguration: launch("claude_agent_sdk", "sonnet"),
      defaultLaunchSource: { origin: "inherited", fallbacks: [] },
      members: [
        { address: "/set/sd" as never, agentDefinitionId: "sd", launchConfiguration: launch("claude_agent_sdk", "sonnet"), followsTeam: false,
          launchSource: { origin: "agent_default", fallbacks: [] } },
        { address: "/set/ie" as never, agentDefinitionId: "ie", launchConfiguration: launch("codex_app_server", "gpt-sol"), followsTeam: false,
          launchSource: { origin: "model_router", fallbacks: [], choiceReason: "Codex fits.", taskKind: "implementation" } },
        { address: "/set/cr" as never, agentDefinitionId: "cr", launchConfiguration: launch("claude_agent_sdk", "sonnet"), followsTeam: true,
          launchSource: { origin: "inherited", fallbacks: [{ layer: "model_router", runtimeKind: null, llmModelIdentifier: null, reason: "router_failed", detail: "the Model Router was busy" }] } },
      ],
    });
    expect(draft.agents.map((agent) => [agent.agentAddress, agent.source, agent.taskKind, agent.routerFailure])).toEqual([
      ["/set/sd", "agent_default", null, null],
      ["/set/ie", "model_router", "implementation", null],
      ["/set/cr", "inherited", null, "the Model Router was busy"],
    ]);
    expect(draft.agents[1]!.notes).toEqual(["ie: runs on codex_app_server / gpt-sol, chosen by the Model Router (implementation): Codex fits."]);
    const records = decisionRecordsOf(draft, { recordedAt: "2026-10-26T09:00:00.000Z",
      task: { taskId: "task-1", taskKey: "autobyteus-1", projectId: "p", title: "T" }, delegatingRunId: "pm", delegatingAgentName: "pm", fromNode: null });
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ copyAddress: "/set", copyKind: "agent_team", taskKey: "autobyteus-1", delegatingRunId: "pm" });
  });

  it("B keeps a peer-started copy's records until the work packet for that run arrives; an abandoned start writes none", async () => {
    const written: RoutingDecisionRecord[][] = [];
    const binding = configureRoutingDecisionRecorder({ record: async (records) => { written.push([...records]); } });
    try {
      const decisions = new PeerStartedRunDecisions(() => Date.parse("2026-10-26T09:00:05.000Z"));
      const record = { agentAddress: "/publisher" } as unknown as RoutingDecisionRecord;
      decisions.hold("publisher_run", [record]);
      decisions.hold("abandoned_run", [record]);
      await decisions.workArrived("unknown_run");
      expect(written).toEqual([]);
      await decisions.workArrived("publisher_run");
      expect(written).toEqual([[{ agentAddress: "/publisher", recordedAt: "2026-10-26T09:00:05.000Z" }]]);
      await decisions.workArrived("publisher_run");
      expect(written).toHaveLength(1);
    } finally {
      binding.close();
    }
  });

  it("A words a peer's refusals with the peer's Model Routing state (supplement § 6) and a router failure (§ 5)", () => {
    expect(peerRefusalText("docker-1", "NO_DEFAULT_RUNTIME", "There is no default runtime configured for the target agent team SET", undefined, { modelRouting: { state: "off" } }))
      .toBe('There is no default runtime configured for the target agent team SET on node "docker-1", and Model Routing is off on node "docker-1".');
    expect(peerRefusalText("docker-1", "AGENT_CANNOT_RUN", "gpt-sol is blocked until 2026-10-30 20:57 UTC (weekly).", { kind: "agent", name: "Coder" },
      { modelRouting: { state: "not_active", reason: "the router has no runtime/model" } }))
      .toBe('The Agent Coder on node "docker-1" cannot run there: gpt-sol is blocked until 2026-10-30 20:57 UTC (weekly), and the Model Router on node "docker-1" is not usable (the router has no runtime/model).');
    expect(peerRefusalText("docker-1", "MODEL_ROUTER_FAILED", "no valid answer within 40 seconds", { kind: "agent_team", name: "SET" }, { agentName: "implementation_engineer" }))
      .toBe('The Model Router on node "docker-1" could not choose a runtime for implementation_engineer: no valid answer within 40 seconds.');
  });
});
