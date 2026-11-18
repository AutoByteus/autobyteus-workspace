import { asText } from "../command-text.js";
import { actionLine, messageParts, quoted, readLine, textItems, type PlatformToolConverter } from "./platform-line-parts.js";

/**
 * Small read and answer tools (contract §3): agent, node and runtime discovery, memory search,
 * published artifacts and the Model Router's routing answer.
 */

const listAvailableAgents: PlatformToolConverter = (_call, result) => readLine("List available agents", result);
const listPeerNodes: PlatformToolConverter = (_call, result) => readLine("List peer nodes", result);
const listAvailableAgentRuntimes: PlatformToolConverter = (_call, result) => readLine("List available agent runtimes", result);

const searchMemory: PlatformToolConverter = (call, result) =>
  readLine(`Search memory ${quoted(asText(call.args.query) ?? "")}`, result);

const publishArtifacts: PlatformToolConverter = (call, result) => {
  const paths = Array.isArray(call.args.artifacts)
    ? call.args.artifacts.flatMap((item) => item && typeof item === "object" ? textItems([(item as Record<string, unknown>).path]) : [])
    : [];
  return actionLine(`Publish artifacts: ${paths.length ? paths.join(", ") : "(paths not recorded)"}`, result);
};

/** `Submit launch choices (<n> agents)`, one `<address>: <runtime> / <model>, <task kind>` line per choice. */
const submitLaunchChoices: PlatformToolConverter = (call, result) => {
  const choices = Array.isArray(call.args.choices)
    ? call.args.choices.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    : [];
  const lines = choices.map((choice) =>
    `${asText(choice.address) ?? "(address not recorded)"}: ${asText(choice.runtime) ?? "?"} / ${asText(choice.model) ?? "?"}`
    + (asText(choice.taskKind) ? `, ${asText(choice.taskKind)}` : ""));
  return actionLine(`Submit launch choices (${choices.length} agent${choices.length === 1 ? "" : "s"})`, result,
    messageParts(lines.length ? lines.join("\n") : null));
};

export const discoveryToolConverters: ReadonlyMap<string, PlatformToolConverter> = new Map([
  ["list_available_agents", listAvailableAgents],
  ["list_peer_nodes", listPeerNodes],
  ["list_available_agent_runtimes", listAvailableAgentRuntimes],
  ["search_memory", searchMemory],
  ["publish_artifacts", publishArtifacts],
  ["submit_launch_choices", submitLaunchChoices],
]);
