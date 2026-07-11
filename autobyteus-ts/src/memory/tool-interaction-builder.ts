import { ToolInteraction, ToolInteractionStatus } from './models/tool-interaction.js';
import {
  buildToolTraceLifecycleIndex,
  type PhysicalToolTraceRecord,
  type ToolCallContext,
} from './tool-trace-lifecycle-index.js';

export type ToolInteractionTrace = PhysicalToolTraceRecord;

export type BuildToolInteractionsOptions = {
  callContextByIdentity?: ReadonlyMap<string, ToolCallContext>;
};

const nonEmpty = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export const buildToolInteractions = (
  rawTraces: readonly ToolInteractionTrace[],
  options: BuildToolInteractionsOptions = {},
): ToolInteraction[] => {
  const groups = buildToolTraceLifecycleIndex(rawTraces);
  const interactions: ToolInteraction[] = [];

  for (const [key, group] of groups) {
    const context = options.callContextByIdentity?.get(key);
    const call = group.call;
    const result = group.result;
    let toolName = nonEmpty(call?.toolName) ?? context?.toolName ?? null;
    let toolArgs = call?.toolArgs ?? context?.toolArgs ?? null;

    // Historical result-side invocation metadata is read-only effective evidence.
    const historicalResultName = nonEmpty(result?.toolName);
    if (historicalResultName) toolName = historicalResultName;
    if (result?.toolArgs !== null && result?.toolArgs !== undefined) {
      toolArgs = result.toolArgs;
    }

    const error = result?.toolError ?? null;
    interactions.push(new ToolInteraction({
      toolCallId: group.identity.toolCallId,
      turnId: group.identity.turnId,
      toolName,
      arguments: toolArgs,
      result: result?.toolResult === undefined ? null : result.toolResult,
      error,
      status: !result
        ? ToolInteractionStatus.PENDING
        : error !== null ? ToolInteractionStatus.ERROR : ToolInteractionStatus.SUCCESS,
      anchorRawTraceId: call?.id ?? result?.id ?? null,
      terminalRawTraceId: result?.id ?? null,
      anchorTs: call?.ts ?? result?.ts ?? null,
      terminalTs: result?.ts ?? null,
    }));
  }

  return interactions;
};
