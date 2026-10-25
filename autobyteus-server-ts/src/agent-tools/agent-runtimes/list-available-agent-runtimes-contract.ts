import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import {
  findAvailableAgentRuntimesService,
  type AvailableAgentRuntimesService,
} from "../../runtime-management/agent-runtimes/available-agent-runtimes-service.js";
import type { AvailableAgentRuntimesReport } from "../../runtime-management/agent-runtimes/available-agent-runtimes-report.js";

export const LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME = "list_available_agent_runtimes";

/** The same wording on every runtime (local tool and Agent Tools MCP). */
export const LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION =
  "List the agent runtimes available on this node now (Codex, Claude, Antigravity, Grok, and AutoByteus with each API provider that has a key), each with its models and its live usage limits: name, remaining percent and reset time. A model that cannot run now has blocked: {until, by}. \"unknown: <reason>\" means a value could not be read; \"not reported\" means the runtime or provider does not report it. Reading spends no tokens. This read-only tool takes no arguments.";

export const LIST_AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE = `${LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME} is not available on this server.`;

export const buildListAvailableAgentRuntimesParameterSchema = (): ParameterSchema => new ParameterSchema([]);

/** The node's report through its bound service; null where the server does not compose it. */
export const listAvailableAgentRuntimes = async (
  service: AvailableAgentRuntimesService | null = findAvailableAgentRuntimesService(),
): Promise<AvailableAgentRuntimesReport | null> => service ? service.read() : null;
