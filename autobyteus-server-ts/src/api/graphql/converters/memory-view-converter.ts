import type {
  AgentMemoryView as DomainAgentMemoryView,
  MemoryMessage as DomainMemoryMessage,
  MemoryTraceEvent as DomainMemoryTraceEvent,
  RawTraceFileSummary as DomainRawTraceFileSummary,
} from "../../../agent-memory/domain/models.js";
import type {
  AgentMemoryView as GraphqlAgentMemoryView,
  MemoryMessage as GraphqlMemoryMessage,
  MemoryTraceEvent as GraphqlMemoryTraceEvent,
  RawTraceFileSummary as GraphqlRawTraceFileSummary,
} from "../types/memory-view.js";

export class MemoryViewConverter {
  private static toGraphqlMessage(domainMessage: DomainMemoryMessage): GraphqlMemoryMessage {
    return {
      role: domainMessage.role,
      content: domainMessage.content ?? null,
      reasoning: domainMessage.reasoning ?? null,
      toolPayload: domainMessage.toolPayload ?? null,
      ts: domainMessage.ts ?? null,
    };
  }

  private static toGraphqlTrace(domainTrace: DomainMemoryTraceEvent): GraphqlMemoryTraceEvent {
    return {
      scope: domainTrace.scope,
      id: domainTrace.id ?? null,
      traceType: domainTrace.traceType,
      sourceEvent: domainTrace.sourceEvent ?? null,
      content: domainTrace.content ?? null,
      toolName: domainTrace.toolName ?? null,
      toolCallId: domainTrace.toolCallId ?? null,
      toolArgs: domainTrace.toolArgs ?? null,
      toolResult: domainTrace.toolResult ?? null,
      toolError: domainTrace.toolError ?? null,
      media: domainTrace.media ?? null,
      turnId: domainTrace.turnId,
      seq: domainTrace.seq,
      ts: domainTrace.ts,
    };
  }

  private static toGraphqlRawTraceFile(
    domainFile: DomainRawTraceFileSummary,
  ): GraphqlRawTraceFileSummary {
    return {
      fileName: domainFile.fileName,
      kind: domainFile.kind,
      recordCount: domainFile.recordCount,
      segmentIndex: domainFile.segmentIndex ?? null,
      firstTimestamp: domainFile.firstTimestamp ?? null,
      lastTimestamp: domainFile.lastTimestamp ?? null,
    };
  }

  static toGraphql(domainView: DomainAgentMemoryView): GraphqlAgentMemoryView {
    return {
      runId: domainView.runId,
      workingContext: domainView.workingContext
        ? domainView.workingContext.map((msg) => this.toGraphqlMessage(msg))
        : null,
      episodic: domainView.episodic ?? null,
      semantic: domainView.semantic ?? null,
      rawTraces: domainView.rawTraces
        ? domainView.rawTraces.map((trace) => this.toGraphqlTrace(trace))
        : null,
      rawTraceFiles: domainView.rawTraceFiles
        ? domainView.rawTraceFiles.map((file) => this.toGraphqlRawTraceFile(file))
        : null,
      selectedRawTraceFileName: domainView.selectedRawTraceFileName ?? null,
    };
  }
}
