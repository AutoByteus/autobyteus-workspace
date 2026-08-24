import type {
  AIResponseSegment,
  ToolApprovalTarget,
  ToolInvocationStatus,
} from '~/types/segments';
import {
  getToolDisplaySummary,
  type ToolDisplaySummary,
} from '~/utils/toolDisplaySummary';

export type ToolCardSegment = Extract<AIResponseSegment, {
  type: 'tool_call' | 'terminal_command' | 'write_file' | 'edit_file';
}>;

export type ToolCardStatusPresentationKey =
  | 'running'
  | 'success'
  | 'error'
  | 'approved'
  | 'awaiting-approval'
  | 'denied'
  | 'default';

export type ToolCardPresentationPrimitive = string | number | boolean | null;

export interface ToolCardPresentation {
  invocationId: string;
  toolName: string;
  statusKey: ToolCardStatusPresentationKey;
  summary: ToolDisplaySummary | null;
  errorMessage: string | null;
  approvalTarget: ToolApprovalTarget | null;
  approvalTargetPrimitives: ToolCardPresentationPrimitive[];
}

export interface EventMonitorPageToolCardInput {
  invocationId: string;
  toolName: string;
  statusKey: ToolCardStatusPresentationKey;
  summaryArgs: Record<string, string | null | undefined>;
  errorMessage: string | null;
  approvalTarget: ToolApprovalTarget | null;
}

export const getToolCardStatusPresentationKey = (
  status: ToolInvocationStatus,
): ToolCardStatusPresentationKey => {
  if (status === 'parsing' || status === 'executing') return 'running';
  if (status === 'success' || status === 'error' || status === 'approved'
    || status === 'awaiting-approval' || status === 'denied') return status;
  return 'default';
};

const flattenApprovalTarget = (
  target: ToolApprovalTarget | null | undefined,
): ToolCardPresentationPrimitive[] => {
  if (!target) return [];
  return ['agentRunId', target.agentRunId];
};

export const buildEventMonitorPageToolCardPresentation = (
  input: EventMonitorPageToolCardInput,
): ToolCardPresentation => {
  const approvalTarget = input.statusKey === 'awaiting-approval' ? input.approvalTarget : null;
  return {
    invocationId: input.invocationId,
    toolName: input.toolName,
    statusKey: input.statusKey,
    summary: getToolDisplaySummary(input.toolName, input.summaryArgs, { preferCompactPath: true }),
    errorMessage: input.errorMessage,
    approvalTarget,
    approvalTargetPrimitives: flattenApprovalTarget(approvalTarget),
  };
};

const deriveSummary = (segment: ToolCardSegment, toolName: string): ToolDisplaySummary | null => {
  if (segment.type === 'write_file' || segment.type === 'edit_file') {
    return getToolDisplaySummary(toolName, { path: segment.path }, { preferCompactPath: true });
  }
  if (segment.type === 'terminal_command' && !segment.arguments?.command && segment.command) {
    return getToolDisplaySummary(toolName, { command: segment.command || '' }, { preferCompactPath: true });
  }
  return getToolDisplaySummary(toolName, segment.arguments, { preferCompactPath: true });
};

const getRenderedToolName = (segment: ToolCardSegment): string => {
  if (segment.toolName) return segment.toolName;
  if (segment.type === 'terminal_command') return 'run_bash';
  if (segment.type === 'write_file') return 'write_file';
  if (segment.type === 'edit_file') return 'edit_file';
  return 'Parsing Tool...';
};

export const buildToolCardPresentation = (
  segment: ToolCardSegment,
): ToolCardPresentation => {
  const toolName = getRenderedToolName(segment);
  const statusKey = getToolCardStatusPresentationKey(segment.status);
  const approvalTarget = statusKey === 'awaiting-approval'
    ? segment.approvalTarget ?? null
    : null;
  return {
    invocationId: segment.invocationId,
    toolName,
    statusKey,
    summary: deriveSummary(segment, toolName),
    errorMessage: segment.error || null,
    approvalTarget,
    approvalTargetPrimitives: flattenApprovalTarget(approvalTarget),
  };
};

export const getToolCardPresentationWitnessValues = (
  presentation: ToolCardPresentation,
): ToolCardPresentationPrimitive[] => [
  presentation.toolName,
  presentation.statusKey,
  presentation.summary?.kind ?? null,
  presentation.summary?.text ?? null,
  presentation.summary?.title ?? null,
  presentation.errorMessage,
  ...presentation.approvalTargetPrimitives,
];
