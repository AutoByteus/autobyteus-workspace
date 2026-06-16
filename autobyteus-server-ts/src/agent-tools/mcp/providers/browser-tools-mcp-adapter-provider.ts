import { BROWSER_TOOL_MANIFEST } from "../../browser/browser-tool-manifest.js";
import { buildBrowserToolParameterSchema } from "../../browser/browser-tool-parameter-schemas.js";
import {
  getBrowserToolService,
  type BrowserToolService,
} from "../../browser/browser-tool-service.js";
import {
  toBrowserJsonString,
  toBrowserToolErrorPayload,
} from "../../browser/browser-tool-serialization.js";
import type {
  AgentToolMcpAdapterProvider,
  AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";
import {
  createAgentToolsMcpErrorResult,
  createAgentToolsMcpSuccessResult,
} from "../agent-tools-mcp-operation-result.js";

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export class BrowserToolsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  constructor(
    private readonly browserToolService: BrowserToolService = getBrowserToolService(),
  ) {}

  getAdapters(): AgentToolMcpToolAdapter[] {
    return BROWSER_TOOL_MANIFEST.map((entry) => ({
      definition: {
        name: entry.name,
        description: entry.description,
        inputSchema: buildBrowserToolParameterSchema(entry.name),
      },
      isAvailable: () => this.browserToolService.isBrowserSupported(),
      execute: async ({ rawArguments }) => {
        try {
          const result = await entry.execute(
            this.browserToolService,
            entry.parseInput(asRawArguments(rawArguments)),
          );
          return createAgentToolsMcpSuccessResult(toBrowserJsonString(result));
        } catch (error) {
          return createAgentToolsMcpErrorResult(
            toBrowserJsonString(toBrowserToolErrorPayload(error)),
            "browser_tool_execution_failed",
          );
        }
      },
    }));
  }
}
