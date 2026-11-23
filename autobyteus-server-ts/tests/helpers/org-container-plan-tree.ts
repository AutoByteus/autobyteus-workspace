import type { CreateAgentOrgContainerInput } from "../../src/agent-org-execution/container/agent-org-container-manager.js";

/**
 * A test double of `AgentOrgRunManager.createContainer`'s result (org-teams-follow-definition): the live Org with its tree
 * as the view composes it from the plan (each unit at its Org address, a Team's members at `P/x` with their launches).
 */
export const liveOrgOfPlan = (input: CreateAgentOrgContainerInput) => {
  const tree = {
    rootOrg: {
      orgRunId: input.orgRunId, orgDefinitionId: input.orgDefinitionId, orgDefinitionName: input.orgDefinitionName,
      defaultLaunchConfiguration: input.defaultLaunchConfiguration,
      members: input.plan.units.map((unit) => unit.kind === "agent"
        ? { address: unit.address, agentDefinitionId: unit.agentDefinitionId, launchConfiguration: unit.launchConfiguration }
        : { address: unit.address, teamDefinitionId: unit.teamDefinitionId, defaultLaunchConfiguration: unit.defaultLaunchConfiguration,
          members: unit.members.map((member) => ({ address: `${unit.address}${member.address}`, agentDefinitionId: member.agentDefinitionId,
            launchConfiguration: member.launchConfiguration })) }),
    },
    handoffs: input.plan.orgRules,
  };
  return { orgRunId: input.orgRunId, getExecutionTreeSnapshot: () => tree };
};
