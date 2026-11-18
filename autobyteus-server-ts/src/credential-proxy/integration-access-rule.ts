import fs from "node:fs";
import path from "node:path";
import { normalizeAgentSkillScope, type AgentDefinition } from "../agent-definition/domain/models.js";
import type { SkillService } from "../skills/services/skill-service.js";
import type { DeliveryDefinitions } from "./delivery-definitions.js";
import type { IntegrationCatalog } from "./integration-catalog.js";

/** Why a run may use one integration: the integration skill and the source it was resolved from at preparation. */
export type IntegrationGrant = Readonly<{
  integrationId: string;
  skillName: string;
  /** The source of the integration's folder (`local:<path>` or a GitHub record ID), checked again on every call. */
  sourceId: string;
}>;

const resolveReal = (target: string): string => {
  try {
    return fs.realpathSync(target);
  } catch {
    return path.resolve(target);
  }
};

/**
 * The one access fact (DS-004, REQ-005): a run may use an integration when its agent's effective skills hold that
 * integration's skill, the copy in the integration's own folder. Checked fully when a run is prepared, and cheaply on
 * every proxied call (no catalog rebuild), so withdrawn access stops at the next call.
 */
export class IntegrationAccessRule {
  constructor(private readonly deps: Readonly<{
    catalog: Pick<IntegrationCatalog, "entries" | "isSourceRegistered">;
    definitions: DeliveryDefinitions;
    agentDefinitions: Readonly<{ getAgentDefinitionById(id: string): Promise<AgentDefinition | null> }>;
    skills: Pick<SkillService, "resolveConfiguredSkillBindingsForAgent" | "isSkillDisabled">;
  }>) {}

  /**
   * The full check at run preparation: for each imported integration this app can deliver, whether the agent's
   * effective skills (both scopes, disabled ones excluded) hold a resolved skill with the integration skill's name
   * whose folder is the integration's folder. A same-named skill from anywhere else grants nothing.
   */
  async grantsForAgent(agentDefinitionId: string): Promise<IntegrationGrant[]> {
    const entries = this.deps.catalog.entries().filter((entry) => this.deps.definitions.get(entry.id));
    if (entries.length === 0) return [];
    const agentDefinition = await this.deps.agentDefinitions.getAgentDefinitionById(agentDefinitionId);
    if (!agentDefinition) return [];
    const skillRoots = new Set(this.deps.skills.resolveConfiguredSkillBindingsForAgent(agentDefinition)
      .flatMap((binding) => binding.kind === "resolved" && !binding.skill.isDisabled
        ? [`${binding.skill.name}\u0000${resolveReal(binding.skill.rootPath)}`]
        : []));
    return entries
      .filter((entry) => skillRoots.has(`${entry.skillName}\u0000${resolveReal(entry.folderPath)}`))
      .map((entry) => Object.freeze({ integrationId: entry.id, skillName: entry.skillName, sourceId: entry.source.sourceId }));
  }

  /**
   * The cheap check on every proxied call, against what was granted at preparation: the agent definition (re-read)
   * still has the skill (configured by name, or all installed skills), the skill is not disabled, and the source the
   * run got it from is still registered. The token's presence is checked by the proxy when it reads the token.
   */
  async allowsCall(agentDefinitionId: string, grant: IntegrationGrant): Promise<boolean> {
    const agentDefinition = await this.deps.agentDefinitions.getAgentDefinitionById(agentDefinitionId);
    if (!agentDefinition) return false;
    const stillHasSkill = normalizeAgentSkillScope(agentDefinition.skillScope) === "ALL_INSTALLED"
      || (agentDefinition.skillNames ?? []).some((name) => typeof name === "string" && name.trim() === grant.skillName);
    return stillHasSkill
      && !this.deps.skills.isSkillDisabled(grant.skillName)
      && this.deps.catalog.isSourceRegistered(grant.sourceId);
  }
}
