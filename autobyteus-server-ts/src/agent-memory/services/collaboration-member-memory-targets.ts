import path from "node:path";
import type {
  LocatedExecutionGroup,
  LocatedExecutionKind,
} from "../../agent-collaboration/execution/domain/located-execution-structure.js";
import type {
  CollaborationMemberExecutionKind,
  CollaborationMemberMemoryTargetSummary,
  CollaborationMemoryGroup,
  CollaborationMemoryGroupKind,
  MemoryAvailabilityBuildResult,
} from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import { MemoryRunSummaryBuilder, hasMemoryAvailability } from "./memory-run-summary-builder.js";

/** One agent execution inside a team or org root, identified by its own run and placed by its group path. */
export type CollaborationMemberMemoryLocation = Readonly<{
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  agentDefinitionId: string | null;
  executionKind: CollaborationMemberExecutionKind;
  /** Task agents only. */
  startedAt: string | null;
  groupPath: readonly CollaborationMemoryGroup[];
  memoryDir: string;
}>;

export type CollaborationMemberMemoryTarget = Omit<CollaborationMemberMemoryLocation, "memoryDir"> & Readonly<{
  memory: MemoryAvailabilityBuildResult;
}>;

/** The structural fields a family location service exposes for one located agent execution. */
type LocatedAgentExecution = Readonly<{
  memberAddress: string;
  agentRunId: string;
  configuredPlacement: Readonly<{ agentDefinitionId: string }> | null;
  executionKind: LocatedExecutionKind;
  startedAt: string | null;
  groupPath: readonly LocatedExecutionGroup[];
  memoryDir: string;
}>;

const MEMBER_EXECUTION_KIND: Record<LocatedExecutionKind, CollaborationMemberExecutionKind> = {
  configured: "CONFIGURED",
  task: "TASK_AGENT",
  task_team_member: "TASK_TEAM_MEMBER",
};

const GROUP_KIND: Record<LocatedExecutionKind, CollaborationMemoryGroupKind> = {
  configured: "CONFIGURED_TEAM",
  task: "TASK_TEAM",
  task_team_member: "TASK_TEAM",
};

/** Projects one located execution; `toDisplayName` is the family's label rule (team basename, org address path). */
export const toCollaborationMemberMemoryLocation = (
  located: LocatedAgentExecution,
  toDisplayName: (address: string) => string,
): CollaborationMemberMemoryLocation => ({
  memberAddress: located.memberAddress,
  displayName: toDisplayName(located.memberAddress),
  agentRunId: located.agentRunId,
  agentDefinitionId: located.configuredPlacement?.agentDefinitionId ?? null,
  executionKind: MEMBER_EXECUTION_KIND[located.executionKind],
  startedAt: located.startedAt,
  groupPath: located.groupPath.map((group) => ({
    teamRunId: group.teamRunId,
    address: group.address,
    displayName: toDisplayName(group.address),
    kind: GROUP_KIND[group.executionKind],
    startedAt: group.startedAt,
  })),
  memoryDir: located.memoryDir,
});

/** Keeps the members that have stored memory, in structural order (see `orderByStructure`). */
export const buildCollaborationMemberMemoryTargets = (
  members: readonly CollaborationMemberMemoryLocation[],
): CollaborationMemberMemoryTarget[] => {
  const targets: CollaborationMemberMemoryTarget[] = [];
  for (const { memoryDir, ...member } of members) {
    const memoryStore = new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" });
    const memory = new MemoryRunSummaryBuilder(memoryStore).build(path.basename(memoryDir));
    if (hasMemoryAvailability(memory.availability)) targets.push({ ...member, memory });
  }
  return orderByStructure(targets);
};

type StructureNode = {
  group: CollaborationMemoryGroup | null;
  agents: CollaborationMemberMemoryTarget[];
  children: Map<string, StructureNode>;
};

const AGENT_KIND_RANK: Record<CollaborationMemberExecutionKind, number> = {
  CONFIGURED: 0,
  TASK_AGENT: 1,
  TASK_TEAM_MEMBER: 2,
};

const compareAgents = (a: CollaborationMemberMemoryTarget, b: CollaborationMemberMemoryTarget): number =>
  a.displayName.localeCompare(b.displayName) ||
  AGENT_KIND_RANK[a.executionKind] - AGENT_KIND_RANK[b.executionKind] ||
  (a.startedAt ?? "").localeCompare(b.startedAt ?? "");

/**
 * Configured teams keep tree order; task teams follow, nested teams without a start time first (they precede
 * delegated tasks in tree order), then delegated task teams by start time. `Array.sort` is stable.
 */
const compareChildGroups = (a: StructureNode, b: StructureNode): number => {
  const rank = (node: StructureNode) => node.group?.kind === "CONFIGURED_TEAM" ? 0 : node.group?.startedAt ? 2 : 1;
  const rankCompare = rank(a) - rank(b);
  if (rankCompare !== 0 || rank(a) !== 2) return rankCompare;
  return a.group!.startedAt!.localeCompare(b.group!.startedAt!);
};

/**
 * Depth-first order with contiguous groups (REC-005): at each level its agents (by display name, then
 * configured before task agents by start time before task-team members), then its child groups. Groups keep
 * first-appearance (tree) order before sorting. A root without groups keeps the plain display-name order.
 */
const orderByStructure = (targets: readonly CollaborationMemberMemoryTarget[]): CollaborationMemberMemoryTarget[] => {
  const root: StructureNode = { group: null, agents: [], children: new Map() };
  for (const target of targets) {
    let node = root;
    for (const group of target.groupPath) {
      let child = node.children.get(group.teamRunId);
      if (!child) {
        child = { group, agents: [], children: new Map() };
        node.children.set(group.teamRunId, child);
      }
      node = child;
    }
    node.agents.push(target);
  }
  const ordered: CollaborationMemberMemoryTarget[] = [];
  const visit = (node: StructureNode): void => {
    ordered.push(...[...node.agents].sort(compareAgents));
    [...node.children.values()].sort(compareChildGroups).forEach(visit);
  };
  visit(root);
  return ordered;
};

export const toCollaborationMemberMemoryTargetSummary = (
  target: CollaborationMemberMemoryTarget,
): CollaborationMemberMemoryTargetSummary => ({
  memberAddress: target.memberAddress,
  displayName: target.displayName,
  agentRunId: target.agentRunId,
  agentDefinitionId: target.agentDefinitionId,
  executionKind: target.executionKind,
  startedAt: target.startedAt,
  groupPath: target.groupPath,
  lastUpdatedAt: target.memory.availability.latestMemoryAt,
  memory: target.memory.availability,
});
