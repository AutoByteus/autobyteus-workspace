import { describe, expect, it, vi } from "vitest";
import { CollaboratorLaunchResolver } from "../../../../src/agent-collaboration/collaborators/collaborator-launch-resolver.js";
import type { CollaboratorDefinitionPlan } from "../../../../src/agent-collaboration/collaborators/collaborator-entry-builder.js";
import type { DefaultLaunchConfig } from "../../../../src/launch-preferences/default-launch-config.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * DS-002: per-agent launch resolution for new collaborators and catalog copies.
 * Order agent default -> team default -> inherited root launch (REQ-001), one unit per layer
 * (REQ-002), recorded fallbacks (REQ-003), today's failure when nothing is usable (REQ-004),
 * batched availability and model evidence (QR-001).
 */
const root = {
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: { thinking: "on" },
  autoExecuteTools: true, workspaceRootPath: "/work",
} as const;
const sol = (llmConfig: Record<string, unknown> | null = { effort: "high" }): DefaultLaunchConfig =>
  ({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig });
const codexLaunch = (llmConfig: Record<string, unknown> | null = { effort: "high" }) => ({
  runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig, autoExecuteTools: true, workspaceRootPath: "/work",
});
const identity = { addedAt: "2026-10-12T00:00:00.000Z", addedViaAgentRunId: "pm" };

const agentPlan = (agentDefault: DefaultLaunchConfig | null, name = "Implementation Engineer"): CollaboratorDefinitionPlan => ({
  kind: "agent", name, address: "/implementation_engineer" as never, agentDefinitionId: "ie", agentDefault, ...identity,
});
const teamPlan = (
  members: Record<string, DefaultLaunchConfig | null>,
  teamDefault: DefaultLaunchConfig | null = null,
): CollaboratorDefinitionPlan => ({
  kind: "agent_team", name: "Software Engineering Team", address: "/software_engineering_team" as never,
  teamDefinitionId: "se", coordinatorAddress: "/software_engineering_team/solution_designer" as never, handoffs: [],
  members: Object.entries(members).map(([name, agentDefault]) => ({
    address: `/software_engineering_team/${name}` as never, agentDefinitionId: name, agentDefault,
  })),
  teamDefault, ...identity,
});

type Verdict = "valid" | "model_unavailable" | "invalid" | "schema_unavailable";
const setup = (options: {
  unavailable?: Partial<Record<string, string>>;
  verdict?: (runtimeKind: string, model: string) => Verdict;
} = {}) => {
  const availability = {
    getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => {
      const reason = options.unavailable?.[runtimeKind];
      return { runtimeKind, enabled: !reason, reason: reason ?? null };
    }),
  };
  const validateMany = vi.fn(async (inputs: readonly { context: { runtimeKind: string }; selection: { llmModelIdentifier: string } }[]) =>
    inputs.map(({ context, selection }) => {
      const kind = options.verdict?.(context.runtimeKind, selection.llmModelIdentifier) ?? "valid";
      return kind === "valid" ? { kind, selection: { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: null } }
        : kind === "invalid" ? { kind, errors: [{ path: "effort", message: "effort must be one of low, high" }] }
          : { kind };
    }));
  const validator = { validate: vi.fn(), validateMany } as unknown as RunModelSelectionValidator;
  return { availability, validateMany, resolver: new CollaboratorLaunchResolver({ availability, validator }) };
};

