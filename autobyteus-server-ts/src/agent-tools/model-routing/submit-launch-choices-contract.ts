import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { findModelRouting, type ModelRouting } from "../../model-routing/services/model-routing-binding.js";
import type { SubmittedLaunchChoice } from "../../model-routing/services/model-routing-sessions.js";

export const SUBMIT_LAUNCH_CHOICES_TOOL_NAME = "submit_launch_choices";

/** The same wording on every runtime (local tool and Agent Tools MCP). */
export const SUBMIT_LAUNCH_CHOICES_TOOL_DESCRIPTION =
  "Answer a routing request: for every agent the request lists, the runtime and model it runs on, a short task kind (a few words, such as \"implementation\") and a one-sentence reason. Choose only runtimes and models list_available_agent_runtimes shows as available, never a blocked model. A choice that is not accepted is answered with what to correct; submit again for the same requestId.";

export const SUBMIT_LAUNCH_CHOICES_UNAVAILABLE = `${SUBMIT_LAUNCH_CHOICES_TOOL_NAME} is not available on this server.`;
export const SUBMIT_LAUNCH_CHOICES_NOT_ROUTER = "Only this node's Model Router agent can submit launch choices; nothing was changed.";

export const buildSubmitLaunchChoicesParameterSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({ name: "requestId", type: ParameterType.STRING, required: true, description: "The ID of the routing request being answered (\"req_…\")." }),
  new ParameterDefinition({
    name: "choices", type: ParameterType.ARRAY, required: true,
    description: "One choice per agent the request lists.",
    arrayItemSchema: new ParameterSchema([
      new ParameterDefinition({ name: "address", type: ParameterType.STRING, required: true, description: "The agent's address as the request lists it." }),
      new ParameterDefinition({ name: "runtime", type: ParameterType.STRING, required: true, description: "The runtime ID (for example codex_app_server)." }),
      new ParameterDefinition({ name: "model", type: ParameterType.STRING, required: true, description: "The model ID on that runtime." }),
      new ParameterDefinition({ name: "taskKind", type: ParameterType.STRING, required: true, description: "A short label of the kind of work (1-40 characters)." }),
      new ParameterDefinition({ name: "reason", type: ParameterType.STRING, required: true, description: "One sentence: why this runtime and model." }),
    ]),
  }),
]);

/** The tool's answer: accepted, or the reasons to correct (`isError`). */
export type SubmitLaunchChoicesResult = Readonly<{ text: string; isError: boolean }>;

/**
 * `submit_launch_choices` (DS-004): only the node's Model Router agent's run may answer; the sessions validate and
 * settle. Runtime-neutral: the local tool and the MCP adapter call this with the calling run's ID.
 */
export const submitLaunchChoices = async (
  senderRunId: string | null,
  rawArguments: unknown,
  routing: ModelRouting | null = findModelRouting(),
): Promise<SubmitLaunchChoicesResult> => {
  if (!routing) return { text: SUBMIT_LAUNCH_CHOICES_UNAVAILABLE, isError: true };
  const routerRunId = await routing.agent.storedRunId();
  if (!senderRunId || senderRunId !== routerRunId) return { text: SUBMIT_LAUNCH_CHOICES_NOT_ROUTER, isError: true };
  const args = (rawArguments ?? {}) as { requestId?: unknown; choices?: unknown };
  const requestId = typeof args.requestId === "string" ? args.requestId.trim() : "";
  if (!requestId) return { text: "requestId is required; nothing was changed.", isError: true };
  if (!Array.isArray(args.choices)) return { text: "choices must be a list with one choice per agent; nothing was changed.", isError: true };
  const result = routing.sessions.submit(requestId, args.choices as SubmittedLaunchChoice[]);
  return { text: result.message, isError: !result.accepted };
};
