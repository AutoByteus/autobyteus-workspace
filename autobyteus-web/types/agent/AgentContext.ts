import type { AgentRunConfig } from './AgentRunConfig';
import type { AgentRunState } from './AgentRunState';
import type { ContextFilePath, Conversation, AIMessage } from '~/types/conversation';
import type { RequestedCollaboratorMention } from '~/utils/collaborators/collaboratorMentionText';
import type { CollaboratorAddFailure } from '~/services/collaborators/collaboratorAddFailures';
import type { MessageNotDeliveredCertainty } from '~/services/runSubmission/messageNotDelivered';

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
  /** Skill tags chosen with `/` for the next message; cleared with the requirement on submission. */
  public requestedSkillNames: string[];
  /** `@` mentions chosen for the next live-run message; a mention counts only while its `@Name` is in the text. */
  public requestedMentions: RequestedCollaboratorMention[];
  public submissionPending: boolean;
  /** A Stop was pressed and the run's status has not left Running yet ("Stopping…"); owned by `runInterrupt`. */
  public interruptPending: boolean;
  /** The last send was rejected because a mentioned collaborator could not be added; the draft was kept. */
  public collaboratorAddFailure: CollaboratorAddFailure | null;
  /** The last send did not reach the node, or may not have (autobyteus-540): its draft came back; the notice shows. */
  public messageNotDelivered: MessageNotDeliveredCertainty | null;

  constructor(config: AgentRunConfig, state: AgentRunState) {
    this.config = config;
    this.state = state;

    // Initialize session state
    this.requirement = '';
    this.contextFilePaths = [];
    this.requestedSkillNames = [];
    this.requestedMentions = [];
    this.submissionPending = false;
    this.interruptPending = false;
    this.collaboratorAddFailure = null;
    this.messageNotDelivered = null;
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

/**
 * The page's own state of a member moves to the context that replaces it (a Team stream's recovery, autobyteus-541
 * D-A6): the draft being typed, a returned draft with its notice, and a send still waiting. Not `interruptPending`: the
 * failed stream settled its Stops before the replacement, and the replacement's status decides the button.
 */
export const carryAgentContextPageState = (from: AgentContext, to: AgentContext): void => {
  to.requirement = from.requirement;
  to.contextFilePaths = from.contextFilePaths;
  to.requestedSkillNames = from.requestedSkillNames;
  to.requestedMentions = from.requestedMentions;
  to.messageNotDelivered = from.messageNotDelivered;
  to.collaboratorAddFailure = from.collaboratorAddFailure;
  to.submissionPending = from.submissionPending;
};
