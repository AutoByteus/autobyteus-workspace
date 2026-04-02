import { toJsonString } from "../json-utils.js";
import {
  type PreviewErrorPayload,
  PreviewToolError,
} from "./preview-tool-contract.js";

export const toPreviewErrorPayload = (error: unknown): PreviewErrorPayload => {
  if (error instanceof PreviewToolError) {
    return {
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    error: {
      code: "preview_bridge_unavailable",
      message: error instanceof Error ? error.message : String(error),
    },
  };
};

export const toPreviewJsonString = (value: unknown): string =>
  toJsonString(value, 2);
