import { buildAgentRunMessageSenderContext } from "../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { createAgentToolsMcpHost } from "../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import type { AgentToolMcpDescriptor } from "../../src/agent-tools/mcp/agent-tool-mcp-session.js";
import type { AgentToolMcpRunSessionAuthority } from "../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { PublishedArtifactPublisher } from "../../src/services/published-artifacts/published-artifact-publisher.js";

const silentLoggingConfig = {
  pinoLogLevel: "silent" as const,
  httpAccessLogMode: "off" as const,
  includeNoisyHttpAccessRoutes: false,
  scopedLogLevelOverrides: [],
};

/**
 * A real Agent Tools MCP host on a loopback port, for tests that start a real
 * runtime: every external run now has an Agent Tools MCP server configured,
 * so the runtime must find a live endpoint.
 */
export const startAgentToolsMcpTestHost = async (input: Readonly<{
  scopeIdentity?: string;
  publishedArtifactPublisher?: PublishedArtifactPublisher;
}> = {}): Promise<Readonly<{
  runSessions: AgentToolMcpRunSessionAuthority;
  close: () => Promise<void>;
}>> => {
  const host = createAgentToolsMcpHost({ loggingConfig: silentLoggingConfig });
  const authority = host.sessionAuthorities
    .begin({ scopeIdentity: input.scopeIdentity ?? "test:agent-tools-mcp" })
    .complete({
      executionCapabilities: {
        publishedArtifactPublisher: input.publishedArtifactPublisher
          ?? { publishManyForRun: async () => [] },
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
  await host.listen();
  return Object.freeze({
    runSessions: authority.runSessions,
    close: async () => {
      try {
        authority.close();
      } finally {
        await host.close();
      }
    },
  });
};

/** Activates a plain (non-team) run on a test host and returns its descriptor. */
export const activateAgentToolsMcpTestRun = (
  runSessions: AgentToolMcpRunSessionAuthority,
  runId: string,
  toolNames: readonly string[] = [],
): AgentToolMcpDescriptor => runSessions.activateForRun({
  owner: { runId },
  sender: buildAgentRunMessageSenderContext({ senderRunId: runId, senderName: runId }),
  runtimeExposure: buildRuntimeAgentToolExposure([...toolNames]),
}).descriptor;
