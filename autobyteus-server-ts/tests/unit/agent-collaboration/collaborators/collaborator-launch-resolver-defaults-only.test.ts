import { describe, expect, it, vi } from "vitest";
import { CollaboratorLaunchResolver } from "../../../../src/agent-collaboration/collaborators/collaborator-launch-resolver.js";
import { LaunchUsabilityCheck } from "../../../../src/launch-preferences/launch-usability-check.js";
import { NO_MODEL_ROUTING } from "../../../../src/model-routing/domain/model-routing-types.js";

/** Model Routing off (these tests are today's order): the work is not read, so any stands in. */
const WORK = { text: "Do it", task: { taskId: "task-1", taskKey: null, projectId: null, title: "Do it" } };
const plansOnly = (resolver: CollaboratorLaunchResolver) => ({
  resolve: async (plans: readonly CollaboratorDefinitionPlan[], base: Parameters<CollaboratorLaunchResolver["resolve"]>[1]) =>
    (await resolver.resolve(plans, base, WORK)).plans,
});
import { CollaboratorAddError, CollaboratorNoDefaultLaunchError } from "../../../../src/agent-collaboration/collaborators/collaborator-errors.js";
import type { CollaboratorDefinitionPlan } from "../../../../src/agent-collaboration/collaborators/collaborator-entry-builder.js";
import type { DefaultLaunchConfig } from "../../../../src/launch-preferences/default-launch-config.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-245 (design § Ownership Map, `CollaboratorLaunchResolver`): the `defaults_only` launch base, for a
 * run started for a peer node. No inherited layer; configured candidates take the base's workspace and
 * auto-approve, and the base's workspace is the model-validation context. Nothing complete configured is
 * `CollaboratorNoDefaultLaunchError`; a complete but unusable layer is `CollaboratorAddError` with its reason.
 */

const base = { kind: "defaults_only" as const, workspaceRootPath: "/data/temp_workspace", autoExecuteTools: true };
const sol = (llmConfig: Record<string, unknown> | null = { effort: "high" }): DefaultLaunchConfig =>
  ({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig });
const opus = (): DefaultLaunchConfig => ({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null });
const identity = { addedAt: "2026-10-21T00:00:00.000Z", addedViaAgentRunId: "peer" };
const agentPlan = (agentDefault: DefaultLaunchConfig | null, name = "Publisher"): CollaboratorDefinitionPlan => ({
  kind: "agent", name, address: "/publisher" as never, agentDefinitionId: "publisher", agentDefault, ...identity,
});
const teamPlan = (members: Record<string, DefaultLaunchConfig | null>, teamDefault: DefaultLaunchConfig | null = null): CollaboratorDefinitionPlan => ({
  kind: "agent_team", name: "Studio Team", address: "/studio_team" as never,
  teamDefinitionId: "studio", coordinatorAddress: "/studio_team/lead" as never, handoffs: [],
  members: Object.entries(members).map(([name, agentDefault]) => ({ address: `/studio_team/${name}` as never, agentDefinitionId: name, agentDefault })),
  teamDefault, ...identity,
});

type Verdict = "valid" | "model_unavailable" | "invalid";
const setup = (options: { unavailable?: Partial<Record<string, string>>; verdict?: (runtimeKind: string, model: string) => Verdict } = {}) => {
  const availability = {
    getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => {
      const reason = options.unavailable?.[runtimeKind];
      return { runtimeKind, enabled: !reason, reason: reason ?? null };
    }),
  };
  const validateMany = vi.fn(async (inputs: readonly { context: { runtimeKind: string; workspaceRootPath: string }; selection: { llmModelIdentifier: string } }[]) =>
    inputs.map(({ context, selection }) => {
      const kind = options.verdict?.(context.runtimeKind, selection.llmModelIdentifier) ?? "valid";
      return kind === "valid" ? { kind, selection: { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: null } }
        : kind === "invalid" ? { kind, errors: [{ path: "effort", message: "effort must be one of low, high" }] }
          : { kind };
    }));
  const validator = { validate: vi.fn(), validateMany } as unknown as RunModelSelectionValidator;
  return { availability, validateMany, resolver: plansOnly(new CollaboratorLaunchResolver({ usability: new LaunchUsabilityCheck({ availability, validator }), router: NO_MODEL_ROUTING })) };
};

