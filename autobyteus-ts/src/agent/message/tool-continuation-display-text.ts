export interface CompletedToolContinuationSummary {
  toolName: string;
  error?: string | null;
}

const DEFAULT_TOOL_NAME = 'tool';

const normalizeToolName = (toolName: string): string => {
  const normalized = toolName.trim();
  return normalized.length > 0 ? normalized : DEFAULT_TOOL_NAME;
};

const normalizeError = (error: string | null | undefined): string | null => {
  if (typeof error !== 'string') {
    return null;
  }
  const normalized = error.trim();
  return normalized.length > 0 ? normalized : null;
};

const ensureSentence = (value: string): string =>
  /[.!?]$/.test(value) ? value : `${value}.`;

const buildSingleSummaryText = (summary: CompletedToolContinuationSummary): string => {
  const toolName = normalizeToolName(summary.toolName);
  const error = normalizeError(summary.error);

  if (error) {
    return ensureSentence(`The ${toolName} tool call completed with an error: ${error}`);
  }

  return `The ${toolName} tool call completed successfully.`;
};

const buildMultipleSummaryText = (summaries: CompletedToolContinuationSummary[]): string => {
  const normalizedSummaries = summaries.map((summary) => ({
    toolName: normalizeToolName(summary.toolName),
    error: normalizeError(summary.error)
  }));
  const allSucceeded = normalizedSummaries.every((summary) => !summary.error);

  if (allSucceeded) {
    return `The following tool calls completed successfully: ${normalizedSummaries
      .map((summary) => summary.toolName)
      .join(', ')}.`;
  }

  return ensureSentence(
    `Tool call results: ${normalizedSummaries
      .map((summary) =>
        summary.error
          ? `${summary.toolName} completed with an error: ${summary.error}`
          : `${summary.toolName} completed successfully`
      )
      .join('; ')}`
  );
};

export function buildToolContinuationDisplayText(
  summaries: readonly CompletedToolContinuationSummary[]
): string {
  return summaries.length === 1
    ? buildSingleSummaryText(summaries[0])
    : summaries.length > 1
      ? buildMultipleSummaryText([...summaries])
      : 'The tool call completed.';
}
