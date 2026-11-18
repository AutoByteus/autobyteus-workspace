import { vi } from "vitest";
import {
  AGENT_TOOLS_MCP_SERVER_NAME,
  AGENT_TOOLS_MCP_TRANSPORT,
  type AgentToolMcpDescriptor,
} from "../../src/agent-tools/mcp/agent-tool-mcp-session.js";
import { deriveAgentToolMcpRunSessionId } from "../../src/agent-tools/mcp/agent-tool-mcp-run-session-id.js";
import { buildRuntimeAgentToolExposure } from "../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import type {
  ActiveAgentToolMcpRunSession,
  AgentToolMcpRunSessionActivationInput,
  AgentToolMcpRunSessionReplaceInput,
} from "../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";

/** An address nothing listens on: only for tests whose runtimes never connect. */
export const STUB_AGENT_TOOLS_MCP_BASE_URL = "http://127.0.0.1:9";

export const stubAgentToolMcpDescriptor = (
  runId: string,
  enabledTools: readonly string[] = [],
  baseUrl = STUB_AGENT_TOOLS_MCP_BASE_URL,
): AgentToolMcpDescriptor => Object.freeze({
  name: AGENT_TOOLS_MCP_SERVER_NAME,
  transport: AGENT_TOOLS_MCP_TRANSPORT,
  serverUrl: `${baseUrl}/mcp/agent-tools/${deriveAgentToolMcpRunSessionId(runId)}`,
  enabledTools: Object.freeze([...enabledTools]) as string[],
});

/**
 * An in-memory run-session authority for tests that fake the Agent Tools MCP
 * endpoint. Every run gets an active session (by default with no tools), as
 * the product does; `replaceForRun` takes the requested tool names as given.
 */
export const createAgentToolMcpRunSessionsStub = (options: Readonly<{
  enabledTools?: (input: AgentToolMcpRunSessionActivationInput) => readonly string[];
  baseUrl?: string;
}> = {}) => {
  const descriptors = new Map<string, AgentToolMcpDescriptor>();
  const requireDescriptor = (runId: string): AgentToolMcpDescriptor => {
    const descriptor = descriptors.get(runId.trim());
    if (!descriptor) throw new Error(`Agent Tools MCP run session for run '${runId}' is not active.`);
    return descriptor;
  };
  return {
    descriptors,
    activateForRun: vi.fn((input: AgentToolMcpRunSessionActivationInput): ActiveAgentToolMcpRunSession => {
      const runId = input.owner.runId.trim();
      const descriptor = stubAgentToolMcpDescriptor(
        runId,
        options.enabledTools?.(input) ?? [],
        options.baseUrl,
      );
      descriptors.set(runId, descriptor);
      return Object.freeze({
        kind: "active" as const,
        sessionId: deriveAgentToolMcpRunSessionId(runId),
        owner: input.owner,
        descriptor,
      });
    }),
    replaceForRun: vi.fn((input: AgentToolMcpRunSessionReplaceInput): AgentToolMcpDescriptor => {
      requireDescriptor(input.runId);
      const descriptor = stubAgentToolMcpDescriptor(
        input.runId.trim(),
        input.runtimeExposure.requestedToolNames,
        options.baseUrl,
      );
      descriptors.set(input.runId.trim(), descriptor);
      return descriptor;
    }),
    describeForRun: vi.fn((runId: string): AgentToolMcpDescriptor => requireDescriptor(runId)),
    deactivateForRun: vi.fn((runId: string): number => (descriptors.delete(runId.trim()) ? 1 : 0)),
  };
};

/** A stub with this run already activated (a backend reads the run's descriptor when it is built). */
export const activatedAgentToolMcpRunSessionsStub = (runId: string, enabledTools: readonly string[] = []) => {
  const stub = createAgentToolMcpRunSessionsStub({ enabledTools: () => enabledTools });
  stub.activateForRun({
    owner: { runId },
    sender: { senderRunId: runId } as never,
    runtimeExposure: buildRuntimeAgentToolExposure([...enabledTools]),
  });
  return stub;
};

/** The AGY backend's Agent Tools binding for a test run. */
export const stubAgyAgentTools = (runId: string, enabledTools: readonly string[] = []) => ({
  runSessions: activatedAgentToolMcpRunSessionsStub(runId, enabledTools),
  exposure: buildRuntimeAgentToolExposure([...enabledTools]),
});

/** The native backend's tools option for a test run: no tools, and nothing built. */
export const stubAutoByteusRunTools = () => ({
  exposure: buildRuntimeAgentToolExposure([]),
  exposureOf: () => buildRuntimeAgentToolExposure([]),
  build: () => [],
});
