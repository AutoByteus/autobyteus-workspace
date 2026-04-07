import {
  assertRequiredKeys,
  BaseStreamPayload,
  isRecord
} from './stream-event-payload-utils.js';

export class ToolInteractionLogEntryData extends BaseStreamPayload {
  log_entry: string;
  tool_invocation_id: string;
  tool_name: string;
  turn_id: string | null;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(
      data,
      ['log_entry', 'tool_invocation_id', 'tool_name', 'turn_id'],
      'ToolInteractionLogEntryData'
    );
    super(data);
    this.log_entry = String(data.log_entry ?? '');
    this.tool_invocation_id = String(data.tool_invocation_id ?? '');
    this.tool_name = String(data.tool_name ?? '');
    this.turn_id = data.turn_id == null ? null : String(data.turn_id);
  }
}

export class ToolApprovalRequestedData extends BaseStreamPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments: Record<string, any>;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(
      data,
      ['invocation_id', 'tool_name', 'turn_id', 'arguments'],
      'ToolApprovalRequestedData'
    );
    super(data);
    this.invocation_id = String(data.invocation_id ?? '');
    this.tool_name = String(data.tool_name ?? '');
    this.turn_id = data.turn_id == null ? null : String(data.turn_id);
    this.arguments = data.arguments ?? {};
  }
}

export class ToolApprovedData extends BaseStreamPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  reason?: string | null;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['invocation_id', 'tool_name', 'turn_id'], 'ToolApprovedData');
    super(data);
    this.invocation_id = String(data.invocation_id ?? '');
    this.tool_name = String(data.tool_name ?? '');
    this.turn_id = data.turn_id == null ? null : String(data.turn_id);
    this.reason = data.reason ?? undefined;
  }
}

export class ToolDeniedData extends BaseStreamPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  reason?: string | null;
  error?: string | null;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['invocation_id', 'tool_name', 'turn_id'], 'ToolDeniedData');
    super(data);
    this.invocation_id = String(data.invocation_id ?? '');
    this.tool_name = String(data.tool_name ?? '');
    this.turn_id = data.turn_id == null ? null : String(data.turn_id);
    this.reason = data.reason ?? undefined;
    this.error = data.error ?? undefined;
  }
}

export class ToolExecutionStartedData extends BaseStreamPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['invocation_id', 'tool_name', 'turn_id'], 'ToolExecutionStartedData');
    super(data);
    this.invocation_id = String(data.invocation_id ?? '');
    this.tool_name = String(data.tool_name ?? '');
    this.turn_id = data.turn_id == null ? null : String(data.turn_id);
    this.arguments = data.arguments ?? undefined;
  }
}

export class ToolExecutionSucceededData extends BaseStreamPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  result?: unknown;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['invocation_id', 'tool_name', 'turn_id'], 'ToolExecutionSucceededData');
    super(data);
    this.invocation_id = String(data.invocation_id ?? '');
    this.tool_name = String(data.tool_name ?? '');
    this.turn_id = data.turn_id == null ? null : String(data.turn_id);
    this.result = data.result ?? undefined;
  }
}

export class ToolExecutionFailedData extends BaseStreamPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  error: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(
      data,
      ['invocation_id', 'tool_name', 'turn_id', 'error'],
      'ToolExecutionFailedData'
    );
    super(data);
    this.invocation_id = String(data.invocation_id ?? '');
    this.tool_name = String(data.tool_name ?? '');
    this.turn_id = data.turn_id == null ? null : String(data.turn_id);
    this.error = String(data.error ?? '');
  }
}

export const createToolInteractionLogEntryData = (
  logData: unknown
): ToolInteractionLogEntryData => {
  if (!isRecord(logData)) {
    throw new Error('Cannot create ToolInteractionLogEntryData from non-object');
  }
  return new ToolInteractionLogEntryData(logData);
};

export const createToolApprovalRequestedData = (
  approvalData: unknown
): ToolApprovalRequestedData => {
  if (!isRecord(approvalData)) {
    throw new Error('Cannot create ToolApprovalRequestedData from non-object');
  }
  return new ToolApprovalRequestedData(approvalData);
};

export const createToolApprovedData = (approvalData: unknown): ToolApprovedData => {
  if (!isRecord(approvalData)) {
    throw new Error('Cannot create ToolApprovedData from non-object');
  }
  return new ToolApprovedData(approvalData);
};

export const createToolDeniedData = (denialData: unknown): ToolDeniedData => {
  if (!isRecord(denialData)) {
    throw new Error('Cannot create ToolDeniedData from non-object');
  }
  return new ToolDeniedData(denialData);
};

export const createToolExecutionStartedData = (
  startData: unknown
): ToolExecutionStartedData => {
  if (!isRecord(startData)) {
    throw new Error('Cannot create ToolExecutionStartedData from non-object');
  }
  return new ToolExecutionStartedData(startData);
};

export const createToolExecutionSucceededData = (
  successData: unknown
): ToolExecutionSucceededData => {
  if (!isRecord(successData)) {
    throw new Error('Cannot create ToolExecutionSucceededData from non-object');
  }
  return new ToolExecutionSucceededData(successData);
};

export const createToolExecutionFailedData = (
  failureData: unknown
): ToolExecutionFailedData => {
  if (!isRecord(failureData)) {
    throw new Error('Cannot create ToolExecutionFailedData from non-object');
  }
  return new ToolExecutionFailedData(failureData);
};
