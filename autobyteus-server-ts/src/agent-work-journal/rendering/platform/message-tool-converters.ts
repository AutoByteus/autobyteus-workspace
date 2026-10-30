import { asText } from "../command-text.js";
import {
  acceptanceOutcome,
  actionLine,
  messageParts,
  readLine,
  recipientOf,
  textItems,
  type PlatformToolConverter,
} from "./platform-line-parts.js";

/** Agent-to-agent messaging: `send_message_to`, `delegate_task`, `get_handoff_rules` (contract §3). */

/** `Message to <recipient> (<type>) → delivered`, the text and `Files: …` below. */
const sendMessageTo: PlatformToolConverter = (call, result) => {
  const type = asText(call.args.message_type);
  const files = textItems(call.args.reference_files);
  return {
    head: `Message to ${recipientOf(call.args) ?? "(recipient not recorded)"}${type ? ` (${type})` : ""}`,
    outcome: acceptanceOutcome(result),
    parts: [...messageParts(asText(call.args.content)), ...messageParts(files.length ? `Files: ${files.join(", ")}` : null)],
  };
};

/** `Delegate task <id> to <recipient>`; a task given as a description has no id yet. */
const delegateTask: PlatformToolConverter = (call, result) => {
  const taskId = asText(call.args.task_id);
  const head = `Delegate task${taskId ? ` ${taskId}` : ""} to ${recipientOf(call.args) ?? "(recipient not recorded)"}`;
  return actionLine(head, result, taskId ? [] : messageParts(asText(call.args.description)));
};

const getHandoffRules: PlatformToolConverter = (_call, result) => readLine("Check handoff rules", result);

export const messageToolConverters: ReadonlyMap<string, PlatformToolConverter> = new Map([
  ["send_message_to", sendMessageTo],
  ["delegate_task", delegateTask],
  ["get_handoff_rules", getHandoffRules],
]);
