import type { AgentPackageService } from "../../agent-packages/services/agent-package-service.js";
import type { SkillSourceService } from "../../skills/services/skill-source-service.js";
import type { AgentRuntimeStatusService } from "../../runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type { AgentRuntimeKind } from "../../runtime-management/agent-runtimes/agent-runtime-types.js";
import type { GitHubRateLimitGate } from "../../integrations/github/github-rate-limit-gate.js";
import { GITHUB_UPDATE_NOTIFICATION_KINDS, type UpdateNotificationKind } from "../domain/update-notification.js";
import type { OutcomeReport } from "./update-notification-records.js";
import type { AutomationCandidate, UpdateNotificationService } from "./update-notification-service.js";
import type { UpdateAutomationSettingsService } from "./update-automation-settings-service.js";
import type { UpdateChecksCapabilityService } from "./update-checks-capability-service.js";

const KIND_ORDER: readonly UpdateNotificationKind[] = ["AGENT_PACKAGE", "SKILL_SOURCE", "AGENT_RUNTIME"];
const MINUTE_MS = 60_000;
/** A kind's spreading delay is at most a fifth of its interval and never more than this. */
const MAX_JITTER_MS = 5 * MINUTE_MS;

export type UpdatePassDependencies = Readonly<{
  packages: Pick<AgentPackageService, "listGitHubSourceUpdateStates" | "checkAgentPackageUpdates" | "updateAgentPackage">;
  skillSources: Pick<SkillSourceService, "listGitHubSourceUpdateStates" | "checkGitHubSkillSourceUpdates" | "updateGitHubSkillSource">;
  /** Null where this node does not check agent runtimes (not the desktop's embedded node, AR-005). */
  runtimes: Pick<AgentRuntimeStatusService, "listUpdateStates" | "checkInBackground" | "runUpdate"> | null;
  notifications: Pick<UpdateNotificationService, "listAutomationCandidates" | "recordOutcome" | "reconcile">;
  settings: Pick<UpdateAutomationSettingsService, "intervalMinutes" | "isAutomatic">;
  checks: Pick<UpdateChecksCapabilityService, "isEnabled">;
  gate: Pick<GitHubRateLimitGate, "isBlocked">;
  now?: () => Date;
  /** In [0, 1); chooses each kind's spreading delay once per process (REQ-003). */
  random?: () => number;
}>;

type CheckState = Readonly<{ sourceId: string; lastCheckedAt: string | null }>;

/** What one automatic update did, before it is recorded. `skipped`: refused for a reason that records nothing. */
type AutomaticResult =
  | Readonly<{ result: "updated" }>
  | Readonly<{ result: "failed" | "waiting"; reason: string }>
  | Readonly<{ result: "skipped" }>;

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * One pass of the node's background update work (DS-001, DS-002), the one owner of its sequence.
 * First the checks: for each kind (packages, skill sources, runtimes), the sources whose last check
 * of any kind is older than the kind's interval plus this process's spreading delay, one at a time
 * through the owner's own check, oldest first. Then, for each kind whose automatic switch is on,
 * the waiting updates, one at a time through the owner's own update method; each result is
 * recorded as the record's outcome. Before every source and every update, the pass re-reads
 * whether it was closed, whether Update checks is on and, for GitHub kinds, GitHub's `web` gate.
 */
export class UpdatePass {
  private readonly jitterFraction: Readonly<Record<UpdateNotificationKind, number>>;
  private closed = false;

  constructor(private readonly deps: UpdatePassDependencies) {
    const random = deps.random ?? Math.random;
    this.jitterFraction = { AGENT_PACKAGE: random(), SKILL_SOURCE: random(), AGENT_RUNTIME: random() };
  }

  /** No further source or update starts; one in flight finishes. */
  close(): void {
    this.closed = true;
  }

  async run(): Promise<void> {
    if (!this.mayContinue("AGENT_PACKAGE", false)) return;
    let worked = false;
    for (const kind of this.kinds()) worked = (await this.checkDueSources(kind)) || worked;
    for (const kind of this.kinds()) worked = (await this.applyAutomaticUpdates(kind)) || worked;
    if (worked) await this.deps.notifications.reconcile().catch((error) => console.warn("UPDATE_PASS_RECONCILE_FAILED", error));
  }

  private kinds(): UpdateNotificationKind[] {
    return KIND_ORDER.filter((kind) => kind !== "AGENT_RUNTIME" || this.deps.runtimes !== null);
  }

  /** Closed, Update checks off, or (GitHub kinds) GitHub asked this node to wait: the kind's step stops. */
  private mayContinue(kind: UpdateNotificationKind, gated = GITHUB_UPDATE_NOTIFICATION_KINDS.has(kind)): boolean {
    if (this.closed || !this.deps.checks.isEnabled()) return false;
    return !gated || !this.deps.gate.isBlocked("web");
  }

