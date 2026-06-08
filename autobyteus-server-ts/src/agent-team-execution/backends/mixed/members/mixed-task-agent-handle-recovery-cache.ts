import type { TaskAgentInstanceIdentity } from "../../../domain/task-agent-instance.js";
import { cloneTaskAgentInstanceIdentity } from "../../../domain/task-agent-instance.js";
import type { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";

export type RecoverableTaskAgentHandle = {
  identity: TaskAgentInstanceIdentity;
  handle: MixedAgentMemberHandle;
};

export class MixedTaskAgentHandleRecoveryCache {
  private readonly records = new Map<string, RecoverableTaskAgentHandle>();

  remember(identity: TaskAgentInstanceIdentity, handle: MixedAgentMemberHandle): void {
    this.records.set(this.key(identity.teamRunId, identity.taskAgentRunId), {
      identity: cloneTaskAgentInstanceIdentity(identity),
      handle,
    });
  }

  get(teamRunId: string, taskAgentRunId: string): RecoverableTaskAgentHandle | null {
    return this.records.get(this.key(teamRunId, taskAgentRunId)) ?? null;
  }

  has(teamRunId: string, taskAgentRunId: string): boolean {
    return this.get(teamRunId, taskAgentRunId) !== null;
  }

  forget(teamRunId: string, taskAgentRunId: string): void {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) {
      return;
    }
    this.records.delete(this.key(teamRunId, normalizedRunId));
  }

  forgetTeam(teamRunId: string): void {
    const normalizedTeamRunId = teamRunId.trim();
    if (!normalizedTeamRunId) {
      return;
    }
    for (const [key, record] of this.records.entries()) {
      if (record.identity.teamRunId === normalizedTeamRunId || key.startsWith(`${normalizedTeamRunId}::`)) {
        this.records.delete(key);
      }
    }
  }

  listForTeam(teamRunId: string): RecoverableTaskAgentHandle[] {
    const normalizedTeamRunId = teamRunId.trim();
    return Array.from(this.records.values()).filter(
      (record) => record.identity.teamRunId === normalizedTeamRunId,
    );
  }

  private key(teamRunId: string, taskAgentRunId: string): string {
    return `${teamRunId.trim()}::${taskAgentRunId.trim()}`;
  }
}

const mixedTaskAgentHandleRecoveryCache = new MixedTaskAgentHandleRecoveryCache();

export const getMixedTaskAgentHandleRecoveryCache = (): MixedTaskAgentHandleRecoveryCache =>
  mixedTaskAgentHandleRecoveryCache;
