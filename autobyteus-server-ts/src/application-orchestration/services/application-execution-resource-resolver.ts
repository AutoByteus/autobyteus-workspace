import type {
  ApplicationExecutionResourceKind,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
} from "@autobyteus/application-sdk-contracts";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";

export type ResolvedApplicationExecutionResource = ApplicationExecutionResourceSummary;

const normalizeFriendlyName = (
  explicitName: string | null | undefined,
  fallbackIdentifier: string,
): string => {
  const normalized = explicitName?.trim();
  return normalized && normalized.length > 0 ? normalized : fallbackIdentifier;
};

export class ApplicationExecutionResourceResolver {
  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      agentDefinitionService?: AgentDefinitionService;
      agentTeamDefinitionService?: AgentTeamDefinitionService;
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get agentDefinitionService(): AgentDefinitionService {
    return this.dependencies.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  private get agentTeamDefinitionService(): AgentTeamDefinitionService {
    return this.dependencies.agentTeamDefinitionService ?? AgentTeamDefinitionService.getInstance();
  }

  async listAvailableExecutionResources(
    applicationId: string,
    filter?: { source?: "bundle" | "shared" | null; kind?: ApplicationExecutionResourceKind | null } | null,
  ): Promise<ApplicationExecutionResourceSummary[]> {
    const bundle = await this.applicationBundleService.getApplicationById(applicationId);
    if (!bundle) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }

    const bundleResources = await Promise.all(bundle.bundleResources.map(async (resource) => {
      const definitionName = resource.kind === "AGENT"
        ? (await this.agentDefinitionService.getAgentDefinitionById(resource.definitionId))?.name ?? null
        : (await this.agentTeamDefinitionService.getDefinitionById(resource.definitionId))?.name ?? null;
      return {
        source: "bundle" as const,
        kind: resource.kind,
        localId: resource.localId,
        definitionId: resource.definitionId,
        name: normalizeFriendlyName(definitionName, resource.localId || resource.definitionId),
        applicationId,
      };
    }));

    const sharedAgents = (await this.agentDefinitionService.getVisibleAgentDefinitions())
      .filter((definition) => definition.ownershipScope === "shared" && typeof definition.id === "string")
      .map((definition) => ({
        source: "shared" as const,
        kind: "AGENT" as const,
        localId: null,
        definitionId: definition.id as string,
        name: normalizeFriendlyName(definition.name, definition.id as string),
        applicationId: null,
      }));

    const sharedTeams = (await this.agentTeamDefinitionService.getAllDefinitions())
      .filter((definition) => (definition.ownershipScope ?? "shared") === "shared" && typeof definition.id === "string")
      .map((definition) => ({
        source: "shared" as const,
        kind: "AGENT_TEAM" as const,
        localId: null,
        definitionId: definition.id as string,
        name: normalizeFriendlyName(definition.name, definition.id as string),
        applicationId: null,
      }));

    return [...bundleResources, ...sharedAgents, ...sharedTeams].filter((resource) => {
      if (filter?.source && resource.source !== filter.source) {
        return false;
      }
      if (filter?.kind && resource.kind !== filter.kind) {
        return false;
      }
      return true;
    });
  }

  async resolveExecutionResource(
    applicationId: string,
    executionResourceRef: ApplicationExecutionResourceRef,
  ): Promise<ResolvedApplicationExecutionResource> {
    const resources = await this.listAvailableExecutionResources(applicationId, {
      source: executionResourceRef.source,
      kind: executionResourceRef.kind,
    });

    const resolved = resources.find((resource) => (
      executionResourceRef.source === "bundle"
        ? resource.localId === executionResourceRef.localId
        : resource.definitionId === executionResourceRef.definitionId
    ));

    if (!resolved) {
      throw new Error(`Application execution resource could not be resolved for application '${applicationId}'.`);
    }

    return resolved;
  }
}
