import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentOrgDefinitionService } from "../../agent-org-definition/services/agent-org-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { AgentOrgContainerFile } from "../domain/agent-org-container-file.js";
import { planAgentOrgContainer } from "../container/agent-org-container-plan.js";
import { AgentOrgRunPlanner } from "../services/agent-org-run-planner.js";
import type { OrgDefinitionView } from "./org-membership-change.js";

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const NO_IDENTITIES = Object.freeze({
  allocateAgent: async () => { throw new Error("Unit run IDs are allocated by their run services."); },
  allocateTeam: () => { throw new Error("Unit run IDs are allocated by their run services."); },
  allocateOrg: () => { throw new Error("An Org that follows its definition keeps its run."); },
});

/** Whether an Org container follows its definition (contract §11: an application's Org does not, as its units do not). */
export const followsOrgDefinition = (file: AgentOrgContainerFile): boolean => file.applicationBinding === null;

/**
 * What an Org container's definition is now, for that container (REQ-009, design DS-006): the units its definition
 * mounts, resolved as the launch page resolves them (each new unit's launch inherits the container's own launch, as the
 * launch page's root row gives it), and the Org-level rules. A definition that is missing, unreadable or invalid leaves the
 * Org as it is, with one warning naming the run and the reason, until it is valid again (as a Team run, REQ-007 of
 * autobyteus-22).
 */
export class OrgMembershipPlanner {
  private readonly warned = new Map<string, string>();

  constructor(private readonly dependencies: Readonly<{
    orgDefinitions: Pick<AgentOrgDefinitionService, "getDefinitionById" | "listLoadIssues">;
    teamDefinitions: Pick<AgentTeamDefinitionService, "getDefinitionById">;
    agentDefinitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  }>) {}

  async viewFor(file: AgentOrgContainerFile): Promise<OrgDefinitionView | null> {
    if (!followsOrgDefinition(file)) return null;
    const orgRunId = file.rootOrg.orgRunId;
    const orgDefinitionId = file.rootOrg.orgDefinitionId;
    try {
      const definition = await this.dependencies.orgDefinitions.getDefinitionById(orgDefinitionId);
      if (!definition) return this.notFollowed(orgRunId, `Org definition '${orgDefinitionId}' was not found.`);
      const loadIssue = (await this.dependencies.orgDefinitions.listLoadIssues()).find((entry) => entry.definitionId === orgDefinitionId);
      if (loadIssue) {
        return this.notFollowed(orgRunId, `Org definition '${orgDefinitionId}' could not be read (${loadIssue.issue.reason}); its last good version is not followed.`);
      }
      const planner = new AgentOrgRunPlanner({
        getAgentById: (id) => this.dependencies.agentDefinitions.getAgentDefinitionById(id),
        getTeamById: (id) => this.dependencies.teamDefinitions.getDefinitionById(id),
      }, NO_IDENTITIES);
      const resolved = await planner.resolveConfiguration({ definition, rootConfiguration: file.rootOrg.defaultLaunchConfiguration });
      const view = Object.freeze({ orgDefinitionId, plan: planAgentOrgContainer({ topology: resolved.topology, launch: resolved.launch }) });
      this.warned.delete(orgRunId);
      return view;
    } catch (error) {
      return this.notFollowed(orgRunId, `Org definition '${orgDefinitionId}' cannot be used (${message(error)}).`);
    }
  }

  private notFollowed(orgRunId: string, reason: string): null {
    if (this.warned.get(orgRunId) !== reason) {
      this.warned.set(orgRunId, reason);
      console.warn(`AGENT_ORG_DEFINITION_NOT_FOLLOWED: AgentOrg '${orgRunId}' keeps its units: ${reason}`);
    }
    return null;
  }
}
