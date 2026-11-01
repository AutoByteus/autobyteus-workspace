import type { TaskExecutionReference } from "../task/task-execution-reference.js";
import type { TaskExecutionStopResult } from "../task/task-execution-resource-port.js";
import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import {
  cloneCollaborationMemberExecutionIdentity,
  cloneRootExecutionIdentity,
  rootExecutionIdentityKey,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../domain/root-execution-identity.js";

export type ActiveRootMessageSender = Readonly<{
  kind: "agent";
  identity: CollaborationMemberExecutionIdentity;
  displayName: string;
}>;

export type ExactAgentMessageInput = Readonly<{
  sender: ActiveRootMessageSender;
  targetAgentRunId: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

export interface ActiveRootMessageBoundary {
  /** Same-root membership, including shut-down delegated children that delivery can wake. */
  hasAgentExecution(agentRunId: string): boolean;
  /** A task execution's own live status (Agent status, or folded Team status); wakes nothing. */
  taskExecutionStatus?(reference: TaskExecutionReference): AgentExecutionStatus;
  /** Stops exactly these closed Task agent runs hosted in this root. */
  releaseTaskExecutions?(agentRuns: readonly TaskExecutionReference[]): Promise<readonly TaskExecutionStopResult[]>;
  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult>;
  /** The coordinator agent run of this root's Team copy with that team run ID; `null` when it hosts none. Reads only. */
  teamCoordinatorOf?(teamRunId: string): string | null;
  /** The agent run is inside one of this root's delegated copies (a task Agent, or a task Team's member). Reads only. */
  isDelegatedRun?(agentRunId: string): boolean;
}

/** Where a live agent run sits in its root: the standalone host, a Team or Org member, or a delegated copy's run. */
export type CollaborationRunPlace = "host" | "member" | "delegated";

export type ActiveRootRegistrationReservation = Readonly<{
  root: RootExecutionIdentity;
  commit(): void;
  release(): void;
}>;

/** Process-owned compound tagged-root lookup. It owns neither lifecycle nor persistence. */
export class ActiveCollaborationRootDirectory {
  private readonly active = new Map<string, Readonly<{
    root: RootExecutionIdentity;
    boundary: ActiveRootMessageBoundary;
  }>>();
  private readonly reserved = new Set<string>();

  reserve(
    rootInput: RootExecutionIdentity,
    boundary: ActiveRootMessageBoundary,
  ): ActiveRootRegistrationReservation {
    const root = cloneRootExecutionIdentity(rootInput);
    const key = rootExecutionIdentityKey(root);
    if (this.active.has(key) || this.reserved.has(key)) {
      throw new Error(`Collaboration root '${root.rootSubjectKind}:${root.rootRunId}' is already active or reserved.`);
    }
    if (!boundary || typeof boundary.deliverExactAgentMessage !== "function" || typeof boundary.hasAgentExecution !== "function") {
      throw new Error("Active root message boundary is required.");
    }
    this.reserved.add(key);
    let state: "reserved" | "committed" | "released" = "reserved";
    return Object.freeze({
      root,
      commit: () => {
        if (state !== "reserved" || !this.reserved.delete(key)) {
          throw new Error(`Collaboration root '${root.rootSubjectKind}:${root.rootRunId}' is not reserved.`);
        }
        this.active.set(key, Object.freeze({ root, boundary }));
        state = "committed";
      },
      release: () => {
        if (state === "released") return;
        if (state === "reserved") this.reserved.delete(key);
        else this.unregister(root, boundary);
        state = "released";
      },
    });
  }

  resolve(root: RootExecutionIdentity): ActiveRootMessageBoundary | null {
    const entry = this.active.get(rootExecutionIdentityKey(root));
    return entry && sameRootExecutionIdentity(entry.root, root) ? entry.boundary : null;
  }

  /**
   * The coordinator agent run of the Team copy with this team run ID in any active root, for
   * `send_message_to` guidance (it reaches agents only); `null` when no active root hosts it.
   */
  findTeamCoordinator(teamRunId: string): string | null {
    for (const { boundary } of this.active.values()) {
      const coordinator = boundary.teamCoordinatorOf?.(teamRunId) ?? null;
      if (coordinator) return coordinator;
    }
    return null;
  }

  /**
   * The active root holding this agent run and its place there (autobyteus-285, restart resume); `null` when no
   * active root holds it (application- or system-owned runs). Reads only. One root holds a run; if several boundaries
   * claim it, that is logged and the host, then a delegated claim, wins.
   */
  placeOf(agentRunIdInput: string): Readonly<{ root: RootExecutionIdentity; place: CollaborationRunPlace }> | null {
    const agentRunId = agentRunIdInput.trim();
    const claims = [...this.active.values()]
      .filter(({ boundary }) => boundary.hasAgentExecution(agentRunId))
      .map(({ root, boundary }) => Object.freeze({
        root: cloneRootExecutionIdentity(root),
        place: root.rootSubjectKind === "agent" && root.rootRunId === agentRunId ? "host" as const
          : boundary.isDelegatedRun?.(agentRunId) ? "delegated" as const : "member" as const,
      }));
    if (claims.length > 1) {
      console.warn(`Agent run '${agentRunId}' is claimed by ${claims.length} active roots: `
        + claims.map((claim) => `${claim.root.rootSubjectKind}:${claim.root.rootRunId}`).join(", "));
    }
    const rank = { host: 0, delegated: 1, member: 2 } as const;
    return [...claims].sort((a, b) => rank[a.place] - rank[b.place])[0] ?? null;
  }

  unregister(root: RootExecutionIdentity, expected: ActiveRootMessageBoundary): boolean {
    const key = rootExecutionIdentityKey(root);
    const current = this.active.get(key);
    if (!current || current.boundary !== expected || !sameRootExecutionIdentity(current.root, root)) return false;
    this.active.delete(key);
    return true;
  }

  clear(): void {
    this.active.clear();
    this.reserved.clear();
  }
}

let processDirectory: ActiveCollaborationRootDirectory | null = null;
export const getActiveCollaborationRootDirectory = (): ActiveCollaborationRootDirectory =>
  processDirectory ??= new ActiveCollaborationRootDirectory();
export const resetActiveCollaborationRootDirectory = (): void => {
  processDirectory?.clear();
  processDirectory = null;
};
