import { describe, expect, it, vi } from "vitest";
import { CollaboratorLaunchResolver } from "../../../../src/agent-collaboration/collaborators/collaborator-launch-resolver.js";
import type { CollaboratorDefinitionPlan } from "../../../../src/agent-collaboration/collaborators/collaborator-entry-builder.js";
import { CollaboratorNoDefaultLaunchError, CollaboratorRouterFailedError } from "../../../../src/agent-collaboration/collaborators/collaborator-errors.js";
import { entryPlanLaunchNotes } from "../../../../src/agent-collaboration/collaborators/launch-configuration-notes.js";
import { LaunchUsabilityCheck } from "../../../../src/launch-preferences/launch-usability-check.js";
import type { DefaultLaunchConfig } from "../../../../src/launch-preferences/default-launch-config.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import type { DelegationRouting, ModelRoutingOutcome, RoutingRequest } from "../../../../src/model-routing/domain/model-routing-types.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { nodeFacts } from "../../model-routing/model-routing-fixtures.js";

/**
 * autobyteus-32 supplement §§ 2–5 with Model Routing on: defaults first, the node's Model Router for the agents no
 * usable default covers (one request per delegation), U3/U4b from the node's facts, visible fallback here and refusal
 * on a peer. Synthesized definitions, a fake router.
 */
const WORK = { text: "Build the runtimes tool.", task: { taskId: "task-303", taskKey: "autobyteus-303", projectId: "project-1", title: "Runtimes tool" } };
const pm = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" } as const;
const inherited = { kind: "inherited" as const, launch: pm };
const peerBase = { kind: "defaults_only" as const, workspaceRootPath: "/temp", autoExecuteTools: true };
const cfg = (runtimeKind: string | null, llmModelIdentifier: string | null): DefaultLaunchConfig => ({ runtimeKind, llmModelIdentifier, llmConfig: null });

const team = (members: Record<string, DefaultLaunchConfig | null>, teamDefault: DefaultLaunchConfig | null = null): CollaboratorDefinitionPlan => ({
  kind: "agent_team", name: "Software Engineering Team", address: "/set" as never, description: "Builds software.",
  teamDefinitionId: "se", coordinatorAddress: "/set/solution_designer" as never, handoffs: [], teamDefault,
  members: Object.entries(members).map(([name, agentDefault]) => ({
    address: `/set/${name}` as never, name, description: `${name} description`, role: null, agentDefinitionId: name, agentDefault,
  })),
});
const agent = (agentDefault: DefaultLaunchConfig | null): CollaboratorDefinitionPlan => ({
  kind: "agent", name: "Writer", address: "/writer" as never, description: "Writes.", role: "Writer", agentDefinitionId: "writer", agentDefault,
});

/** A router that answers each asked agent with Codex gpt-sol (or `outcome`), recording the requests. */
const router = (options: { notActiveReason?: string | null; outcome?: ModelRoutingOutcome; facts?: ReturnType<typeof nodeFacts> } = {}) => {
  const requests: RoutingRequest[] = [];
  const routing: DelegationRouting = {
    facts: options.facts ?? nodeFacts(),
    notActiveReason: options.notActiveReason ?? null,
    route: vi.fn(async (request: RoutingRequest) => {
      requests.push(request);
      if (options.notActiveReason) return { kind: "not_active", reason: options.notActiveReason };
      return options.outcome ?? { kind: "chosen", choices: request.agents.map((asked) => ({
        address: asked.address, runtimeKind: asked.requiredRuntime ?? "codex_app_server", llmModelIdentifier: "gpt-sol",
        taskKind: "implementation", reason: "Codex has limit left.",
      })) };
    }),
  };
  return { port: { openDelegation: vi.fn(async () => routing) }, requests, routing };
};

const resolverWith = (port: { openDelegation(): Promise<DelegationRouting | null> }) => {
  const availability = { getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => ({ runtimeKind, enabled: true, reason: null })) };
  const validateMany = vi.fn(async (inputs: readonly { selection: { llmModelIdentifier: string } }[]) =>
    inputs.map(({ selection }) => ({ kind: "valid", selection: { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: null } })));
  const validator = { validate: vi.fn(), validateMany } as unknown as RunModelSelectionValidator;
  return new CollaboratorLaunchResolver({ usability: new LaunchUsabilityCheck({ availability, validator }), router: port });
};

