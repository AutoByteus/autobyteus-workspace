import fs from "node:fs";
import type { AgentTeamAddress } from "../../domain/agent-team-address.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../../run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../run-history/store/agent-run-metadata-types.js";
import type { CollaboratorExecutionSource } from "../../collaborators/collaborator-source-projector.js";
import type { TeamRunExecutionTreeLocationService, LocatedTeamAgentExecution } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import type { DelegationTree } from "../../delegation/delegation-tree.js";
import { createAgentRootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../task/task-execution-reference.js";

/**
 * An agent of a run a standalone run delegated to, as that run's view reaches it (DS-8: a child's conversation, files
 * and file changes are read from its own run). The run's own agent is a standalone run itself and is not located here.
 */
export type LocatedStandaloneRootAgentExecution = Readonly<{
  rootSubjectKind: "agent";
  rootRunId: string;
  containingTeamRunId: string | null;
  ancestorTeamRunIds: readonly string[];
  agentRunId: string;
  memberAddress: AgentTeamAddress;
  platformAgentRunId: string | null;
  configuredPlacement: null;
  executionKind: "task" | "task_team_member";
  startedAt: string | null;
  groupPath: readonly [];
  memoryDir: string;
  /** Its definition and launch, from its own run. */
  source: CollaboratorExecutionSource | null;
  isActive: boolean;
}>;

type Lookup = { rootRunId?: string | null; agentRunId?: string | null; memberAddress?: string | null };

const sourceOfMetadata = (metadata: AgentRunMetadata): CollaboratorExecutionSource => Object.freeze({
  agentDefinitionId: metadata.agentDefinitionId,
  launchConfiguration: Object.freeze({ runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier,
    llmConfig: metadata.llmConfig, autoExecuteTools: metadata.autoExecuteTools, workspaceRootPath: metadata.workspaceRootPath }),
});

/**
 * The `agent` family of collaboration locations (autobyteus-461): the agents of the runs a standalone run delegated to,
 * one hop, open or closed (the Task entries), each in its own run (an agent run's folder; a team run's member). A
 * lookup must name the standalone run (`rootRunId`); without it nothing is found here (a delegated run is found as the
 * run it is).
 */
export class DelegatedChildLocations {
  private readonly layout: AgentMemoryLayout;
  private readonly metadata: AgentRunMetadataStore;

  constructor(private readonly input: Readonly<{
    memoryDir: string;
    teams: Pick<TeamRunExecutionTreeLocationService, "findAgent" | "findAgentSync" | "listAgents">;
    /** The relationships between runs, from the Task entries (SR-047). */
    tree: Pick<DelegationTree, "childrenOf">;
  }>) {
    this.layout = new AgentMemoryLayout(input.memoryDir);
    this.metadata = new AgentRunMetadataStore(input.memoryDir);
  }

  async findAgent(lookup: Lookup): Promise<LocatedStandaloneRootAgentExecution | null> {
    for (const child of this.childrenOf(lookup)) {
      if ("agentRunId" in child) {
        if (lookup.agentRunId?.trim() && lookup.agentRunId.trim() !== child.agentRunId) continue;
        const metadata = await this.metadata.readMetadata(child.agentRunId);
        const located = metadata ? this.ofAgentRun(lookup.rootRunId!.trim(), metadata) : null;
        if (located && this.matchesAddress(lookup, located)) return located;
        continue;
      }
      const member = await this.input.teams.findAgent({ rootTeamRunId: child.teamRunId, agentRunId: lookup.agentRunId ?? null });
      if (member && this.matchesAddress(lookup, member)) return this.ofTeamMember(lookup.rootRunId!.trim(), member);
    }
    return null;
  }

  findAgentSync(lookup: Lookup): LocatedStandaloneRootAgentExecution | null {
    for (const child of this.childrenOf(lookup)) {
      if ("agentRunId" in child) {
        if (lookup.agentRunId?.trim() && lookup.agentRunId.trim() !== child.agentRunId) continue;
        const metadata = this.readMetadataSync(child.agentRunId);
        const located = metadata ? this.ofAgentRun(lookup.rootRunId!.trim(), metadata) : null;
        if (located && this.matchesAddress(lookup, located)) return located;
        continue;
      }
      const member = this.input.teams.findAgentSync({ rootTeamRunId: child.teamRunId, agentRunId: lookup.agentRunId ?? null });
      if (member && this.matchesAddress(lookup, member)) return this.ofTeamMember(lookup.rootRunId!.trim(), member);
    }
    return null;
  }

  /** Nothing is listed across runs: every delegated run is listed as the run it is. */
  async listAgents(): Promise<LocatedStandaloneRootAgentExecution[]> { return []; }

  private childrenOf(lookup: Lookup): readonly TaskExecutionReference[] {
    const rootRunId = lookup.rootRunId?.trim();
    return rootRunId ? this.input.tree.childrenOf(createAgentRootExecutionIdentity(rootRunId)) : [];
  }

  private matchesAddress(lookup: Lookup, located: Readonly<{ memberAddress: string }>): boolean {
    return !lookup.memberAddress?.trim() || lookup.memberAddress.trim() === located.memberAddress;
  }

  private ofAgentRun(rootRunId: string, metadata: AgentRunMetadata): LocatedStandaloneRootAgentExecution | null {
    if (!metadata.address) return null;
    return Object.freeze({ rootSubjectKind: "agent", rootRunId, containingTeamRunId: null, ancestorTeamRunIds: Object.freeze([]),
      agentRunId: metadata.runId, memberAddress: metadata.address, platformAgentRunId: metadata.platformAgentRunId ?? null,
      configuredPlacement: null, executionKind: "task", startedAt: metadata.startedAt ?? null, groupPath: [] as const,
      memoryDir: this.layout.getStandaloneRunDirPath(metadata.runId), source: sourceOfMetadata(metadata), isActive: false });
  }

  private ofTeamMember(rootRunId: string, member: LocatedTeamAgentExecution): LocatedStandaloneRootAgentExecution {
    const placement = member.tree.rootTeam.members.find((candidate) => candidate.agentRunId === member.agentRunId);
    return Object.freeze({ rootSubjectKind: "agent", rootRunId, containingTeamRunId: member.containingTeamRunId, ancestorTeamRunIds: Object.freeze([]),
      agentRunId: member.agentRunId, memberAddress: member.memberAddress, platformAgentRunId: placement?.platformAgentRunId ?? null,
      configuredPlacement: null, executionKind: "task_team_member", startedAt: null, groupPath: [] as const, memoryDir: member.memoryDir,
      source: placement ? Object.freeze({ agentDefinitionId: placement.agentDefinitionId, launchConfiguration: placement.launchConfiguration }) : null,
      isActive: member.isActive });
  }

  private readMetadataSync(runId: string): AgentRunMetadata | null {
    try {
      const raw = JSON.parse(fs.readFileSync(`${this.layout.getStandaloneRunDirPath(runId)}/run_metadata.json`, "utf8")) as AgentRunMetadata;
      return raw && typeof raw === "object" ? raw : null;
    } catch {
      return null;
    }
  }
}
