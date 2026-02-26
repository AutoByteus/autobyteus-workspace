import { RawTraceItem } from './models/raw-trace-item.js';
import { ToolInteraction, ToolInteractionStatus } from './models/tool-interaction.js';

export const buildToolInteractions = (rawTraces: RawTraceItem[]): ToolInteraction[] => {
  const interactions = new Map<string, ToolInteraction>();

  for (const trace of rawTraces) {
    if (trace.traceType !== 'tool_call' && trace.traceType !== 'tool_result') {
      continue;
    }
    if (!trace.toolCallId) {
      continue;
    }

    let interaction = interactions.get(trace.toolCallId);
    if (!interaction) {
      interaction = new ToolInteraction({
        toolCallId: trace.toolCallId,
        turnId: trace.turnId ?? null,
        toolName: trace.toolName ?? null,
        arguments: null,
        result: null,
        error: null,
        status: ToolInteractionStatus.PENDING
      });
      interactions.set(trace.toolCallId, interaction);
    }

    if (trace.traceType === 'tool_call') {
      interaction.toolName = trace.toolName ?? interaction.toolName;
      interaction.arguments = trace.toolArgs ?? interaction.arguments;
      if (interaction.status === ToolInteractionStatus.PENDING && interaction.error) {
        interaction.status = ToolInteractionStatus.ERROR;
      }
      continue;
    }

    if (trace.traceType === 'tool_result') {
      interaction.toolName = trace.toolName ?? interaction.toolName;
      interaction.result = trace.toolResult ?? interaction.result;
      interaction.error = trace.toolError ?? interaction.error;
      interaction.status = trace.toolError
        ? ToolInteractionStatus.ERROR
        : ToolInteractionStatus.SUCCESS;
    }
  }

  return Array.from(interactions.values());
};
