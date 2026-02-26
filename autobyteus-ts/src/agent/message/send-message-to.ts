import { BaseTool } from '../../tools/base-tool.js';
import { ToolCategory } from '../../tools/tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { InterAgentMessageRequestEvent } from '../../agent-team/events/agent-team-events.js';
import type { ToolConfig } from '../../tools/tool-config.js';

type SendMessageContext = {
  agentId?: string;
  config?: {
    name?: string;
  };
  customData?: {
    teamContext?: {
      teamManager?: {
        dispatchInterAgentMessageRequest: (event: InterAgentMessageRequestEvent) => Promise<void>;
      } | null;
    };
  };
};

export class SendMessageTo extends BaseTool {
  static TOOL_NAME = 'send_message_to';
  static CATEGORY = ToolCategory.AGENT_COMMUNICATION;

  constructor(config?: ToolConfig) {
    super(config);
  }

  static getName(): string {
    return SendMessageTo.TOOL_NAME;
  }

  static getDescription(): string {
    return (
      'Sends a message to another agent within the same team, starting them if necessary. ' +
      'You must specify the recipient by their unique name as provided in your team manifest.'
    );
  }

  static getArgumentSchema(): ParameterSchema {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'recipient_name',
      type: ParameterType.STRING,
      description:
        'The unique name of the recipient agent (e.g., "Researcher", "Writer_1"). This MUST match a name from your team manifest.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'content',
      type: ParameterType.STRING,
      description: 'The actual message content or task instruction.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'message_type',
      type: ParameterType.STRING,
      description: 'Optional category for internal routing/analytics (defaults to direct_message).',
      required: false
    }));
    return schema;
  }

  protected async _execute(context: SendMessageContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const teamContext = context?.customData?.teamContext;
    if (!teamContext) {
      const errorMsg =
        `Critical error: ${this.getName()} tool is not configured for team communication. ` +
        'It can only be used within a managed AgentTeam.';
      return `Error: ${errorMsg}`;
    }

    const teamManager = teamContext.teamManager;
    if (!teamManager) {
      return 'Error: Internal Error: TeamManager not found in the provided team_context.';
    }

    const recipientName = (kwargs as { recipient_name?: string }).recipient_name;
    const content = (kwargs as { content?: string }).content;
    const rawMessageType = (kwargs as { message_type?: string }).message_type;

    if (typeof recipientName !== 'string' || !recipientName.trim()) {
      return 'Error: `recipient_name` must be a non-empty string.';
    }
    if (typeof content !== 'string' || !content.trim()) {
      return 'Error: `content` must be a non-empty string.';
    }
    const messageType =
      typeof rawMessageType === 'string' && rawMessageType.trim().length > 0
        ? rawMessageType.trim()
        : 'direct_message';

    const senderAgentId = context?.agentId ?? 'unknown';

    const event = new InterAgentMessageRequestEvent(
      senderAgentId,
      recipientName,
      content,
      messageType
    );

    await teamManager.dispatchInterAgentMessageRequest(event);

    return `Message dispatch for recipient '${recipientName}' has been successfully requested.`;
  }
}