  private async checkDueSources(kind: UpdateNotificationKind): Promise<boolean> {
    let checked = false;
    try {
      for (const sourceId of await this.dueSourceIds(kind)) {
        if (!this.mayContinue(kind)) break;
        try {
          await this.check(kind, sourceId);
        } catch (error) {
          console.warn(`UPDATE_CHECK_FAILED:${kind}:${sourceId}`, error);
        }
        checked = true;
      }
    } catch (error) {
      console.warn(`UPDATE_PASS_CHECKS_FAILED:${kind}`, error);
    }
    return checked;
  }

  private async applyAutomaticUpdates(kind: UpdateNotificationKind): Promise<boolean> {
    if (!this.mayContinue(kind) || !this.deps.settings.isAutomatic(kind)) return false;
    let worked = false;
    try {
      const failedRetryMs = this.deps.settings.intervalMinutes(kind) * MINUTE_MS;
      for (const candidate of await this.deps.notifications.listAutomationCandidates(kind, failedRetryMs)) {
        if (!this.mayContinue(kind) || !this.deps.settings.isAutomatic(kind)) break;
        const report = this.toReport(candidate, await this.update(kind, candidate.sourceId));
        if (report) await this.deps.notifications.recordOutcome(kind, candidate.sourceId, report);
        worked = true;
      }
    } catch (error) {
      console.warn(`UPDATE_PASS_AUTOMATIC_UPDATES_FAILED:${kind}`, error);
    }
    return worked;
  }

  private async dueSourceIds(kind: UpdateNotificationKind): Promise<string[]> {
    const now = this.now().getTime();
    const intervalMs = this.deps.settings.intervalMinutes(kind) * MINUTE_MS;
    const delayMs = this.jitterFraction[kind] * Math.min(intervalMs / 5, MAX_JITTER_MS);
    const checkedTime = (state: CheckState): number => {
      const time = state.lastCheckedAt === null ? Number.NaN : Date.parse(state.lastCheckedAt);
      return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
    };
    return (await this.checkStates(kind))
      .filter((state) => now >= checkedTime(state) + intervalMs + delayMs)
      .sort((left, right) => checkedTime(left) - checkedTime(right))
      .map((state) => state.sourceId);
  }

  private async checkStates(kind: UpdateNotificationKind): Promise<CheckState[]> {
    switch (kind) {
      case "AGENT_PACKAGE": return this.deps.packages.listGitHubSourceUpdateStates();
      case "SKILL_SOURCE": return this.deps.skillSources.listGitHubSourceUpdateStates();
      case "AGENT_RUNTIME": return (this.deps.runtimes?.listUpdateStates() ?? []).map((state) => ({
        sourceId: state.runtimeKind, lastCheckedAt: state.lastCheckedAt?.toISOString() ?? null,
      }));
    }
  }

  private async check(kind: UpdateNotificationKind, sourceId: string): Promise<void> {
    switch (kind) {
      case "AGENT_PACKAGE": await this.deps.packages.checkAgentPackageUpdates([sourceId]); return;
      case "SKILL_SOURCE": await this.deps.skillSources.checkGitHubSkillSourceUpdates([sourceId]); return;
      case "AGENT_RUNTIME": await this.deps.runtimes?.checkInBackground(sourceId as AgentRuntimeKind); return;
    }
  }

  /** The owner's own update method, the same one a manual Update calls. */
  private async update(kind: UpdateNotificationKind, sourceId: string): Promise<AutomaticResult> {
    try {
      switch (kind) {
        case "AGENT_PACKAGE": await this.deps.packages.updateAgentPackage(sourceId); return { result: "updated" };
        case "SKILL_SOURCE": await this.deps.skillSources.updateGitHubSkillSource(sourceId); return { result: "updated" };
        case "AGENT_RUNTIME": {
          const outcome = await this.deps.runtimes!.runUpdate(sourceId as AgentRuntimeKind);
          if (outcome.result === "updated") return { result: "updated" };
          if (outcome.result === "failed") return { result: "failed", reason: outcome.error };
          if (outcome.reason === "AGENTS_RUNNING") {
            return { result: "waiting", reason: `Update unavailable while ${outcome.runningAgents} agent(s) are running.` };
          }
          return { result: "skipped" }; // Busy (a login or a manual update runs) or not installed: nothing this tick.
        }
      }
    } catch (error) {
      return { result: "failed", reason: errorMessage(error) };
    }
  }

  private toReport(candidate: AutomationCandidate, outcome: AutomaticResult): OutcomeReport | null {
    switch (outcome.result) {
      case "updated": return { outcome: "AUTO_UPDATED", candidateFrom: candidate.fromRevision };
      case "failed": return { outcome: "AUTO_FAILED", candidateLatest: candidate.latestRevision, reason: outcome.reason };
      case "waiting": return { outcome: "AUTO_WAITING", candidateLatest: candidate.latestRevision, reason: outcome.reason };
      case "skipped": return null;
    }
  }

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }
}
