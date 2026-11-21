import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { FlatTeamTopologyPlanner } from "../../../src/agent-team-execution/services/flat-team-topology-planner.js";
import { assertValidFlatTeamDefinition } from "../../../src/agent-team-definition/services/flat-team-definition-validator.js";
import { resolveMemberCollaborationScope } from "../../../src/agent-collaboration/execution/domain/member-instance-scope.js";
import { MemberCollaborationContext } from "../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { GetHandoffRulesService } from "../../../src/agent-communication/services/get-handoff-rules-service.js";

/**
 * autobyteus-461 CR-461-009 (contract §2.1, SR-054): a delegated team keeps a handoff `to` outside the team as an
 * external target; a team the user starts, and a saved definition, keep today's check.
 */
const devTeam = (handoffs: unknown[] = [{ from: "/lead", to: "/dev", rules: ["When the design is ready."] }]) => ({
  id: "dev-team", name: "Dev Team", description: "", instructions: "", coordinatorMemberName: "lead",
  nodes: [{ memberName: "lead", refScope: "shared", ref: "agent-lead" }, { memberName: "dev", refScope: "shared", ref: "agent-dev" }],
  handoffs,
});
const plannerFor = (definition: unknown) => new FlatTeamTopologyPlanner({ getDefinitionById: vi.fn(async () => definition) } as never,
  { allocateForTeamDefinitionName: () => "dev_team_1" }, { allocateForAgentDefinition: async (id: string) => `${id}_run` });
const launch = { llmModelIdentifier: "m", autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, workspaceRootPath: "/tmp/w", llmConfig: null };
const planInput = { teamDefinitionId: "dev-team", teamConfigs: [{ teamAddress: "/", ...launch }],
  memberConfigs: [{ memberAddress: "/lead", ...launch }, { memberAddress: "/dev", ...launch }] };
/** The org's rules for its mounted team's members, as the delegation source carries them (team-local; outside `to` as written). */
const delegationRules = [
  { from: "/lead", to: "/dev", rules: ["When the design is ready."] },
  { from: "/lead", to: "/ceo_agent", rules: ["When the release is ready for sign-off."] },
];

describe("a delegated team's handoff outside the team (CR-461-009)", () => {
  it("is kept as an external target when the team is delegated, and get_handoff_rules names it", async () => {
    const plan = await plannerFor(devTeam()).buildPlan({ ...planInput, handoffs: { kind: "delegated_team", handoffs: delegationRules } });
    expect(plan.config.handoffs).toEqual(delegationRules);

    const scope = resolveMemberCollaborationScope({ memberAddress: "/lead" as never, agentRunId: "agent-lead_run",
      root: { configured: { addresses: ["/lead", "/dev"], agentRunIds: ["agent-lead_run", "agent-dev_run"], role: "team_member" } as never,
        handoffs: plan.config.handoffs, definition: { kind: "agent_team", definitionId: "dev-team" } } });
    const rules = new GetHandoffRulesService().getRules(new MemberCollaborationContext({ outgoingHandoffs: () => scope.outgoingHandoffs,
      deliverLogicalMessage: async () => ({ accepted: true }) as never }));
    expect(rules.handoffs).toEqual([
      { when: "When the design is ready.", recipient_address: "/dev" },
      { when: "When the release is ready for sign-off.", recipient_address: "/ceo_agent" },
    ]);
  });

  it("a delegated team without the delegation's rules plans its definition's, with the same rule", async () => {
    const plan = await plannerFor(devTeam()).buildPlan({ ...planInput, handoffs: { kind: "delegated_team" } });
    expect(plan.config.handoffs).toEqual([{ from: "/lead", to: "/dev", rules: ["When the design is ready."] }]);
  });

  it("a delegated team's `from` must still be one of its agents", async () => {
    await expect(plannerFor(devTeam()).buildPlan({ ...planInput,
      handoffs: { kind: "delegated_team", handoffs: [{ from: "/ceo_agent", to: "/lead", rules: ["Never."] }] } }))
      .rejects.toThrow("Team-local endpoint '/ceo_agent' was not found.");
  });

  it("a team the user starts, and a saved definition, still refuse a `to` outside the team", async () => {
    const outside = devTeam([{ from: "/lead", to: "/ceo_agent", rules: ["When the release is ready for sign-off."] }]);
    await expect(plannerFor(outside).buildPlan(planInput)).rejects.toThrow("Team-local endpoint '/ceo_agent' was not found.");
    await expect(assertValidFlatTeamDefinition({ rootDefinition: outside as never,
      lookup: { getAgentById: async (id: string) => ({ id, name: id }) } as never }))
      .rejects.toThrow("Team-local endpoint '/ceo_agent' was not found.");
  });
});