describe("CollaboratorLaunchResolver", () => {
  it("AC-001: members with a usable agent default run on it; the others and the Team inherit the root launch", async () => {
    const { resolver } = setup();
    const [plan] = await resolver.resolve([teamPlan({
      solution_designer: null, implementation_engineer: sol(), code_reviewer: sol({ effort: "low" }),
    })], root);
    expect(plan).toMatchObject({
      kind: "agent_team", defaultLaunchConfiguration: root, defaultLaunchSource: { origin: "inherited", fallbacks: [] },
    });
    expect(plan!.kind === "agent_team" && plan!.members).toEqual([
      { address: "/software_engineering_team/solution_designer", agentDefinitionId: "solution_designer" },
      { address: "/software_engineering_team/implementation_engineer", agentDefinitionId: "implementation_engineer",
        launchConfiguration: codexLaunch(), launchSource: { origin: "agent_default", fallbacks: [] } },
      { address: "/software_engineering_team/code_reviewer", agentDefinitionId: "code_reviewer",
        launchConfiguration: codexLaunch({ effort: "low" }), launchSource: { origin: "agent_default", fallbacks: [] } },
    ]);
  });

  it("AC-002: a usable Team default beats the root; an agent default beats the Team default (DEC-001)", async () => {
    const { resolver } = setup();
    const teamDefault: DefaultLaunchConfig = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "local-b", llmConfig: null };
    const [plan] = await resolver.resolve([teamPlan({ implementation_engineer: sol(), solution_designer: null }, teamDefault)], root);
    if (plan!.kind !== "agent_team") throw new Error("team plan expected");
    expect(plan!.defaultLaunchConfiguration).toEqual({
      runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "local-b", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work",
    });
    expect(plan!.defaultLaunchSource).toEqual({ origin: "team_default", fallbacks: [] });
    expect(plan!.members[0]).toMatchObject({ launchConfiguration: codexLaunch(), launchSource: { origin: "agent_default" } });
    // A member without its own default records nothing: it runs on the Team's launch.
    expect(plan!.members[1]).toEqual({ address: "/software_engineering_team/solution_designer", agentDefinitionId: "solution_designer" });
  });

  it("AC-003: an Agent copy runs on its own usable default, else on the root's, with root workspace and auto-approve", async () => {
    const { resolver } = setup();
    const [own, inherited] = await resolver.resolve([agentPlan(sol(null)), agentPlan(null, "Writer")], root);
    expect(own).toMatchObject({ launchConfiguration: codexLaunch(null), launchSource: { origin: "agent_default", fallbacks: [] } });
    expect(inherited).toMatchObject({ launchConfiguration: root, launchSource: { origin: "inherited", fallbacks: [] } });
  });

  it("AC-005: every unusable reason falls back to the next layer and records what was skipped and why", async () => {
    const { resolver } = setup({
      unavailable: { [RuntimeKind.GROK_BUILD]: "Grok Build CLI 'grok' is not available." },
      verdict: (runtimeKind, model) => model === "missing" ? "model_unavailable" : model === "bad-settings" ? "invalid" : "valid",
    });
    const [plan] = await resolver.resolve([teamPlan({
      unavailable_runtime: { runtimeKind: RuntimeKind.GROK_BUILD, llmModelIdentifier: "grok-4", llmConfig: null },
      model_not_offered: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "missing", llmConfig: null },
      settings_invalid: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "bad-settings", llmConfig: { effort: "max" } },
      runtime_only: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: null, llmConfig: null },
      model_only: { runtimeKind: null, llmModelIdentifier: "sol-6.1", llmConfig: null },
    })], root);
    if (plan!.kind !== "agent_team") throw new Error("team plan expected");
    const fallbacks = plan!.members.map((member) => {
      expect(member.launchConfiguration).toBeUndefined();
      expect(member.launchSource?.origin).toBe("inherited");
      return member.launchSource!.fallbacks;
    });
    expect(fallbacks).toEqual([
      [{ layer: "agent_default", runtimeKind: "grok_build", llmModelIdentifier: "grok-4", reason: "runtime_unavailable", detail: "Grok Build CLI 'grok' is not available." }],
      [{ layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: "missing", reason: "model_unavailable", detail: "The model 'missing' is not available on codex_app_server." }],
      [{ layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: "bad-settings", reason: "model_settings_invalid", detail: "Its model settings are invalid: effort must be one of low, high" }],
      [{ layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: null, reason: "incomplete", detail: "It names no model." }],
      [{ layer: "agent_default", runtimeKind: null, llmModelIdentifier: "sol-6.1", reason: "incomplete", detail: "It names no runtime." }],
    ]);
  });

  it("AC-005: an unusable Team default falls back to the root for the Team and its members, recorded on the Team", async () => {
    const { resolver } = setup({ unavailable: { [RuntimeKind.CODEX_APP_SERVER]: "Codex App Server command 'codex' is not available." } });
    const [plan] = await resolver.resolve([teamPlan({ implementation_engineer: sol(), solution_designer: null }, sol())], root);
    if (plan!.kind !== "agent_team") throw new Error("team plan expected");
    const skipped = { runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1", reason: "runtime_unavailable", detail: "Codex App Server command 'codex' is not available." };
    expect(plan!.defaultLaunchConfiguration).toEqual(root);
    expect(plan!.defaultLaunchSource).toEqual({ origin: "inherited", fallbacks: [{ layer: "team_default", ...skipped }] });
    // The member's own source records its own skipped layer; the Team's fallback stays on the Team.
    expect(plan!.members[0]).toEqual({
      address: "/software_engineering_team/implementation_engineer", agentDefinitionId: "implementation_engineer",
      launchSource: { origin: "inherited", fallbacks: [{ layer: "agent_default", ...skipped }] },
    });
    expect(plan!.members[1]).toEqual({ address: "/software_engineering_team/solution_designer", agentDefinitionId: "solution_designer" });
  });

  it("AC-006: when an agent has no usable layer, the plan fails with today's message and names the definition", async () => {
    const { resolver } = setup({ verdict: (runtimeKind) => runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? "model_unavailable" : "valid" });
    await expect(resolver.resolve([agentPlan(null, "Code Reviewer")], root))
      .rejects.toMatchObject({ code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer", reason: "The model 'opus' is not available on claude_agent_sdk." });
    await expect(resolver.resolve([teamPlan({ implementation_engineer: sol(), solution_designer: null })], root))
      .rejects.toMatchObject({ collaboratorName: "Software Engineering Team", reason: "The model 'opus' is not available on claude_agent_sdk." });
    const schema = setup({ verdict: () => "schema_unavailable" });
    await expect(schema.resolver.resolve([agentPlan(null)], root)).rejects.toMatchObject({ reason: "The settings of model 'opus' could not be checked." });
    const invalid = setup({ verdict: () => "invalid" });
    await expect(invalid.resolver.resolve([agentPlan(null)], root)).rejects.toMatchObject({ reason: "Its model settings are invalid: effort must be one of low, high" });
  });

  it("REQ-004 scope: an unusable root launch fails only an agent that needs it", async () => {
    const { resolver } = setup({ verdict: (runtimeKind) => runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? "model_unavailable" : "valid" });
    const [plan] = await resolver.resolve([teamPlan({ implementation_engineer: sol(), code_reviewer: sol() })], root);
    expect(plan!.kind === "agent_team" && plan!.members.every((member) => member.launchSource?.origin === "agent_default")).toBe(true);
  });

  it("QR-001: one availability check per distinct configured runtime and one validateMany per batch", async () => {
    const { resolver, availability, validateMany } = setup({ unavailable: { [RuntimeKind.GROK_BUILD]: "no grok" } });
    const grok: DefaultLaunchConfig = { runtimeKind: RuntimeKind.GROK_BUILD, llmModelIdentifier: "grok-4", llmConfig: null };
    await resolver.resolve([
      teamPlan({ a: sol(), b: sol(), c: grok, d: grok, e: null }, sol()),
      agentPlan(sol()),
      agentPlan({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: null, llmConfig: null }, "Incomplete"),
    ], root);
    expect(availability.getRuntimeAvailability.mock.calls.map(([kind]) => kind).sort()).toEqual([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.GROK_BUILD]);
    expect(validateMany).toHaveBeenCalledTimes(1);
    // The root launch plus each candidate on an available runtime (Team default, a, b, the Agent's); never Grok's or the incomplete one.
    const inputs = validateMany.mock.calls[0]![0];
    expect(inputs.map((input) => `${input.context.runtimeKind}/${input.selection.llmModelIdentifier}`)).toEqual([
      "claude_agent_sdk/opus", "codex_app_server/sol-6.1", "codex_app_server/sol-6.1", "codex_app_server/sol-6.1", "codex_app_server/sol-6.1",
    ]);
    expect(inputs.every((input) => (input.context as { workspaceRootPath: string }).workspaceRootPath === "/work")).toBe(true);
  });

  it("no configured defaults: no availability check, only today's root check", async () => {
    const { resolver, availability, validateMany } = setup();
    await resolver.resolve([agentPlan(null), teamPlan({ a: null })], root);
    expect(availability.getRuntimeAvailability).not.toHaveBeenCalled();
    expect(validateMany.mock.calls[0]![0]).toHaveLength(1);
    expect(await resolver.resolve([], root)).toEqual([]);
    expect(validateMany).toHaveBeenCalledTimes(1);
  });

  it("an availability check that throws counts as an unavailable runtime", async () => {
    const { resolver, availability } = setup();
    availability.getRuntimeAvailability.mockRejectedValueOnce(new Error("probe crashed"));
    const [plan] = await resolver.resolve([agentPlan(sol())], root);
    expect(plan).toMatchObject({ launchConfiguration: root, launchSource: { origin: "inherited", fallbacks: [
      { reason: "runtime_unavailable", detail: "Runtime 'codex_app_server' could not be checked: probe crashed" },
    ] } });
  });
});
