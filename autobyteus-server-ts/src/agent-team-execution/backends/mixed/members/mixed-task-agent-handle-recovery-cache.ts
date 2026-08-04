import { cloneTaskAgentInstanceIdentity, type TaskAgentInstanceIdentity } from "../../../domain/task-agent-instance.js";
import type { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";

export type RecoverableTaskAgentHandle = { identity: TaskAgentInstanceIdentity; handle: MixedAgentMemberHandle };

export class MixedTaskAgentHandleRecoveryCache {
  private readonly records = new Map<string, RecoverableTaskAgentHandle>();
  remember(identity: TaskAgentInstanceIdentity, handle: MixedAgentMemberHandle): void {
    this.records.set(this.key(identity.owningTeamRunId, identity.taskAgentRunId), { identity: cloneTaskAgentInstanceIdentity(identity), handle });
  }
  get(teamRunId: string, taskAgentRunId: string) { return this.records.get(this.key(teamRunId, taskAgentRunId)) ?? null; }
  has(teamRunId: string, taskAgentRunId: string) { return Boolean(this.get(teamRunId, taskAgentRunId)); }
  forget(teamRunId: string, taskAgentRunId: string): void { this.records.delete(this.key(teamRunId, taskAgentRunId)); }
  forgetTeam(teamRunId: string): void {
    const normalized = teamRunId.trim();
    for (const [key, record] of this.records) if (record.identity.owningTeamRunId === normalized || key.startsWith(`${normalized}::`)) this.records.delete(key);
  }
  listForTeam(teamRunId: string) { return [...this.records.values()].filter((record) => record.identity.owningTeamRunId === teamRunId.trim()); }
  private key(teamRunId: string, taskAgentRunId: string) { return `${teamRunId.trim()}::${taskAgentRunId.trim()}`; }
}

const cache = new MixedTaskAgentHandleRecoveryCache();
export const getMixedTaskAgentHandleRecoveryCache = () => cache;
