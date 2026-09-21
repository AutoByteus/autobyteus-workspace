import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
import { DefinitionEndpointCatalog, type DefinitionEndpointCatalogProjection } from "../../agent-collaboration/definition/definition-endpoint-catalog.js";
import { AgentOrgDefinition, AgentOrgDefinitionUpdate } from "../domain/agent-org-definition.js";
import { FileAgentOrgDefinitionProvider } from "../providers/file-agent-org-definition-provider.js";
import { AgentOrgDefinitionResolver } from "./agent-org-definition-resolver.js";

type Provider = Pick<FileAgentOrgDefinitionProvider, "create" | "getById" | "getAll" | "update" | "delete">;
export class AgentOrgDefinitionService {
  private static instance: AgentOrgDefinitionService | null = null;
  static getInstance(): AgentOrgDefinitionService {
    return this.instance ??= new AgentOrgDefinitionService();
  }
  static bindProcessInstance(instance: AgentOrgDefinitionService): void {
    if (!instance) throw new Error("A process AgentOrgDefinitionService instance is required.");
    if (this.instance) throw new Error("The process AgentOrgDefinitionService is already initialized.");
    this.instance = instance;
  }
  static releaseProcessInstance(instance: AgentOrgDefinitionService): void {
    if (this.instance === instance) this.instance = null;
  }
  constructor(
    private readonly provider: Provider = new FileAgentOrgDefinitionProvider(),
    private readonly agentService: Pick<AgentDefinitionService, "getFreshAgentDefinitionById"> = AgentDefinitionService.getInstance(),
    private readonly teamService: Pick<AgentTeamDefinitionService, "getFreshDefinitionById"> = AgentTeamDefinitionService.getInstance(),
  ) {}
  getDefinitionById(id: string): Promise<AgentOrgDefinition | null> { return this.provider.getById(id); }
  getAllDefinitions(): Promise<AgentOrgDefinition[]> { return this.provider.getAll(); }
  private async validate(definition: AgentOrgDefinition, fallbackId?: string): Promise<void> {
    const resolved = await new AgentOrgDefinitionResolver().resolve({
      definition, definitionId: definition.id ?? fallbackId,
      lookup: {
        getAgentById: (id) => this.agentService.getFreshAgentDefinitionById(id),
        getTeamById: (id) => this.teamService.getFreshDefinitionById(id),
      },
    });
    new CollaborationHandoffCompiler().compileOrg(resolved);
  }
  async getEndpointCatalog(id: string): Promise<DefinitionEndpointCatalogProjection> {
    const definition = await this.provider.getById(id);
    if (!definition) throw new Error(`AgentOrg '${id}' was not found.`);
    const resolved = await new AgentOrgDefinitionResolver().resolve({
      definition,
      lookup: {
        getAgentById: (agentId) => this.agentService.getFreshAgentDefinitionById(agentId),
        getTeamById: (teamId) => this.teamService.getFreshDefinitionById(teamId),
      },
    });
    return new DefinitionEndpointCatalog().projectOrg(resolved);
  }
  async createDefinition(definition: AgentOrgDefinition): Promise<AgentOrgDefinition> {
    if (definition.id) throw new Error("Cannot create an AgentOrg that already has an id.");
    await this.validate(definition, "__new_agent_org_candidate__");
    return this.provider.create(definition);
  }
  async updateDefinition(id: string, update: AgentOrgDefinitionUpdate): Promise<AgentOrgDefinition> {
    const existing = await this.provider.getById(id);
    if (!existing) throw new Error(`AgentOrg '${id}' was not found.`);
    if (existing.revision !== update.values.expectedRevision) {
      const error = new Error("The AgentOrg changed after this draft was loaded. Refresh and apply the draft again.") as Error & { code: string };
      error.code = "DEFINITION_REVISION_CONFLICT"; throw error;
    }
    const v = update.values;
    const candidate = new AgentOrgDefinition({
      id, name: v.name ?? existing.name, description: v.description ?? existing.description,
      instructions: v.instructions ?? existing.instructions, category: v.category ?? existing.category,
      members: v.members ?? existing.members, handoffs: v.handoffs ?? existing.handoffs,
      avatarUrl: v.avatarUrl ?? existing.avatarUrl,
      defaultLaunchConfig: v.defaultLaunchConfig === undefined ? existing.defaultLaunchConfig : v.defaultLaunchConfig,
      revision: update.values.expectedRevision, source: existing.source,
    });
    await this.validate(candidate);
    return this.provider.update(candidate);
  }
  deleteDefinition(id: string): Promise<boolean> { return this.provider.delete(id); }
}
