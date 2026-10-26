import type { RoutingRequest } from "../domain/model-routing-types.js";
import type { TaskKindUse } from "./routing-statistics.js";

/** The knowledge file as one request carries it: its text, cut at the limit when it is longer (RSK-008). */
export type KnowledgeText = Readonly<{ text: string; truncated: boolean }>;

const SOURCE_LABEL = { agent_default: "agent default", team_default: "team default" } as const;

/**
 * The wording of one routing request (design § Concrete Examples): its ID and how to answer, the Task, each agent to
 * choose for (with skipped defaults and a required runtime), the members already set, the delegating run's launch, the
 * task kinds used on this node (most used first, to reuse) and the current `knowledge.md`.
 */
export const buildRoutingRequestText = (input: Readonly<{
  requestId: string;
  request: RoutingRequest;
  taskKinds: readonly TaskKindUse[];
  knowledge: KnowledgeText | null;
}>): string => {
  const { requestId, request } = input;
  const task = request.work.task;
  const lines = [
    `Routing request ${requestId}. Choose a runtime and model for each agent below for this Task, using list_available_agent_runtimes for what this node can run now. Answer with submit_launch_choices (requestId "${requestId}") for every agent listed, each with a short task kind and a one-sentence reason.`,
    "",
    `Task${task.taskKey ? ` ${task.taskKey}` : ""}: "${task.title}"`,
    request.work.text,
    "",
    `Target: ${request.target.name} (${request.target.kind === "agent_team" ? "agent team" : "agent"})${request.target.description ? `: ${request.target.description}` : ""}`,
    "Agents to choose for:",
    ...request.agents.map((agent) => {
      const profile = [agent.role, agent.description].filter(Boolean).join(": ");
      const skipped = agent.skipped.map((layer) =>
        ` (its ${SOURCE_LABEL[layer.layer]} ${layer.runtimeKind ?? "(no runtime)"} / ${layer.llmModelIdentifier ?? "(no model)"} cannot run now: ${layer.detail.replace(/\.$/, "")})`).join("");
      const required = agent.requiredRuntime ? ` (must stay on ${agent.requiredRuntime})` : "";
      return `- ${agent.address} — ${agent.name}${profile ? `: ${profile}` : ""}${skipped}${required}`;
    }),
    ...(request.covered.length ? [
      `Already set: ${request.covered.map((agent) => `${agent.address} → ${agent.runtimeKind} / ${agent.llmModelIdentifier} (${SOURCE_LABEL[agent.source]})`).join("; ")}`,
    ] : []),
    request.delegatingLaunch
      ? `Delegated from a run on ${request.delegatingLaunch.runtimeKind} / ${request.delegatingLaunch.llmModelIdentifier}.`
      : "Delegated from another node: there is no delegating run's launch to fall back on here.",
    input.taskKinds.length
      ? `Task kinds used here so far (reuse one when it fits): ${input.taskKinds.map((kind) => `${kind.taskKind} (${kind.count})`).join(", ")}.`
      : "No task kinds are used here yet: choose short ones (a few words).",
    "",
    input.knowledge
      ? `Your knowledge.md${input.knowledge.truncated ? " (cut here: it is too long; please shorten it)" : ""}:\n${input.knowledge.text}`
      : "Your knowledge.md is empty.",
  ];
  return lines.join("\n");
};
