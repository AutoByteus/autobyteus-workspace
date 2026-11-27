import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { findModelRouting, type ModelRouting } from "../../model-routing/services/model-routing-binding.js";

export const SUBMIT_RUNTIME_SWITCH_TOOL_NAME = "submit_runtime_switch";

/** The same wording on every runtime (local tool and Agent Tools MCP). */
export const SUBMIT_RUNTIME_SWITCH_TOOL_DESCRIPTION =
  "Answer a switch request: the one runtime and model the agent continues on, chosen from the request's usable list, and a one-sentence reason. A choice that is not accepted is answered with what to correct; submit again for the same requestId.";

export const SUBMIT_RUNTIME_SWITCH_UNAVAILABLE = `${SUBMIT_RUNTIME_SWITCH_TOOL_NAME} is not available on this server.`;
export const SUBMIT_RUNTIME_SWITCH_NOT_ROUTER = "Only this node's Model Router agent can answer a switch request; nothing was changed.";

export const buildSubmitRuntimeSwitchParameterSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({ name: "requestId", type: ParameterType.STRING, required: true, description: "The ID of the switch request being answered (\"sw_…\")." }),
  new ParameterDefinition({ name: "runtime", type: ParameterType.STRING, required: true, description: "The runtime ID from the usable list (for example claude_agent_sdk)." }),
  new ParameterDefinition({ name: "model", type: ParameterType.STRING, required: true, description: "The model ID on that runtime, from the usable list." }),
  new ParameterDefinition({ name: "reason", type: ParameterType.STRING, required: true, description: "One sentence: why this runtime and model." }),
]);

/** The tool's answer: accepted, or the reasons to correct (`isError`). */
export type SubmitRuntimeSwitchResult = Readonly<{ text: string; isError: boolean }>;

/**
 * `submit_runtime_switch` (autobyteus-646 C-7): only the node's Model Router agent's run may answer; the sessions check
 * the choice against the request's usable list and settle. Runtime-neutral: the local tool and the MCP adapter call this
 * with the calling run's ID.
 */
export const submitRuntimeSwitch = async (
  senderRunId: string | null,
  rawArguments: unknown,
  routing: ModelRouting | null = findModelRouting(),
): Promise<SubmitRuntimeSwitchResult> => {
  if (!routing) return { text: SUBMIT_RUNTIME_SWITCH_UNAVAILABLE, isError: true };
  const routerRunId = await routing.agent.storedRunId();
  if (!senderRunId || senderRunId !== routerRunId) return { text: SUBMIT_RUNTIME_SWITCH_NOT_ROUTER, isError: true };
  const args = (rawArguments ?? {}) as { requestId?: unknown; runtime?: unknown; model?: unknown; reason?: unknown };
  const requestId = typeof args.requestId === "string" ? args.requestId.trim() : "";
  if (!requestId) return { text: "requestId is required; nothing was changed.", isError: true };
  const result = routing.sessions.submitSwitch(requestId, { runtime: args.runtime, model: args.model, reason: args.reason });
  return { text: result.message, isError: !result.accepted };
};