describe("CollaboratorLaunchResolver with Model Routing on (autobyteus-32)", () => {
  it("AC-001: the member with a usable default runs on it; the router is asked once for the others; notes name its choices", async () => {
    const { port, requests } = router();
    const { plans: [plan], modelRoutingOn } = await resolverWith(port).resolve([team({
      solution_designer: cfg("claude_agent_sdk", "sonnet"), implementation_engineer: null, code_reviewer: null,
    })], inherited, WORK);
    expect(modelRoutingOn).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      work: WORK, target: { kind: "agent_team", name: "Software Engineering Team" },
      agents: [{ address: "/set/implementation_engineer", requiredRuntime: null }, { address: "/set/code_reviewer" }],
      covered: [{ address: "/set/solution_designer", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", source: "agent_default" }],
      delegatingLaunch: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" },
    });
    if (plan!.kind !== "agent_team") throw new Error("team expected");
    expect(plan!.members.map((member) => [member.address, member.launchConfiguration.runtimeKind, member.launchSource?.origin])).toEqual([
      ["/set/solution_designer", "claude_agent_sdk", "agent_default"],
      ["/set/implementation_engineer", "codex_app_server", "model_router"],
      ["/set/code_reviewer", "codex_app_server", "model_router"],
    ]);
    expect(plan!.members[1]).toMatchObject({ followsTeam: false, launchConfiguration: { llmConfig: null, workspaceRootPath: "/work", autoExecuteTools: true },
      launchSource: { choiceReason: "Codex has limit left.", taskKind: "implementation" } });
    expect(entryPlanLaunchNotes(plan!)).toEqual([
      "implementation_engineer: runs on codex_app_server / gpt-sol, chosen by the Model Router (implementation): Codex has limit left.",
      "code_reviewer: runs on codex_app_server / gpt-sol, chosen by the Model Router (implementation): Codex has limit left.",
    ]);
  });

  it("AC-003 / U3, U4b: a default on a signed-out runtime or a blocked model is skipped with a note; the router chooses instead", async () => {
    const { port, requests } = router({ facts: nodeFacts({ codexBlocked: true }) });
    const { plans: [plan] } = await resolverWith(port).resolve([team({
      implementation_engineer: cfg("codex_app_server", "gpt-sol"), code_reviewer: cfg("antigravity_cli", "gemini"),
    })], inherited, WORK);
    expect(requests[0]!.agents.map((asked) => asked.skipped)).toEqual([
      [{ layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", detail: "gpt-sol is blocked until 2026-10-30 20:57 UTC (weekly)." }],
      [{ layer: "agent_default", runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini", detail: "Antigravity is signed out." }],
    ]);
    expect(entryPlanLaunchNotes(plan!)).toContain(
      "implementation_engineer: its agent default codex_app_server / gpt-sol could not be used (gpt-sol is blocked until 2026-10-30 20:57 UTC (weekly)); it runs on codex_app_server / gpt-sol (chosen by the Model Router).");
  });

  it("AC-002 / DEC-022: with Model Routing off a blocked default is used as today; nothing is routed", async () => {
    const { plans: [plan], modelRoutingOn } = await resolverWith({ openDelegation: async () => null })
      .resolve([agent(cfg("codex_app_server", "gpt-sol"))], inherited, WORK);
    expect(modelRoutingOn).toBe(false);
    expect(plan).toMatchObject({ launchConfiguration: { runtimeKind: "codex_app_server" }, launchSource: { origin: "agent_default", fallbacks: [] } });
  });

  it("§ 3.2: a runtime-only default is routed on its runtime while the router is active; otherwise skipped as incomplete", async () => {
    const active = router();
    await resolverWith(active.port).resolve([agent(cfg("codex_app_server", null))], inherited, WORK);
    expect(active.requests[0]!.agents[0]).toMatchObject({ requiredRuntime: "codex_app_server", skipped: [] });
    const { plans: [plan] } = await resolverWith(router({ notActiveReason: "the router has no runtime/model" }).port)
      .resolve([agent(cfg("codex_app_server", null))], inherited, WORK);
    expect(plan).toMatchObject({ launchConfiguration: { runtimeKind: "claude_agent_sdk" }, launchSource: { origin: "inherited" } });
    expect(entryPlanLaunchNotes(plan!)).toEqual([
      "Writer: its agent default codex_app_server / (no model) could not be used (It names no model); it runs on claude_agent_sdk / sonnet (inherited from the run).",
      "Writer: Model Routing is on but the Model Router is not usable (the router has no runtime/model); it runs on claude_agent_sdk / sonnet (inherited from the run).",
    ]);
  });

  it("E8 / SCN-002: the router fails here: the asked agents run on the delegating run's launch with a router-failed note", async () => {
    const { plans: [plan] } = await resolverWith(router({ outcome: { kind: "failed", reason: "no valid answer within 40 seconds" } }).port)
      .resolve([agent(null)], inherited, WORK);
    expect(plan).toMatchObject({ launchConfiguration: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" },
      launchSource: { origin: "inherited", fallbacks: [{ layer: "model_router", reason: "router_failed", detail: "no valid answer within 40 seconds" }] } });
    expect(entryPlanLaunchNotes(plan!)).toEqual([
      "Writer: Model Router could not choose (no valid answer within 40 seconds); it runs on claude_agent_sdk / sonnet (inherited from the run).",
    ]);
  });

  it("§ 6, SCN-004: on a peer, no default and no active router refuses with the router state; a failed router refuses as MODEL_ROUTER_FAILED", async () => {
    const off = resolverWith({ openDelegation: async () => null }).resolve([agent(null)], peerBase, WORK);
    await expect(off).rejects.toBeInstanceOf(CollaboratorNoDefaultLaunchError);
    await expect(off).rejects.toMatchObject({ routerState: { kind: "off" } });
    await expect(resolverWith(router({ notActiveReason: "Codex is signed out" }).port).resolve([agent(null)], peerBase, WORK))
      .rejects.toMatchObject({ routerState: { kind: "not_active", reason: "Codex is signed out" } });
    const failed = resolverWith(router({ outcome: { kind: "failed", reason: "the Model Router was busy" } }).port).resolve([agent(null)], peerBase, WORK);
    await expect(failed).rejects.toBeInstanceOf(CollaboratorRouterFailedError);
    await expect(failed).rejects.toMatchObject({ agentName: "Writer", failure: "the Model Router was busy" });
  });

  it("E5: on a peer with an active router, every member is routed from that node's facts; the Team's recorded default is the coordinator's", async () => {
    const { plans: [plan] } = await resolverWith(router().port).resolve([team({ solution_designer: null, implementation_engineer: null })], peerBase, WORK);
    if (plan!.kind !== "agent_team") throw new Error("team expected");
    expect(plan!.members.every((member) => member.launchSource?.origin === "model_router" && member.launchConfiguration.workspaceRootPath === "/temp")).toBe(true);
    expect(plan!.defaultLaunchSource).toMatchObject({ origin: "model_router" });
  });
});
