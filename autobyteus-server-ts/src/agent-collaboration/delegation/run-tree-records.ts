import type { CollaborationLaunchConfigurationSourceDto } from "@autobyteus/collaboration-stream-contracts";
import type { LaunchConfigurationSource } from "../domain/launch-configuration-source.js";
import type { RemoteAgentLaunch } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { peerRunIdOf, peerRunLinksOf } from "../execution/remote/peer-run-link.js";
import type { RemoteRunChannel } from "../execution/remote/remote-run-channel.js";
import { describeRemoteTaskExecutions, type RemoteRunSummaryEvent, type RemoteTaskExecutionView } from "../execution/remote/remote-run-observation.js";
import type { DelegatedChild, DelegationIndex } from "./delegation-index.js";
import type { SubtreeRow } from "./collaboration-tree.js";
import type { RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { RunOwnMember, RunOwnTree } from "./run-tree-view.js";

/** A run's launch as its own file has it: what it runs with, and where that came from (`null` when not recorded). */
export type RunLaunchRecord = Readonly<{
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  workspaceRootPath: string | null;
  source: LaunchConfigurationSource | null;
  /** The source is the run's (or member's) own; a member without one takes its team's. */
  ownSource: boolean;
}>;

/**
 * One delegated row's record, as `RunTreeView` reads it (autobyteus-461 SR-084, stage C): a run on this node from its
 * own files (its identity from the `DelegationIndex`, its launch read fresh), or a peer's run from its Task link and its
 * node's latest answer. No view DTO is built for it.
 */
export type ChildRowRecord =
  | Readonly<{ kind: "agent"; agentRunId: string; address: string; launch: RunLaunchRecord }>
  | Readonly<{
      kind: "agent_team"; teamRunId: string; address: string; coordinatorAddress: string; launch: RunLaunchRecord;
      /** Its own members as its file has them (`ownTreeOf`: leaving ones marked); `teamMemberRowsOf` decides the rows. */
      members: readonly (RunOwnMember & Readonly<{ launch: RunLaunchRecord | null }>)[];
    }>
  | Readonly<{
      kind: "peer"; link: RemoteTaskExecutionView;
      /** Its agents' launches, from its node's latest answer; absent until the node answered. */
      launches: readonly RemoteAgentLaunch[] | null;
      summary: Readonly<{ title: string | null; reachable: boolean }> | null;
    }>;

/** The rows' records, bound by the composition; `null` when a record cannot be read. */
export type ChildRowProjection = Readonly<{ rowOf(row: SubtreeRow): Promise<ChildRowRecord | null> }>;

/** A recorded launch source on the wire (the rows carry it as the views did). */
export const launchSourceDtoOf = (value: LaunchConfigurationSource): CollaborationLaunchConfigurationSourceDto => {
  const fallbacks = value.fallbacks.map(({ layer, runtimeKind, llmModelIdentifier, reason, detail }) =>
    ({ layer, runtimeKind, llmModelIdentifier, reason, detail }));
  return (value.origin === "model_router"
    ? { origin: value.origin, fallbacks, choiceReason: value.choiceReason, taskKind: value.taskKind }
    : { origin: value.origin, fallbacks }) as CollaborationLaunchConfigurationSourceDto;
};

type RecordedLaunch = Readonly<{ runtimeKind: string; llmModelIdentifier: string; llmConfig?: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean; workspaceRootPath?: string | null }>;
const launchRecordOf = (launch: RecordedLaunch, source: LaunchConfigurationSource | undefined | null, ownSource: boolean): RunLaunchRecord =>
  Object.freeze({ runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig ?? null,
    autoExecuteTools: launch.autoExecuteTools, workspaceRootPath: launch.workspaceRootPath ?? null, source: source ?? null, ownSource });

const readTeamFile = (memoryDir: string, teamRunId: string) =>
  new TeamRunExecutionTreeStore().read(new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId);

/** A run's own parts as its tree shows them (`RunOwnAgentsReader.ownTreeOf`). */
export type OwnTreeOf = (run: RootExecutionIdentity) => Promise<RunOwnTree | null>;

/**
 * A run on this node: an agent run's identity from the tree's per-run data (read once, SR-056); a team run's members
 * from its own parts (`ownTreeOf`, the same source as its own rows, SR-010 AR-009); its launch details from its own
 * file, read fresh (a Settings save changes them, SR-039); `null` when either is missing.
 */
export const localChildRecord = async (child: DelegatedChild, memoryDir: string, tree: Pick<DelegationIndex, "agentsOf">,
  ownTreeOf: OwnTreeOf): Promise<ChildRowRecord | null> => {
  const childRun = child.run;
  if ("agentRunId" in childRun) {
    const [agent] = await tree.agentsOf({ rootSubjectKind: "agent", rootRunId: childRun.agentRunId });
    if (!agent) return null;
    // The tree gives a delegated agent run the address it was delegated to until its own is stored.
    if (!agent.address) throw new Error(`Agent run '${childRun.agentRunId}' has no address.`);
    const metadata = await new AgentRunMetadataStore(memoryDir).readMetadata(childRun.agentRunId);
    return metadata ? Object.freeze({ kind: "agent", agentRunId: childRun.agentRunId, address: agent.address,
      launch: launchRecordOf(metadata, metadata.launchSource, true) }) : null;
  }
  const own = await ownTreeOf({ rootSubjectKind: "agent_team", rootRunId: childRun.teamRunId });
  if (own?.kind !== "agent_team" || !own.members.length) return null;
  const file = await readTeamFile(memoryDir, childRun.teamRunId);
  if (!file) return null;
  const team = file.rootTeam;
  const nodes = [...team.members, ...team.formerMembers ?? []];
  return Object.freeze({
    kind: "agent_team", teamRunId: childRun.teamRunId, address: child.recipientAddress, coordinatorAddress: team.coordinatorAddress,
    launch: launchRecordOf(team.defaultLaunchConfiguration, team.defaultLaunchSource, true),
    members: Object.freeze(own.members.map((member) => {
      const recorded = nodes.find((node) => node.agentRunId === member.agentRunId);
      return Object.freeze({ ...member,
        launch: recorded ? launchRecordOf(recorded.launchConfiguration, recorded.launchSource ?? team.defaultLaunchSource, Boolean(recorded.launchSource)) : null });
    })),
  });
};

/**
 * The rows' records (SR-061, stage C): a run on this node from its own files, a peer's run from its Task link and its
 * node's latest answer, kept with its status (autobyteus-278; SR-086 G-B2: never asked of its node on each read).
 */
export const createChildRowProjection = (input: Readonly<{
  memoryDir: string;
  tree: Pick<DelegationIndex, "agentsOf" | "peerChildrenOf">;
  /** A team run's own members (`RunOwnAgentsReader.ownTreeOf`). */
  ownTreeOf: OwnTreeOf;
  channel: () => RemoteRunChannel | null;
  /** A held peer run's latest answer from its node (`RunStatusService`); `null` until it answered. */
  peerSummaryOf(runId: string): RemoteRunSummaryEvent | null;
}>): ChildRowProjection => ({ rowOf: async (child) => {
  if (child.nodeId === undefined) return localChildRecord(child, input.memoryDir, input.tree, input.ownTreeOf);
  const runId = "agentRunId" in child.run ? child.run.agentRunId : child.run.teamRunId;
  const links = peerRunLinksOf(child.parent, input.tree).filter((link) => peerRunIdOf(link) === runId);
  const [link] = await describeRemoteTaskExecutions(links, input.channel());
  const summary = input.peerSummaryOf(runId);
  return link ? Object.freeze({ kind: "peer" as const, link, launches: summary?.reachable ? summary.launches : null,
    summary: summary ? Object.freeze({ title: summary.title, reachable: summary.reachable }) : null }) : null;
} });
