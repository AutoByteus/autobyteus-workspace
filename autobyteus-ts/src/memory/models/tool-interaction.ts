export enum ToolInteractionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error'
}

export class ToolInteraction {
  toolCallId: string;
  turnId: string | null;
  toolName: string | null;
  arguments: Record<string, unknown> | null;
  result: unknown;
  error: string | null;
  status: ToolInteractionStatus;

  constructor(options: {
    toolCallId: string;
    turnId: string | null;
    toolName: string | null;
    arguments: Record<string, unknown> | null;
    result: unknown;
    error: string | null;
    status: ToolInteractionStatus;
  }) {
    this.toolCallId = options.toolCallId;
    this.turnId = options.turnId;
    this.toolName = options.toolName;
    this.arguments = options.arguments;
    this.result = options.result;
    this.error = options.error;
    this.status = options.status;
  }
}
