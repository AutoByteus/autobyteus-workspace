import type {
  AgentMemoryView as DomainAgentMemoryView,
  MemoryConversationEntry as DomainMemoryConversationEntry,
  MemoryMessage as DomainMemoryMessage,
  MemoryTraceEvent as DomainMemoryTraceEvent,
} from "../../../agent-memory-view/domain/models.js";
import type {
  AgentMemoryView as GraphqlAgentMemoryView,
  MemoryConversationEntry as GraphqlMemoryConversationEntry,
  MemoryMessage as GraphqlMemoryMessage,
  MemoryTraceEvent as GraphqlMemoryTraceEvent,
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
      traceType: domainTrace.traceType,
      content: domainTrace.content ?? null,
      toolName: domainTrace.toolName ?? null,
      toolArgs: domainTrace.toolArgs ?? null,
      toolResult: domainTrace.toolResult ?? null,
      toolError: domainTrace.toolError ?? null,
      media: domainTrace.media ?? null,
      turnId: domainTrace.turnId,
      seq: domainTrace.seq,
      ts: domainTrace.ts,
    };
  }

  private static toGraphqlConversation(
    domainEntry: DomainMemoryConversationEntry,
  ): GraphqlMemoryConversationEntry {
    return {
      kind: domainEntry.kind,
      role: domainEntry.role ?? null,
      content: domainEntry.content ?? null,
      toolName: domainEntry.toolName ?? null,
      toolArgs: domainEntry.toolArgs ?? null,
      toolResult: domainEntry.toolResult ?? null,
      toolError: domainEntry.toolError ?? null,
      media: domainEntry.media ?? null,
      ts: domainEntry.ts ?? null,
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
      conversation: domainView.conversation
        ? domainView.conversation.map((entry) => this.toGraphqlConversation(entry))
        : null,
      rawTraces: domainView.rawTraces
        ? domainView.rawTraces.map((trace) => this.toGraphqlTrace(trace))
        : null,
    };
  }
}
