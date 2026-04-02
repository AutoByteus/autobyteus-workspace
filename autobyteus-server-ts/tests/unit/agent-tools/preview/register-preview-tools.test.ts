import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  PREVIEW_BRIDGE_BASE_URL_ENV,
  PREVIEW_BRIDGE_TOKEN_ENV,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  READ_PREVIEW_PAGE_TOOL_NAME,
} from "../../../../src/agent-tools/preview/preview-tool-contract.js";
import { registerPreviewTools } from "../../../../src/agent-tools/preview/register-preview-tools.js";

const PREVIEW_TOOL_NAMES = [
  OPEN_PREVIEW_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  READ_PREVIEW_PAGE_TOOL_NAME,
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
];

describe("registerPreviewTools", () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    delete process.env[PREVIEW_BRIDGE_BASE_URL_ENV];
    delete process.env[PREVIEW_BRIDGE_TOKEN_ENV];
  });

  afterEach(() => {
    defaultToolRegistry.clear();
  });

  it("does not register preview tools when the preview bridge is unavailable", () => {
    registerPreviewTools();

    for (const toolName of PREVIEW_TOOL_NAMES) {
      expect(defaultToolRegistry.getToolDefinition(toolName)).toBeUndefined();
    }
  });

  it("registers preview tools when the preview bridge is configured", () => {
    process.env[PREVIEW_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";
    process.env[PREVIEW_BRIDGE_TOKEN_ENV] = "preview-token";

    registerPreviewTools();

    for (const toolName of PREVIEW_TOOL_NAMES) {
      expect(defaultToolRegistry.getToolDefinition(toolName)).toBeDefined();
    }
  });
});
