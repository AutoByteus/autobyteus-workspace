import type { AgentRun } from "./agent-run.js";
import type {
  AgentRunInputPreface,
  AgentRunPreface,
  AgentRunPrefaceContext,
} from "./agent-run-input-preface.js";
import type { AgentRunActivationKind, AgentRunLifecycleObserver } from "./agent-run-lifecycle-observer.js";

/** A source of platform notices for a run's next external input, that also follows run lifetimes. */
export type AgentRunPlatformNoticeSource = AgentRunInputPreface & AgentRunLifecycleObserver;

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * The single platform-notice slot of an `AgentRunManager`, composed of several sources. It asks
 * the sources in order and hands over the first notice it gets, so one dispatch carries at most
 * one notice; another source's notice waits for the next input. It remembers which source handed
 * which notice and settles only that source. Lifecycle calls go to every source in order, each
 * guarded, so a failing source never stops the others.
 */
export class AgentRunPlatformNotices implements AgentRunInputPreface, AgentRunLifecycleObserver {
  private readonly sources: readonly AgentRunPlatformNoticeSource[];
  private readonly owners = new Map<string, AgentRunPlatformNoticeSource>();

  constructor(sources: readonly AgentRunPlatformNoticeSource[]) {
    this.sources = Object.freeze([...sources]);
  }

  async takePreface(run: AgentRun, context: AgentRunPrefaceContext): Promise<AgentRunPreface | null> {
    for (const source of this.sources) {
      let preface: AgentRunPreface | null = null;
      try {
        preface = await source.takePreface(run, context);
      } catch (error) {
        logger.warn(`AGENT_RUN_PLATFORM_NOTICE_TAKE_FAILED:${run.runId}: ${String(error)}`);
        continue;
      }
      if (preface) {
        this.owners.set(preface.id, source);
        return preface;
      }
    }
    return null;
  }

  prefaceDelivered(run: AgentRun, preface: AgentRunPreface, turnId: string | null): void {
    const source = this.release(preface);
    if (!source) return;
    try {
      source.prefaceDelivered(run, preface, turnId);
    } catch (error) {
      logger.warn(`AGENT_RUN_PLATFORM_NOTICE_SETTLE_FAILED:${run.runId}: ${String(error)}`);
    }
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    const source = this.release(preface);
    if (!source) return;
    try {
      source.prefaceReturned(run, preface);
    } catch (error) {
      logger.warn(`AGENT_RUN_PLATFORM_NOTICE_SETTLE_FAILED:${run.runId}: ${String(error)}`);
    }
  }

  runPublished(run: AgentRun, activationKind: AgentRunActivationKind): void {
    for (const source of this.sources) {
      try {
        source.runPublished(run, activationKind);
      } catch (error) {
        logger.warn(`AGENT_RUN_PLATFORM_NOTICE_OBSERVER_FAILED:${run.runId}: ${String(error)}`);
      }
    }
  }

  runReleased(run: AgentRun): void {
    for (const source of this.sources) {
      try {
        source.runReleased(run);
      } catch (error) {
        logger.warn(`AGENT_RUN_PLATFORM_NOTICE_OBSERVER_FAILED:${run.runId}: ${String(error)}`);
      }
    }
  }

  private release(preface: AgentRunPreface): AgentRunPlatformNoticeSource | null {
    const source = this.owners.get(preface.id) ?? null;
    this.owners.delete(preface.id);
    return source;
  }
}
