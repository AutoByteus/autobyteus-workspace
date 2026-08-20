import path from "node:path";
import { AgentMemoryService } from "../../../agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../agent-memory/store/memory-file-store.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
  RunProjection,
} from "../run-projection-types.js";
import { buildRunProjectionBundleFromEvents } from "../run-projection-utils.js";
import { buildHistoricalReplayEvents } from "../transformers/raw-trace-to-historical-replay-events.js";
import { selectRecentRunProjectionEvents } from "../recent-run-projection-policy.js";
import {
  buildActiveTraceGeneration,
  selectActiveTraceEventPage,
} from "../active-trace-event-page-policy.js";
import { buildEventMonitorActiveTracePageEvents } from "../event-monitor-active-trace-page-projection.js";
import type { EventMonitorActiveTracePage } from "../event-monitor-active-trace-page-types.js";
import { isEventMonitorReplayEvent } from "../historical-replay-event-types.js";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class LocalMemoryRunViewProjectionProvider implements RunProjectionProvider {
  /**
   * Local application-owned replay trace display authority. The runtime kind in
   * the source descriptor is metadata only; normal UI history for Codex, Claude
   * Agent SDK, and AutoByteus is hydrated through this provider.
   */
  private readonly defaultMemoryService: AgentMemoryService;

  constructor(
    memoryDir: string,
    memoryService?: AgentMemoryService,
  ) {
    this.defaultMemoryService =
      memoryService ?? new AgentMemoryService(new MemoryFileStore(memoryDir));
  }

  async buildProjection(input: RunProjectionProviderInput): Promise<RunProjection> {
    const { memoryService, localRunId } = this.resolveMemorySource(input);
    const view = memoryService.getRunMemoryView(localRunId, {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeRawTraces: true,
      includeArchive: false,
    });
    const replayEvents = buildHistoricalReplayEvents(view.rawTraces ?? []);
    const selected = selectRecentRunProjectionEvents(replayEvents);
    const projection = buildRunProjectionBundleFromEvents(
      input.source.runId,
      selected.eventMonitorEvents,
      selected.activityEvents,
    );
    projection.hasEarlierActiveTraceEvents = replayEvents.filter(isEventMonitorReplayEvent).length > 100;
    return projection;
  }

  async buildActiveTracePage(input: RunProjectionProviderInput & {
    beforeCursor?: string | null;
    subjectFingerprint: string;
  }): Promise<EventMonitorActiveTracePage> {
    const { memoryService, localRunId } = this.resolveMemorySource(input);
    const snapshot = memoryService.getActiveRawTraceSnapshot(localRunId);
    const replayEvents = buildHistoricalReplayEvents(snapshot.rawTraces).filter(isEventMonitorReplayEvent);
    const activeGeneration = buildActiveTraceGeneration({
      device: snapshot.device,
      inode: snapshot.inode,
      manifestGeneration: snapshot.manifestGeneration,
      earliestEventId: replayEvents[0]?.eventId ?? null,
    });
    const selection = selectActiveTraceEventPage({
      events: replayEvents,
      beforeCursor: input.beforeCursor,
      subjectFingerprint: input.subjectFingerprint,
      activeGeneration,
    });
    return {
      events: buildEventMonitorActiveTracePageEvents(selection.events),
      beforeCursor: selection.beforeCursor,
      hasEarlier: selection.hasEarlier,
      loadedEarlierCount: selection.loadedEarlierCount,
      activeGeneration,
      cursorStatus: selection.cursorStatus,
    };
  }

  private resolveMemorySource(input: RunProjectionProviderInput): {
    localRunId: string;
    memoryService: AgentMemoryService;
  } {
    const explicitMemoryDir = asString(input.source.memoryDir);
    const localRunId = explicitMemoryDir ? path.basename(explicitMemoryDir) : input.source.runId;
    const memoryService = explicitMemoryDir
      ? new AgentMemoryService(
          new MemoryFileStore(path.dirname(explicitMemoryDir), { runRootSubdir: "" }),
        )
      : this.defaultMemoryService;
    return { localRunId, memoryService };
  }
}
