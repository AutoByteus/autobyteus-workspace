import type { AgentDefinition } from "../domain/models.js";
import { readShowInternalAgents } from "../../config/show-internal-agents-setting.js";

/** Every agent definition the node has: shared, team-local and application-package ones. */
export type AgentDefinitionsSource = Readonly<{
  getAgentDefinitionsWithTeamLocal(): Promise<readonly AgentDefinition[]>;
}>;

/**
 * The one rule for internal agents (autobyteus-308): an agent definition marked internal is hidden while the server
 * setting "Show internal agents" is off. Every place that lets the user or an agent browse, pick or delegate to agents
 * asks it (the visible agent list, collaboration eligibility, run history, the Memory page, `list_agent_definitions`);
 * none reads the setting or the attribute itself. Opening a definition or run by ID does not ask it.
 */
export class InternalAgentVisibility {
  constructor(private readonly dependencies: Readonly<{
    definitions: AgentDefinitionsSource;
    /** The setting, read on each call (so a change applies at once). */
    readShowInternalAgents?: () => boolean;
  }>) {}

  showInternalAgents(): boolean {
    return (this.dependencies.readShowInternalAgents ?? readShowInternalAgents)();
  }

  isHidden(definition: Pick<AgentDefinition, "internal">): boolean {
    return definition.internal === true && !this.showInternalAgents();
  }

  /** The IDs of every hidden definition now, for filtering rows (runs) by their definition ID. */
  async hiddenDefinitionIds(): Promise<ReadonlySet<string>> {
    if (this.showInternalAgents()) return new Set();
    const definitions = await this.dependencies.definitions.getAgentDefinitionsWithTeamLocal();
    return new Set(definitions.flatMap((definition) => definition.internal && definition.id ? [definition.id] : []));
  }
}

let processVisibility: InternalAgentVisibility | null = null;

/**
 * The process rule over the process agent definitions. The definition service is loaded lazily, so this module and
 * the service (which filters its visible list with the rule) do not import each other at load time.
 */
export const getInternalAgentVisibility = (): InternalAgentVisibility => processVisibility ??= new InternalAgentVisibility({
  definitions: {
    getAgentDefinitionsWithTeamLocal: async () => {
      const { AgentDefinitionService } = await import("./agent-definition-service.js");
      return AgentDefinitionService.getInstance().getAgentDefinitionsWithTeamLocal();
    },
  },
});
