import { Arg, Int, Query, Resolver } from "type-graphql";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { MemoryFileStore } from "../../../agent-memory/store/memory-file-store.js";
import { AgentMemoryExplorerService } from "../../../agent-memory/services/agent-memory-explorer-service.js";
import { TeamMemoryExplorerService } from "../../../agent-memory/services/team-memory-explorer-service.js";
import type { AgentMemoryAttribution as DomainAgentMemoryAttribution } from "../../../agent-memory/domain/models.js";
import {
  AgentMemoryAttribution,
  AgentRunMemoryPage,
  AgentTeamRunMemoryPage,
  AgentTeamWithMemoryPage,
  AgentWithMemoryPage,
  AgentWithMemorySelectorInput,
} from "./memory-explorer-schema.js";

const toDomainAttribution = (value: AgentMemoryAttribution): DomainAgentMemoryAttribution =>
  value === AgentMemoryAttribution.UNATTRIBUTED ? "UNATTRIBUTED" : "DEFINITION";

@Resolver()
export class MemoryExplorerResolver {
  @Query(() => AgentWithMemoryPage)
  async listAgentsWithMemory(
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentWithMemoryPage> {
    const baseDir = appConfigProvider.config.getMemoryDir();
    const service = new AgentMemoryExplorerService(new MemoryFileStore(baseDir), baseDir);
    return await service.listAgentsWithMemory(search ?? null, page, pageSize) as unknown as AgentWithMemoryPage;
  }

  @Query(() => AgentRunMemoryPage)
  async listAgentRunsWithMemory(
    @Arg("selector", () => AgentWithMemorySelectorInput) selector: AgentWithMemorySelectorInput,
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentRunMemoryPage> {
    const baseDir = appConfigProvider.config.getMemoryDir();
    const service = new AgentMemoryExplorerService(new MemoryFileStore(baseDir), baseDir);
    return await service.listAgentRunsWithMemory(
      {
        attribution: toDomainAttribution(selector.attribution),
        agentDefinitionId: selector.agentDefinitionId ?? null,
      },
      search ?? null,
      page,
      pageSize,
    ) as unknown as AgentRunMemoryPage;
  }

  @Query(() => AgentTeamWithMemoryPage)
  async listAgentTeamsWithMemory(
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentTeamWithMemoryPage> {
    const baseDir = appConfigProvider.config.getMemoryDir();
    const service = new TeamMemoryExplorerService(baseDir);
    return await service.listAgentTeamsWithMemory(search ?? null, page, pageSize) as unknown as AgentTeamWithMemoryPage;
  }

  @Query(() => AgentTeamRunMemoryPage)
  async listAgentTeamRunsWithMemory(
    @Arg("teamDefinitionId", () => String) teamDefinitionId: string,
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentTeamRunMemoryPage> {
    const baseDir = appConfigProvider.config.getMemoryDir();
    const service = new TeamMemoryExplorerService(baseDir);
    return await service.listAgentTeamRunsWithMemory(teamDefinitionId, search ?? null, page, pageSize) as unknown as AgentTeamRunMemoryPage;
  }
}
