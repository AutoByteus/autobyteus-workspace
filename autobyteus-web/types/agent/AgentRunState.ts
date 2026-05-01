import type { Conversation, Message, AIMessage } from '~/types/conversation';
import { generateBaseInvocationId } from '~/utils/toolUtils';
import { AgentStatus } from '~/types/agent/AgentStatus';

export type CompactionStatusPhase = 'requested' | 'started' | 'completed' | 'failed';

export interface AgentCompactionStatus {
  phase: CompactionStatusPhase;
  message: string;
  turnId?: string | null;
  selectedBlockCount?: number | null;
  compactedBlockCount?: number | null;
  rawTraceCount?: number | null;
  semanticFactCount?: number | null;
  compactionAgentDefinitionId?: string | null;
  compactionAgentName?: string | null;
  compactionRuntimeKind?: string | null;
  compactionModelIdentifier?: string | null;
  compactionRunId?: string | null;
  compactionTaskId?: string | null;
  errorMessage?: string | null;
}

export class AgentRunState {
  public runId: string;
  public currentStatus: AgentStatus = AgentStatus.Uninitialized;
  public conversation: Conversation;
  public agent_tool_invocation_counts = new Map<string, number>();
  public compactionStatus: AgentCompactionStatus | null = null;

  constructor(initialId: string, initialConversation: Conversation) {
    this.runId = initialId;
    this.conversation = initialConversation;
  }
  
  get lastMessage(): Message | undefined {
    if (!this.conversation.messages || this.conversation.messages.length === 0) {
      return undefined;
    }
    return this.conversation.messages[this.conversation.messages.length - 1];
  }

  get lastAIMessage(): AIMessage | undefined {
    const lastMsg = this.lastMessage;
    return (lastMsg?.type === 'ai') ? (lastMsg as AIMessage) : undefined;
  }

  public promoteTemporaryId(permanentId: string): void {
    this.runId = permanentId;
    this.conversation.id = permanentId;
  }

  public generateUniqueInvocationId(toolName: string, args: Record<string, any>): string {
    const baseId = generateBaseInvocationId(toolName, args);
    const count = this.agent_tool_invocation_counts.get(baseId) ?? 0;
    const uniqueId = `${baseId}_${count}`;
    this.agent_tool_invocation_counts.set(baseId, count + 1);
    return uniqueId;
  }
}
