import { toJsonString } from "../json-utils.js";
import {
  type BrowserToolErrorPayload,
  BrowserToolError,
} from "./browser-tool-contract.js";

export const toBrowserToolErrorPayload = (error: unknown): BrowserToolErrorPayload => {
  if (error instanceof BrowserToolError) {
    return {
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    error: {
      code: "browser_bridge_unavailable",
      message: error instanceof Error ? error.message : String(error),
    },
  };
};

export const toBrowserJsonString = (value: unknown): string =>
  toJsonString(value, 2);
