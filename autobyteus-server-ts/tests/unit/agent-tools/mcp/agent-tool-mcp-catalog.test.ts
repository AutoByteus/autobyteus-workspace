import { describe, expect, it } from "vitest";
import { buildConfiguredAgentToolExposure } from "../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { BrowserToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/browser-tools-mcp-adapter-provider.js";
import { MediaToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/media-tools-mcp-adapter-provider.js";
import { PublishArtifactsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/publish-artifacts-mcp-adapter-provider.js";
import { SendMessageToMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.js";
import { TaskDelegationToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.js";

const sender = buildAgentRunMessageSenderContext({
  senderRunId: "run-1",
  senderName: "agent",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const memberSender = buildAgentRunMessageSenderContext({
  senderRunId: "member-run-1",
  senderName: "member",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  memberTeamContext: {
    teamRunId: "team-1",
    teamDefinitionId: "team-def",
    teamName: "team",
    teamBackendKind: "MIXED",
    memberName: "member",
    memberPath: ["member"],
    memberRouteKey: "member",
    memberRunId: "member-run-1",
    coordinatorMemberRouteKey: null,
    members: [],
  } as any,
});

const createCatalog = (browserSupported: boolean): AgentToolMcpCatalog =>
  new AgentToolMcpCatalog({
    providers: [
      new SendMessageToMcpAdapterProvider({ dispatch: async () => ({ accepted: true }) } as any),
      new BrowserToolsMcpAdapterProvider({ isBrowserSupported: () => browserSupported } as any),
      new MediaToolsMcpAdapterProvider({} as any),
      new TaskDelegationToolsMcpAdapterProvider({} as any),
      new PublishArtifactsMcpAdapterProvider({} as any),
    ],
  });

describe("AgentToolMcpCatalog", () => {
  it("resolves configured supported tools across families with browser and team availability gates", () => {
    const exposure = buildConfiguredAgentToolExposure([
      "send_message_to",
      "open_tab",
      "generate_image",
      "delegate_tasks",
      "publish_artifacts",
      "unknown_tool",
    ]);

    expect(createCatalog(false).resolveConfiguredSupportedToolNames({
      configuredExposure: exposure,
      sender,
      executionContext: { workingDirectory: "/tmp/workspace" },
    })).toEqual(["send_message_to", "generate_image", "publish_artifacts"]);

    expect(createCatalog(true).resolveConfiguredSupportedToolNames({
      configuredExposure: exposure,
      sender: memberSender,
      executionContext: { workingDirectory: "/tmp/workspace" },
    })).toEqual([
      "send_message_to",
      "open_tab",
      "generate_image",
      "delegate_tasks",
      "publish_artifacts",
    ]);
  });
});
