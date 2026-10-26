export const toMediaToolErrorPayload = (error: unknown): Record<string, unknown> => ({
  error: {
    code: "media_tool_execution_failed",
    message: error instanceof Error ? error.message : String(error),
  },
});
