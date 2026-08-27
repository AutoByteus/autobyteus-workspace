import type {
  ApplicationEffectiveLaunchConfiguration,
} from "@autobyteus/application-sdk-contracts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { TeamDefinitionTraversalService } from "../../agent-team-execution/services/team-definition-traversal-service.js";
import { runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import type { SkillService } from "../../skills/services/skill-service.js";
import type { ApplicationAgentToolCatalog } from "../../application-agent-tools/services/application-agent-tool-catalog.js";

const validateRuntimeKind = (
  runtimeKind: string | null | undefined,
  label: string,
  diagnostics: string[],
): void => {
  if (runtimeKind && !runtimeKindFromString(runtimeKind)) {
    diagnostics.push(`${label}: runtime '${runtimeKind}' has no registered adapter`);
  }
};

export class ApplicationRuntimeDefinitionValidator {
  private readonly teamTraversal: TeamDefinitionTraversalService;

  constructor(private readonly dependencies: {
    agentDefinitionService: AgentDefinitionService;
    agentTeamDefinitionService: AgentTeamDefinitionService;
    skillService: Pick<SkillService, "resolveConfiguredSkillsForAgent">;
    toolRegistry?: Pick<typeof defaultToolRegistry, "getToolDefinition">;
    applicationAgentToolCatalog: ApplicationAgentToolCatalog;
  }) {
    this.teamTraversal = new TeamDefinitionTraversalService(
      dependencies.agentTeamDefinitionService,
    );
  }

  async validateResource(
    applicationId: string,
    kind: "AGENT" | "AGENT_TEAM",
    definitionId: string,
    label: string,
    diagnostics: string[],
  ): Promise<void> {
    if (kind === "AGENT") {
      const definition =
        await this.dependencies.agentDefinitionService.getAgentDefinitionById(definitionId);
      if (!definition) {
        diagnostics.push(`${label}: missing AGENT definition '${definitionId}'`);
        return;
      }
      this.validateAgent(applicationId, definition, label, diagnostics);
      return;
    }

    const team =
      await this.dependencies.agentTeamDefinitionService.getDefinitionById(definitionId);
    if (!team) {
      diagnostics.push(`${label}: missing AGENT_TEAM definition '${definitionId}'`);
      return;
    }
    validateRuntimeKind(team.defaultLaunchConfig?.runtimeKind, label, diagnostics);
    try {
      const members = await this.teamTraversal.collectLeafAgentMembers(definitionId);
      for (const member of members) {
        const definition =
          await this.dependencies.agentDefinitionService
            .getAgentDefinitionById(member.agentDefinitionId);
        if (!definition) {
          diagnostics.push(
            `${label}: missing member AGENT definition '${member.agentDefinitionId}'`,
          );
          continue;
        }
        this.validateAgent(applicationId, definition, `${label}${member.memberAddress}`, diagnostics);
      }
    } catch (error) {
      diagnostics.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateEffectiveLaunchConfiguration(
    configuration: ApplicationEffectiveLaunchConfiguration,
    label: string,
    diagnostics: string[],
  ): void {
    const subjects = configuration.resourceKind === "AGENT_TEAM"
      ? [...configuration.teamScopes, ...configuration.leaves]
      : configuration.leaves;
    for (const member of subjects) {
      validateRuntimeKind(
        member.runtimeKind,
        `${label}/${"memberAddress" in member
          ? member.memberAddress ?? member.agentDefinitionId
          : member.teamAddress}`,
        diagnostics,
      );
    }
  }

  private validateAgent(
    applicationId: string,
    definition: AgentDefinition,
    label: string,
    diagnostics: string[],
  ): void {
    const toolRegistry = this.dependencies.toolRegistry ?? defaultToolRegistry;
    for (const toolName of definition.toolNames) {
      if (
        !toolRegistry.getToolDefinition(toolName)
        && !this.dependencies.applicationAgentToolCatalog
          .getDeclarationSnapshot(applicationId, toolName)
      ) {
        diagnostics.push(`${label}: tool '${toolName}' is not registered`);
      }
    }
    const resolvedSkills = new Map(
      this.dependencies.skillService.resolveConfiguredSkillsForAgent(definition)
        .map((skill) => [skill.name, skill]),
    );
    for (const skillName of definition.skillNames) {
      const skill = resolvedSkills.get(skillName);
      if (!skill) {
        diagnostics.push(`${label}: skill '${skillName}' is not available`);
      } else if (skill.isDisabled) {
        diagnostics.push(`${label}: skill '${skillName}' is disabled`);
      }
    }
    validateRuntimeKind(definition.defaultLaunchConfig?.runtimeKind, label, diagnostics);
  }
}
