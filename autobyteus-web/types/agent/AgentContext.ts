import type { AgentRunConfig } from './AgentRunConfig';
import type { AgentRunState } from './AgentRunState';
import type { ContextFilePath, Conversation, AIMessage } from '~/types/conversation';

/**
 * A container class that holds the complete context for a single agent run.
 * It encapsulates both the static configuration and the dynamic runtime state,
 * as well as UI-specific session state like user input and subscription status.
 */
export class AgentContext {
  public config: AgentRunConfig;
  public state: AgentRunState;

  // UI-specific and session state, now co-located with the agent run.
  public requirement: string;
  public contextFilePaths: ContextFilePath[];
  public isSending: boolean;
  public isSubscribed: boolean;
  public unsubscribe?: () => void;

  constructor(config: AgentRunConfig, state: AgentRunState) {
    this.config = config;
    this.state = state;

    // Initialize session state
    this.requirement = '';
    this.contextFilePaths = [];
    this.isSending = false;
    this.isSubscribed = false;
    this.unsubscribe = undefined;
  }
  
  // --- Start: New helper getters (Facade) ---
  get conversation(): Conversation {
    return this.state.conversation;
  }
  
  get lastAIMessage(): AIMessage | undefined {
    // Delegate to the new helper on AgentRunState
    return this.state.lastAIMessage;
  }


  // --- End: New helper getters (Facade) ---
}
