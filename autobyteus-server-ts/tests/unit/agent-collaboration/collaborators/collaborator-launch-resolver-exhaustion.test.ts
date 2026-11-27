import { describe, expect, it, vi } from "vitest";
import { CollaboratorLaunchResolver } from "../../../../src/agent-collaboration/collaborators/collaborator-launch-resolver.js";
import type { CollaboratorDefinitionPlan } from "../../../../src/agent-collaboration/collaborators/collaborator-entry-builder.js";
import { launchNotesOf } from "../../../../src/agent-collaboration/collaborators/launch-configuration-notes.js";
import type { DefaultLaunchConfig } from "../../../../src/launch-preferences/default-launch-config.js";
import { LaunchUsabilityCheck } from "../../../../src/launch-preferences/launch-usability-check.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { NO_MODEL_ROUTING } from "../../../../src/model-routing/domain/model-routing-types.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/** autobyteus-646 R-2 / R-8: exhaustion on every layer's launch, with Model Routing off, and the history layer. */
const WORK = { text: "Do it", task: { taskId: "task-1", taskKey: null, projectId: null, title: "Do it" } };
const root = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-sol", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" } as const;
const codexDefault: DefaultLaunchConfig = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-sol", llmConfig: null };
const claudeDefault: DefaultLaunchConfig = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null };
const identity = { addedAt: "2026-11-27T00:00:00.000Z", addedViaAgentRunId: "pm" };
const agentPlan = (agentDefault: DefaultLaunchConfig | null): CollaboratorDefinitionPlan =>
  ({ kind: "agent", name: "Operator", address: "/operator" as never, agentDefinitionId: "operator", agentDefault, ...identity });
const teamPlan = (members: Record<string, DefaultLaunchConfig | null>): CollaboratorDefinitionPlan => ({
  kind: "agent_team", name: "Team", address: "/team" as never, teamDefinitionId: "team", coordinatorAddress: "/team/lead" as never, handoffs: [],
  members: Object.entries(members).map(([name, agentDefault]) => ({ address: `/team/${name}` as never, agentDefinitionId: name, agentDefault })),
  teamDefault: null, ...identity,
});

/** Codex gpt-sol is exhausted until Nov 27, 09:00 UTC; history picks Claude sonnet for `operator` and `worker`. */
const resolverOf = (picks: Record<string, string | null> = { operator: "sonnet", worker: "sonnet" }) => {
  const validator = {
    validate: vi.fn(),
    validateMany: vi.fn(async (inputs: readonly { selection: { llmModelIdentifier: string; llmConfig: unknown } }[]) =>
      inputs.map(({ selection }) => ({ kind: "valid", selection }))),
  } as unknown as RunModelSelectionValidator;
  const historyLaunch = vi.fn(async (agentDefinitionId: string) => picks[agentDefinitionId]
    ? { runtimeKind: "claude_agent_sdk", llmModelIdentifier: picks[agentDefinitionId]! } : null);
  const resolver = new CollaboratorLaunchResolver({
    usability: new LaunchUsabilityCheck({
      availability: { getRuntimeAvailability: async (runtimeKind: RuntimeKind) => ({ runtimeKind, enabled: true, reason: null }) } as never,
      validator,
      exhaustion: { isExhausted: (runtimeKind, model) => runtimeKind === "codex_app_server" && model === "gpt-sol" ? { until: "2026-11-27T09:00:00.000Z" } : null },
    }),
    router: NO_MODEL_ROUTING,
    history: { historyLaunch },
  });
  return { resolve: async (plans: CollaboratorDefinitionPlan[], base: Parameters<CollaboratorLaunchResolver["resolve"]>[1] = { kind: "inherited", launch: root }) =>
    (await resolver.resolve(plans, base, WORK)).plans, historyLaunch };
};

const EXHAUSTED_FALLBACK = { layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", reason: "blocked",
  detail: "gpt-sol is exhausted until 2026-11-27 09:00 UTC." };

describe("delegation launch: exhaustion and the history layer (R-2, R-8)", () => {
  it("an exhausted default is skipped with Model Routing off; history goes before the inherited launch, as agent_history", async () => {
    const { resolve } = resolverOf();
    const [plan] = await resolve([agentPlan(codexDefault)]);
    expect(plan).toMatchObject({
      launchConfiguration: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" },
      launchSource: { origin: "agent_history", fallbacks: [EXHAUSTED_FALLBACK] },
    });
    expect(launchNotesOf([{ name: "Operator", subject: "agent", launch: plan!.kind === "agent" ? plan!.launchConfiguration : null!, source: plan!.kind === "agent" ? plan!.launchSource : null! }]))
      .toEqual(["Operator: its agent default Codex App Server / gpt-sol could not be used (gpt-sol is exhausted until 2026-11-27 09:00 UTC); "
        + "it runs on Claude Agent SDK / sonnet (chosen from its history)."]);
  });

  it("an exhausted inherited launch also brings in history; a skip for another reason keeps today's order", async () => {
    const { resolve, historyLaunch } = resolverOf();
    const [plan] = await resolve([agentPlan(null)]);
    expect(plan).toMatchObject({ launchConfiguration: { runtimeKind: "claude_agent_sdk" }, launchSource: { origin: "agent_history", fallbacks: [] } });
    const usable = { ...root, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" };
    historyLaunch.mockClear();
    const [incomplete] = await resolve([agentPlan({ runtimeKind: null, llmModelIdentifier: null, llmConfig: null } as never)], { kind: "inherited", launch: usable });
    expect(incomplete).toMatchObject({ launchConfiguration: usable, launchSource: { origin: "inherited" } });
    expect(historyLaunch).not.toHaveBeenCalled();
  });

  it("nothing in history and the inherited launch exhausted: refused, naming the exhaustion", async () => {
    const { resolve } = resolverOf({});
    await expect(resolve([agentPlan(codexDefault)])).rejects.toThrow(/gpt-sol is exhausted until 2026-11-27 09:00 UTC/);
  });

  it("an exhausted default with a usable inherited launch and no history: the inherited launch, the exhaustion noted", async () => {
    const { resolve } = resolverOf({});
    const usable = { ...root, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" };
    const [plan] = await resolve([agentPlan(codexDefault)], { kind: "inherited", launch: usable });
    expect(plan).toMatchObject({ launchConfiguration: usable, launchSource: { origin: "inherited", fallbacks: [EXHAUSTED_FALLBACK] } });
  });

  it("Team members: a history-launched member runs on its own launch; the others keep theirs", async () => {
    const { resolve } = resolverOf();
    const [plan] = await resolve([teamPlan({ lead: claudeDefault, worker: codexDefault })], { kind: "inherited",
      launch: { ...root, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" } });
    if (plan!.kind !== "agent_team") throw new Error("team plan expected");
    expect(plan!.members[0]).toMatchObject({ launchConfiguration: { llmModelIdentifier: "opus" }, launchSource: { origin: "agent_default" } });
    expect(plan!.members[1]).toMatchObject({ launchConfiguration: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" }, followsTeam: false,
      launchSource: { origin: "agent_history", fallbacks: [EXHAUSTED_FALLBACK] } });
  });
});
