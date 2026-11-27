import { formatBlockTime } from "../../launch-preferences/launch-usability-check.js";
import type { RuntimeSwitchRequest, SwitchRecord } from "../domain/runtime-switch-types.js";
import type { KnowledgeText } from "./routing-request-text.js";

/** At most this many usable models are listed per runtime (a keyed AutoByteus provider can offer hundreds). */
const LISTED_MODELS_PER_RUNTIME = 40;

const switchLine = (record: SwitchRecord): string => {
  const to = record.to ? `${record.to.runtimeKind} / ${record.to.llmModelIdentifier}` : "nothing usable";
  const chosen = record.chosenBy ? `, chosen by ${record.chosenBy === "model_router" ? "you" : "history"}` : "";
  const reason = record.reason ? `: ${record.reason}` : "";
  return `- ${record.at.slice(0, 16).replace("T", " ")} UTC: ${record.from.runtimeKind} / ${record.from.llmModelIdentifier} → ${to}${chosen}${reason} (${record.outcome})`;
};

/**
 * The wording of one switch request (autobyteus-646 C-7): its ID and how to answer, the agent and why it needs another
 * runtime, the runtimes and models usable now (exhausted ones left out), the agent's launches in the last 30 days, its
 * earlier switches, and the current `knowledge.md`.
 */
export const buildSwitchRequestText = (input: Readonly<{ requestId: string; request: RuntimeSwitchRequest; knowledge: KnowledgeText | null }>): string => {
  const { requestId, request } = input;
  const why = request.why;
  const resets = why.resetAt ? `; it resets ${formatBlockTime(why.resetAt)}` : "; its reset time is not known";
  const blocked = why.blockedModels.filter((model) => model !== why.llmModelIdentifier);
  const lines = [
    `Switch request ${requestId}. An agent's runtime cannot continue and it needs another runtime now. Choose one runtime and model from the usable list below and answer with submit_runtime_switch (requestId "${requestId}"), with a one-sentence reason.`,
    "",
    `Agent: ${request.agentName}${request.agentDescription ? `: ${request.agentDescription}` : ""}`,
    `Why: its usage limit was reached on ${why.runtimeKind} / ${why.llmModelIdentifier}${resets}${blocked.length ? ` (also blocked: ${blocked.join(", ")})` : ""}.`,
    "Usable now:",
    ...request.usable.map((runtime) => {
      const listed = runtime.models.slice(0, LISTED_MODELS_PER_RUNTIME).join(", ");
      const more = runtime.models.length > LISTED_MODELS_PER_RUNTIME ? `, and ${runtime.models.length - LISTED_MODELS_PER_RUNTIME} more` : "";
      return `- ${runtime.runtimeKind}: ${listed}${more}`;
    }),
    request.history.length
      ? `This agent's launches in the last 30 days: ${request.history.map((entry) => `${entry.runtimeKind} / ${entry.llmModelIdentifier} (${entry.runs} run${entry.runs === 1 ? "" : "s"}, last ${entry.lastUsedAt.slice(0, 10)})`).join("; ")}.`
      : "This agent has no launches in the last 30 days.",
    ...(request.earlierSwitches.length ? ["Its earlier switches (most recent first):", ...request.earlierSwitches.map(switchLine)] : ["It has no earlier switches."]),
    "",
    input.knowledge
      ? `Your knowledge.md${input.knowledge.truncated ? " (cut here: it is too long; please shorten it)" : ""}:\n${input.knowledge.text}`
      : "Your knowledge.md is empty.",
  ];
  return lines.join("\n");
};
