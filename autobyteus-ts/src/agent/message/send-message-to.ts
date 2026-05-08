import path from 'node:path';
import { BaseTool } from '../../tools/base-tool.js';
import { ToolCategory } from '../../tools/tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { InterAgentMessageRequestEvent } from '../../agent-team/events/agent-team-events.js';
import type { ToolConfig } from '../../tools/tool-config.js';
import { resolveTeamCommunicationContext } from '../../agent-team/context/team-communication-context.js';

type SendMessageContext = {
  agentId?: string;
  config?: {
    name?: string;
  };
  customData?: {
    teamContext?: unknown;
  };
};

type ReferenceFilesParseResult =
  | { ok: true; referenceFiles: string[] }
  | { ok: false; message: string };

const normalizeReferencePath = (value: string): string =>
  value.replace(/\\/g, '/').trim();

const isAbsoluteLocalPath = (value: string): boolean =>
  path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || path.isAbsolute(value);

const hasInvalidSegments = (value: string): boolean =>
  value.split(/[\\/]+/).filter(Boolean).some((segment) =>
    segment === '.' ||
    segment === '..' ||
    segment.startsWith(':') ||
    segment.includes('{') ||
    segment.includes('}')
  );

const parseReferenceFiles = (rawValue: unknown): ReferenceFilesParseResult => {
  if (rawValue === undefined || rawValue === null) {
    return { ok: true, referenceFiles: [] };
  }
  if (!Array.isArray(rawValue)) {
    return { ok: false, message: '`reference_files` must be an array of absolute local file path strings.' };
  }

  const referenceFiles: string[] = [];
  const seen = new Set<string>();
  for (const [index, rawPath] of rawValue.entries()) {
    if (typeof rawPath !== 'string') {
      return { ok: false, message: `\`reference_files[${index}]\` must be a string.` };
    }
    const normalizedPath = normalizeReferencePath(rawPath);
    if (!normalizedPath) {
      return { ok: false, message: `\`reference_files[${index}]\` must be a non-empty absolute local file path.` };
    }
    if (normalizedPath.includes('\0')) {
      return { ok: false, message: `\`reference_files[${index}]\` must not contain a null byte.` };
    }
    if (normalizedPath.startsWith('//') || normalizedPath.includes('://')) {
      return { ok: false, message: `\`reference_files[${index}]\` must be a local filesystem path, not a URL or protocol path.` };
    }
    if (!isAbsoluteLocalPath(normalizedPath) || hasInvalidSegments(normalizedPath)) {
      return { ok: false, message: `\`reference_files[${index}]\` must be an absolute local file path.` };
    }
    if (!seen.has(normalizedPath)) {
      seen.add(normalizedPath);
      referenceFiles.push(normalizedPath);
    }
  }
  return { ok: true, referenceFiles };
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
      'Sends a self-contained message to another agent within the same team, starting them if necessary. ' +
      'You must specify the recipient by their unique name as provided in your team manifest. ' +
      'When sharing files, keep content as the detailed email-like body and also list those absolute paths in reference_files so they appear under Team Communication messages.'
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
      description: 'Self-contained message body or task instruction. Explain the handoff like an email body; you may naturally mention important absolute paths here, and also put files that should appear under the Team Communication message in reference_files. Example: "Implementation is ready. The handoff is at /Users/me/project/implementation-handoff.md and the test log is at /Users/me/project/test.log; please review the risks below."',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'message_type',
      type: ParameterType.STRING,
      description: 'Optional category for internal routing/analytics (defaults to direct_message).',
      required: false
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'reference_files',
      type: ParameterType.ARRAY,
      description:
        'Optional attachment/reference list of absolute local file paths the recipient may need to inspect and that should appear in Team Communication messages. Use this in addition to self-contained content, not instead of explaining the handoff. Example: ["/Users/me/project/implementation-handoff.md", "/Users/me/project/test.log"].',
      required: false,
      arrayItemSchema: ParameterType.STRING
    }));
    return schema;
  }

  protected async _execute(context: SendMessageContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const communicationContext = resolveTeamCommunicationContext(context?.customData?.teamContext);
    if (!communicationContext) {
      const errorMsg =
        `Critical error: ${this.getName()} tool is not configured for team communication. ` +
        'It can only be used within a managed AgentTeam.';
      return `Error: ${errorMsg}`;
    }

    const recipientName = (kwargs as { recipient_name?: string }).recipient_name;
    const content = (kwargs as { content?: string }).content;
    const rawMessageType = (kwargs as { message_type?: string }).message_type;
    const referenceFilesResult = parseReferenceFiles((kwargs as { reference_files?: unknown }).reference_files);

    if (typeof recipientName !== 'string' || !recipientName.trim()) {
      return 'Error: `recipient_name` must be a non-empty string.';
    }
    if (typeof content !== 'string' || !content.trim()) {
      return 'Error: `content` must be a non-empty string.';
    }
    if (!referenceFilesResult.ok) {
      console.warn(
        `[team-communication] invalid reference_files validation toolName=${this.getName()} reason=${referenceFilesResult.message}`
      );
      return `Error: ${referenceFilesResult.message}`;
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
      messageType,
      referenceFilesResult.referenceFiles
    );

    await communicationContext.dispatchInterAgentMessageRequest(event);

    return `Message dispatch for recipient '${recipientName}' has been successfully requested.`;
  }
}
