import type { AgentToolMcpAdapterProvider } from "../agent-tool-mcp-adapter.js";
import { BrowserToolsMcpAdapterProvider } from "./browser-tools-mcp-adapter-provider.js";
import { MediaToolsMcpAdapterProvider } from "./media-tools-mcp-adapter-provider.js";
import { PublishArtifactsMcpAdapterProvider } from "./publish-artifacts-mcp-adapter-provider.js";
import { SendMessageToMcpAdapterProvider } from "./send-message-to-mcp-adapter-provider.js";
import { TaskDelegationToolsMcpAdapterProvider } from "./task-delegation-tools-mcp-adapter-provider.js";
import { GetHandoffRulesMcpAdapterProvider } from "./get-handoff-rules-mcp-adapter-provider.js";

export const buildDefaultAgentToolMcpAdapterProviders = (): AgentToolMcpAdapterProvider[] => [
  new SendMessageToMcpAdapterProvider(),
  new GetHandoffRulesMcpAdapterProvider(),
  new BrowserToolsMcpAdapterProvider(),
  new MediaToolsMcpAdapterProvider(),
  new TaskDelegationToolsMcpAdapterProvider(),
  new PublishArtifactsMcpAdapterProvider(),
];
