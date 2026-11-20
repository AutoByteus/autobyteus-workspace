import { Arg, Int, Query, Resolver } from "type-graphql";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { MemoryFileStore } from "../../../agent-memory/store/memory-file-store.js";
import { AgentMemoryExplorerService } from "../../../agent-memory/services/agent-memory-explorer-service.js";
import { TeamMemoryExplorerService } from "../../../agent-memory/services/team-memory-explorer-service.js";
import { AgentOrgMemoryExplorerService } from "../../../agent-memory/services/agent-org-memory-explorer-service.js";
import { getMemoryExplorerSourceService } from "../../../agent-memory/services/memory-explorer-source-service.js";
import type {
  AgentEpisode as DomainAgentEpisode,
  AgentMemoryAttribution as DomainAgentMemoryAttribution,
  MemoryExplorerPage,
} from "../../../agent-memory/domain/models.js";
import {
  AgentEpisodePage,
  AgentMemoryAttribution,
  AgentOrgRunMemoryPage,
  AgentOrgWithMemoryPage,
  AgentTeamRunMemoryPage,
  AgentTeamWithMemoryPage,
  AgentWithMemoryPage,
  AgentWithMemorySelectorInput,
  MemoryExplorerSourceInput,
  MemoryExplorerSourceOption,
  MemoryGroupKind,
  MemoryGroupMember,
} from "./memory-explorer-schema.js";
import { toMemoryRunSubject } from "./memory-run-subject.js";

const toDomainAttribution = (value: AgentMemoryAttribution): DomainAgentMemoryAttribution =>
  value === AgentMemoryAttribution.UNATTRIBUTED ? "UNATTRIBUTED" : "DEFINITION";

/** The source's memory folder and whether it is this node's (local) or an imported one. */
const resolve = async (source?: MemoryExplorerSourceInput | null) => {
  const resolved = await getMemoryExplorerSourceService().resolveSource(source as never);
  return { rootDir: resolved.rootDir, local: !resolved.readOnly };
};

const agentExplorer = (rootDir: string, local: boolean): AgentMemoryExplorerService =>
  new AgentMemoryExplorerService(new MemoryFileStore(rootDir, { warnOnMissingFiles: local }), rootDir, { local });

const toEpisodePage = (page: MemoryExplorerPage<DomainAgentEpisode>): AgentEpisodePage => ({
  ...page,
  entries: page.entries.map((episode) => ({ ...episode, subject: toMemoryRunSubject(episode.subject) })),
});

@Resolver()
export class MemoryExplorerResolver {
  @Query(() => [MemoryExplorerSourceOption])
  async listMemoryExplorerSources(): Promise<MemoryExplorerSourceOption[]> {
    return await getMemoryExplorerSourceService().listSources() as unknown as MemoryExplorerSourceOption[];
  }

  @Query(() => AgentWithMemoryPage)
  async listAgentsWithMemory(
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentWithMemoryPage> {
    const { rootDir, local } = await resolve(source);
    return await agentExplorer(rootDir, local).listAgentsWithMemory(search ?? null, page, pageSize) as unknown as AgentWithMemoryPage;
  }

  /** One agent's episodes, its runs from every place it works (autobyteus-554); or the unattributed runs. */
  @Query(() => AgentEpisodePage)
  async listAgentEpisodes(
    @Arg("selector", () => AgentWithMemorySelectorInput) selector: AgentWithMemorySelectorInput,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentEpisodePage> {
    const { rootDir, local } = await resolve(source);
    return toEpisodePage(await agentExplorer(rootDir, local).listAgentEpisodes(
      { attribution: toDomainAttribution(selector.attribution), agentDefinitionId: selector.agentDefinitionId ?? null },
      search ?? null,
      page,
      pageSize,
    ));
  }

  /** A team's or org's members (autobyteus-554): from its definition on this node, else from its newest stored run. */
  @Query(() => [MemoryGroupMember])
  async listMemoryGroupMembers(
    @Arg("kind", () => MemoryGroupKind) kind: MemoryGroupKind,
    @Arg("definitionId", () => String) definitionId: string,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
  ): Promise<MemoryGroupMember[]> {
    const { rootDir, local } = await resolve(source);
    const members = kind === MemoryGroupKind.ORG
      ? await new AgentOrgMemoryExplorerService(rootDir, { local }).listMembers(definitionId)
      : await new TeamMemoryExplorerService(rootDir, { local }).listMembers(definitionId);
    return members as unknown as MemoryGroupMember[];
  }

  @Query(() => AgentTeamWithMemoryPage)
  async listAgentTeamsWithMemory(
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentTeamWithMemoryPage> {
    const { rootDir, local } = await resolve(source);
    const service = new TeamMemoryExplorerService(rootDir, { local });
    return await service.listAgentTeamsWithMemory(search ?? null, page, pageSize) as unknown as AgentTeamWithMemoryPage;
  }

  @Query(() => AgentTeamRunMemoryPage)
  async listAgentTeamRunsWithMemory(
    @Arg("teamDefinitionId", () => String) teamDefinitionId: string,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentTeamRunMemoryPage> {
    const resolvedSource = await getMemoryExplorerSourceService().resolveSource(source as never);
    const service = new TeamMemoryExplorerService(resolvedSource.rootDir);
    return await service.listAgentTeamRunsWithMemory(teamDefinitionId, search ?? null, page, pageSize) as unknown as AgentTeamRunMemoryPage;
  }

  @Query(() => AgentOrgWithMemoryPage)
  async listAgentOrgsWithMemory(
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentOrgWithMemoryPage> {
    const { rootDir, local } = await resolve(source);
    const service = new AgentOrgMemoryExplorerService(rootDir, { local });
    return await service.listAgentOrgsWithMemory(search ?? null, page, pageSize) as unknown as AgentOrgWithMemoryPage;
  }

  @Query(() => AgentOrgRunMemoryPage)
  async listAgentOrgRunsWithMemory(
    @Arg("orgDefinitionId", () => String) orgDefinitionId: string,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 25 }) pageSize = 25,
  ): Promise<AgentOrgRunMemoryPage> {
    const resolvedSource = await getMemoryExplorerSourceService().resolveSource(source as never);
    const service = new AgentOrgMemoryExplorerService(resolvedSource.rootDir);
    return await service.listAgentOrgRunsWithMemory(orgDefinitionId, search ?? null, page, pageSize) as unknown as AgentOrgRunMemoryPage;
  }
}
