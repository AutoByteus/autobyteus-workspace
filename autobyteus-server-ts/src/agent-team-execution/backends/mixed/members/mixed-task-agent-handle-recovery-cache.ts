import type { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";

export type RecoverableTaskAgentHandle = Readonly<{
  rootTeamRunId: string;
  taskId: string;
  taskAgentRunId: string;
  handle: MixedAgentMemberHandle;
}>;

export class MixedTaskAgentHandleRecoveryCache {
  private readonly records = new Map<string, RecoverableTaskAgentHandle>();
  remember(identity: Omit<RecoverableTaskAgentHandle, "handle">, handle: MixedAgentMemberHandle): void {
    const record = Object.freeze({ ...identity, handle });
    this.records.set(this.key(record.rootTeamRunId, record.taskAgentRunId), record);
  }
  get(rootTeamRunId: string, taskAgentRunId: string) {
    return this.records.get(this.key(rootTeamRunId, taskAgentRunId)) ?? null;
  }
  has(rootTeamRunId: string, taskAgentRunId: string) { return Boolean(this.get(rootTeamRunId, taskAgentRunId)); }
  forget(rootTeamRunId: string, taskAgentRunId: string): void {
    this.records.delete(this.key(rootTeamRunId, taskAgentRunId));
  }
  forgetTeam(rootTeamRunId: string): void {
    const normalized = rootTeamRunId.trim();
    for (const [key, record] of this.records) {
      if (record.rootTeamRunId === normalized || key.startsWith(`${normalized}::`)) this.records.delete(key);
    }
  }
  listForTeam(rootTeamRunId: string) {
    return [...this.records.values()].filter((record) => record.rootTeamRunId === rootTeamRunId.trim());
  }
  private key(rootTeamRunId: string, taskAgentRunId: string) {
    return `${rootTeamRunId.trim()}::${taskAgentRunId.trim()}`;
  }
}

const cache = new MixedTaskAgentHandleRecoveryCache();
export const getMixedTaskAgentHandleRecoveryCache = (): MixedTaskAgentHandleRecoveryCache => cache;
