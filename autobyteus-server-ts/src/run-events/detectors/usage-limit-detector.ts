import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentRunPreface } from "../../agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunActivationKind } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { AgentRunPlatformNoticeSource } from "../../agent-execution/domain/agent-run-platform-notices.js";
import { USAGE_LIMIT_ERROR_KIND } from "../../agent-execution/domain/agent-run-error-kind.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { AvailableAgentRuntimesService } from "../../available-agent-runtimes/available-agent-runtimes-service.js";
import type { RunEvent } from "../run-event-types.js";

/** At most this many handled turns are remembered per run (the oldest is forgotten first). */
const HANDLED_TURNS_PER_RUN = 32;

/** What the run listener records of a classified error before the work leaves the run's dispatch queue. */
type ErrorFacts = Readonly<{ agentRunId: string; runtimeKind: string; llmModelIdentifier: string; at: Date }>;

/** A usage limit as the run's backend classified it (R-13, R-16): a terminal `ERROR` or a late `ERROR_CLASSIFIED`. */
const isUsageLimit = (event: AgentRunEvent): boolean => event.payload.error_kind === USAGE_LIMIT_ERROR_KIND
  && ((event.eventType === AgentRunEventType.ERROR && event.payload.error_effect === "terminal")
    || event.eventType === AgentRunEventType.ERROR_CLASSIFIED);

/**
 * Publishes a usage-limit failure (autobyteus-646 DS-001, R-3, R-4, R-13, R-16). A run-lifecycle observer in
 * `AgentRunPlatformNotices`' fan-out (it hands over no notice): on `runPublished` it subscribes to the run's events and
 * watches for what the run's backend classified as a usage limit, a terminal `ERROR` or a late `ERROR_CLASSIFIED` with
 * `error_kind: usage_limit`, of a run held by a collaboration root (`placeOf` not null; application- and system-owned
 * runs, the Model Router's included, are skipped). It is runtime-agnostic: classification is each backend's. The listener
 * runs inside the run's dispatch queue, so it only records the facts; the scope read, the publish and the hub's listeners
 * run detached. It publishes at most once per (run, turn): a turn's several errors and its late classification are one
 * key; one without a turn ID is keyed by the run and the second.
 */
export class UsageLimitDetector implements AgentRunPlatformNoticeSource {
  private readonly subscriptions = new Map<string, () => void>();
  private readonly handled = new Map<string, Set<string>>();

  constructor(private readonly dependencies: Readonly<{
    publish: (event: RunEvent) => Promise<void>;
    roots: Pick<ActiveCollaborationRootDirectory, "placeOf">;
    runtimes: Pick<AvailableAgentRuntimesService, "readRuntime">;
    now?: () => Date;
  }>) {}

  takePreface(): Promise<AgentRunPreface | null> { return Promise.resolve(null); }
  prefaceDelivered(): void { /* hands over no notice */ }
  prefaceReturned(): void { /* hands over no notice */ }

  runPublished(run: AgentRun, _activationKind: AgentRunActivationKind): void {
    this.subscriptions.get(run.runId)?.();
    this.subscriptions.set(run.runId, run.subscribeToEvents((event) => this.observe(run, event)));
  }

  runReleased(run: AgentRun): void {
    this.subscriptions.get(run.runId)?.();
    this.subscriptions.delete(run.runId);
    this.handled.delete(run.runId);
  }

  private observe(run: AgentRun, event: AgentRunEvent): void {
    if (!isUsageLimit(event) || !this.dependencies.roots.placeOf(run.runId)) return;
    const at = this.dependencies.now?.() ?? new Date();
    const turnId = typeof event.payload.turn_id === "string" && event.payload.turn_id.trim() ? event.payload.turn_id.trim() : null;
    if (!this.firstOfTurn(run.runId, turnId ? `turn:${turnId}` : `at:${at.toISOString().slice(0, 19)}`)) return;
    const facts: ErrorFacts = { agentRunId: run.runId, runtimeKind: run.runtimeKind, llmModelIdentifier: run.config.llmModelIdentifier, at };
    void Promise.resolve().then(() => this.decide(facts)).catch((error: unknown) =>
      console.warn(`Usage limit check of agent run '${facts.agentRunId}' failed: ${String(error)}`));
  }

  /** Whether `key` is new for the run (it is then remembered, the oldest forgotten past the bound). */
  private firstOfTurn(agentRunId: string, key: string): boolean {
    const keys = this.handled.get(agentRunId) ?? new Set<string>();
    this.handled.set(agentRunId, keys);
    if (keys.has(key)) return false;
    keys.add(key);
    if (keys.size > HANDLED_TURNS_PER_RUN) keys.delete(keys.values().next().value!);
    return true;
  }

  /**
   * The scope and reset from the one owner, the availability service's model matching (R-13): the failed model plus the
   * runtime's models blocked now, until the failed model's `blocked.until`. When that read fails: the failed model only,
   * no reset (1 h, DEC-006). Then it publishes.
   */
  private async decide(facts: ErrorFacts): Promise<void> {
    const entry = await this.dependencies.runtimes.readRuntime(facts.runtimeKind).catch(() => null);
    const models = entry && Array.isArray(entry.models) ? entry.models : [];
    const own = models.find((model) => model.id === facts.llmModelIdentifier);
    const blockedModels = [...new Set([facts.llmModelIdentifier, ...models.filter((model) => model.blocked).map((model) => model.id)])];
    console.info(`Usage limit reached by agent run '${facts.agentRunId}' on ${facts.runtimeKind} · ${facts.llmModelIdentifier}`);
    await this.dependencies.publish({
      at: facts.at.toISOString(), kind: "usage_limit_reached", agentRunId: facts.agentRunId,
      data: { runtimeKind: facts.runtimeKind, llmModelIdentifier: facts.llmModelIdentifier, blockedModels, resetAt: own?.blocked?.until ?? null },
    });
  }
}
