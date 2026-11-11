import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { cloneRootExecutionIdentity, rootExecutionIdentityKey, sameRootExecutionIdentity, type CollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../domain/root-execution-identity.js";

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
  /** Whether the agent is one of this run's own agents. */
  hasAgentExecution(agentRunId: string): boolean;
  /** DS-2: this root as the sender of a message to another run (its own log only). */
  prepareSendToRun?(input: import("../communication/root-communication-engine.js").RunSendInput): import("../communication/root-communication-engine.js").PreparedRunSend;
  commitSentToRun?(message: import("../communication/collaboration-communication-message.js").CollaborationCommunicationMessage): Promise<void>;
  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult>;
  /** The coordinator agent run of this team run, or of a peer team run it delegated to; `null` otherwise. Reads only. */
  teamCoordinatorOf?(teamRunId: string): string | null;
}

/** Where a live agent run sits in its own root: a standalone run's agent, or a Team or Org member (autobyteus-461 DS-9). */
export type CollaborationRunPlace = "host" | "member";

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
   * The coordinator agent run of the team run with this ID, as an active root knows it (its own, or a peer team run it
   * delegated to), for `send_message_to` guidance (it reaches agents only); `null` when no active root knows it.
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
   * claim it, that is logged and the host claim wins.
   */
  placeOf(agentRunIdInput: string): Readonly<{ root: RootExecutionIdentity; place: CollaborationRunPlace }> | null {
    const agentRunId = agentRunIdInput.trim();
    const claims = [...this.active.values()]
      .filter(({ boundary }) => boundary.hasAgentExecution(agentRunId))
      .map(({ root, boundary }) => Object.freeze({
        root: cloneRootExecutionIdentity(root),
        place: root.rootSubjectKind === "agent" && root.rootRunId === agentRunId ? "host" as const : "member" as const,
      }));
    if (claims.length > 1) {
      console.warn(`Agent run '${agentRunId}' is claimed by ${claims.length} active roots: `
        + claims.map((claim) => `${claim.root.rootSubjectKind}:${claim.root.rootRunId}`).join(", "));
    }
    const rank = { host: 0, member: 1 } as const;
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
