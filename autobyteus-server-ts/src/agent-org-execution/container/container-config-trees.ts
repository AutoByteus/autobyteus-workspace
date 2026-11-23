import { isDeepStrictEqual } from "node:util";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgContainerStore } from "../../run-history/store/agent-org-container-store.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { ConfiguredAgentExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentOrgRunExecutionTreeFile } from "../domain/agent-org-run-execution-tree.js";
import { composeOrgExecutionTree } from "./org-execution-tree-composition.js";
import { readStoredUnitFiles } from "./stored-org-tree.js";

type WriteOutcome = "committed" | "not_committed" | "finalization_indeterminate";

/**
 * A stopped Org container's settings, as the Org's settings page reads and saves them (org-teams-follow-definition,
 * DEC-004: the Org settings contract is unchanged): read as today's Org tree composed from the units' files; saved by
 * writing each changed launch back to the file that owns it (the container's default, a Team unit's default and members,
 * a direct agent's own run file). `null` from `read`: not a container.
 */
export class ContainerConfigTrees {
  private readonly layout: AgentMemoryLayout;
  private readonly containers = new AgentOrgContainerStore();
  private readonly teams = new TeamRunExecutionTreeStore();
  private readonly agents: AgentRunMetadataStore;

  constructor(private readonly memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.agents = new AgentRunMetadataStore(memoryDir);
  }

  async read(orgRunId: string): Promise<AgentOrgRunExecutionTreeFile | null> {
    const file = await this.containers.readIfContainer(this.layout.getOrgDirPath(orgRunId), orgRunId);
    return file ? composeOrgExecutionTree(file, await readStoredUnitFiles(this.memoryDir, file)) : null;
  }

  /** Writes each launch that differs from the stored one to its own file; `committed` when every write committed. */
  async write(orgRunId: string, expected: AgentOrgRunExecutionTreeFile): Promise<WriteOutcome> {
    const dir = this.layout.getOrgDirPath(orgRunId);
    const file = await this.containers.readIfContainer(dir, orgRunId);
    if (!file) return "not_committed";
    const outcomes: WriteOutcome[] = [];
    if (!isDeepStrictEqual(file.rootOrg.defaultLaunchConfiguration, expected.rootOrg.defaultLaunchConfiguration)) {
      outcomes.push((await this.containers.write(dir, { ...file, rootOrg: { ...file.rootOrg, defaultLaunchConfiguration: expected.rootOrg.defaultLaunchConfiguration } })).outcome);
    }
    for (const node of expected.rootOrg.members) {
      if ("agentRunId" in node) { outcomes.push(...await this.writeAgent(node)); continue; }
      const teamDir = this.layout.getTeamDirPath({ rootTeamRunId: node.teamRunId, ancestorTeamRunIds: [] });
      const tree = await this.teams.read(teamDir, node.teamRunId);
      if (!tree) { outcomes.push("not_committed"); continue; }
      const launches = new Map(node.members.map((member) => [member.agentRunId, member]));
      const next = { ...tree, rootTeam: { ...tree.rootTeam, defaultLaunchConfiguration: node.defaultLaunchConfiguration,
        members: tree.rootTeam.members.map((member) => withLaunch(member, launches.get(member.agentRunId))) } };
      if (!isDeepStrictEqual(next, tree)) outcomes.push((await this.teams.write(teamDir, next)).outcome);
    }
    return outcomes.find((outcome) => outcome !== "committed") ?? "committed";
  }

  private async writeAgent(node: ConfiguredAgentExecutionNode): Promise<WriteOutcome[]> {
    const metadata = await this.agents.readMetadata(node.agentRunId);
    if (!metadata) return ["not_committed"];
    const launch = node.launchConfiguration;
    const { pendingRuntimeSwitch: _pending, launchSource: _source, ...rest } = metadata;
    // The launch, where it came from (a settings edit records `settings`), and a pending runtime switch: as the edit gives them.
    const next = { ...rest, runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier,
      llmConfig: launch.llmConfig as Record<string, unknown> | null, autoExecuteTools: launch.autoExecuteTools,
      workspaceRootPath: launch.workspaceRootPath ?? metadata.workspaceRootPath,
      ...(node.launchSource ? { launchSource: node.launchSource } : {}),
      ...(node.pendingRuntimeSwitch ? { pendingRuntimeSwitch: node.pendingRuntimeSwitch } : {}) };
    if (isDeepStrictEqual(next, metadata)) return [];
    await this.agents.writeMetadata(node.agentRunId, next);
    return ["committed"];
  }
}

/** A Team unit member with the launch, its source and a pending runtime switch as its Org settings now give them (its address unchanged). */
const withLaunch = (member: ConfiguredAgentExecutionNode, edited: ConfiguredAgentExecutionNode | undefined): ConfiguredAgentExecutionNode => {
  if (!edited) return member;
  const { pendingRuntimeSwitch: _pending, launchSource: _source, ...rest } = member;
  return Object.freeze({ ...rest, launchConfiguration: edited.launchConfiguration,
    ...(edited.launchSource ? { launchSource: edited.launchSource } : {}),
    ...(edited.pendingRuntimeSwitch ? { pendingRuntimeSwitch: edited.pendingRuntimeSwitch } : {}) });
};
