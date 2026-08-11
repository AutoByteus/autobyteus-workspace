import type { AgentRunConfig } from './AgentRunConfig';
import type { AgentRunState } from './AgentRunState';
import type { ContextFilePath, Conversation, AIMessage } from '~/types/conversation';

/**
 * A container class that holds the complete context for a single agent run.
 * It encapsulates both the static configuration and the dynamic runtime state,
 * as well as UI-specific composer state such as pending user input.
 */
export class AgentContext {
  public config: AgentRunConfig;
  public state: AgentRunState;

  // UI-specific and session state, now co-located with the agent run.
  public requirement: string;
  public contextFilePaths: ContextFilePath[];
  public submissionPending: boolean;

  constructor(config: AgentRunConfig, state: AgentRunState) {
    this.config = config;
    this.state = state;

    // Initialize session state
    this.requirement = '';
    this.contextFilePaths = [];
    this.submissionPending = false;
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