describe("CollaboratorLaunchResolver with the defaults_only base", () => {
  it("runs an Agent on its own default, with the base's workspace and auto-approve, validated in that workspace; nothing is inherited", async () => {
    const { resolver, validateMany } = setup();
    const [plan] = await resolver.resolve([agentPlan(sol())], base);
    expect(plan).toEqual({
      kind: "agent", name: "Publisher", address: "/publisher", agentDefinitionId: "publisher",
      launchConfiguration: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" },
        autoExecuteTools: true, workspaceRootPath: "/data/temp_workspace" },
      launchSource: { origin: "agent_default", fallbacks: [] },
    });
    // Only the candidate is validated: there is no inherited launch to check.
    expect(validateMany).toHaveBeenCalledTimes(1);
    expect(validateMany.mock.calls[0]![0]).toEqual([expect.objectContaining({
      context: expect.objectContaining({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, workspaceRootPath: "/data/temp_workspace" }),
    })]);
  });

  it("refuses an Agent with no default, or only an incomplete one, as 'no default runtime'", async () => {
    const { resolver, validateMany } = setup();
    const none = resolver.resolve([agentPlan(null)], base);
    await expect(none).rejects.toBeInstanceOf(CollaboratorNoDefaultLaunchError);
    await expect(none).rejects.toMatchObject({ collaboratorName: "Publisher", targetKind: "agent",
      reason: "There is no default runtime configured for the target agent Publisher" });
    expect(validateMany).not.toHaveBeenCalled();
    await expect(resolver.resolve([agentPlan({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: null, llmConfig: null })], base))
      .rejects.toBeInstanceOf(CollaboratorNoDefaultLaunchError);
  });

  it("refuses a default that cannot run here with its reason: runtime unavailable, model unavailable, settings invalid", async () => {
    const runtime = setup({ unavailable: { [RuntimeKind.CODEX_APP_SERVER]: "Codex is not installed." } });
    const offRuntime = runtime.resolver.resolve([agentPlan(sol())], base);
    await expect(offRuntime).rejects.toBeInstanceOf(CollaboratorAddError);
    await expect(offRuntime).rejects.not.toBeInstanceOf(CollaboratorNoDefaultLaunchError);
    await expect(offRuntime).rejects.toMatchObject({ collaboratorName: "Publisher", reason: "Codex is not installed." });
    await expect(setup({ verdict: () => "model_unavailable" }).resolver.resolve([agentPlan(sol())], base))
      .rejects.toMatchObject({ reason: `The model 'sol-6.1' is not available on Codex App Server.` });
    await expect(setup({ verdict: () => "invalid" }).resolver.resolve([agentPlan(sol())], base))
      .rejects.toMatchObject({ reason: "Its model settings are invalid: effort must be one of low, high" });
  });

  it("covers a Team member by the Team default; a member neither covers fails the Team", async () => {
    const { resolver } = setup();
    const [plan] = await resolver.resolve([teamPlan({ lead: opus(), writer: null }, sol())], base);
    expect(plan).toMatchObject({
      kind: "agent_team", defaultLaunchSource: { origin: "team_default", fallbacks: [] },
      defaultLaunchConfiguration: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, workspaceRootPath: "/data/temp_workspace", autoExecuteTools: true },
      members: [
        { address: "/studio_team/lead", followsTeam: false, launchSource: { origin: "agent_default" },
          launchConfiguration: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, workspaceRootPath: "/data/temp_workspace" } },
        { address: "/studio_team/writer", followsTeam: true, launchConfiguration: { runtimeKind: RuntimeKind.CODEX_APP_SERVER } },
      ],
    });
    const uncovered = resolver.resolve([teamPlan({ lead: opus(), writer: null })], base);
    await expect(uncovered).rejects.toBeInstanceOf(CollaboratorNoDefaultLaunchError);
    await expect(uncovered).rejects.toMatchObject({ reason: "There is no default runtime configured for the target agent team Studio Team" });
    await expect(setup({ unavailable: { [RuntimeKind.CODEX_APP_SERVER]: "Codex is not installed." } }).resolver
      .resolve([teamPlan({ lead: opus(), writer: null }, sol())], base)).rejects.toMatchObject({ reason: "Codex is not installed." });
  });
});
