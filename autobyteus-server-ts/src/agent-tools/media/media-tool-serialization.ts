import { toJsonString } from "../json-utils.js";

export const toMediaJsonString = (value: unknown): string => toJsonString(value, 2);

export const toMediaToolErrorPayload = (error: unknown): Record<string, unknown> => ({
  error: {
    code: "media_tool_execution_failed",
    message: error instanceof Error ? error.message : String(error),
  },
});
