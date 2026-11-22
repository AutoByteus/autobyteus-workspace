import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The complete catalogue of results and refusals an agent can read from `send_message_to` and
 * `delegate_task` (wording §7.3, M-01..M-50; SR-014; M-43, "still works on Task …", was withdrawn when a task
 * agent became able to hold several open Tasks, task-agent-several-tasks). Each text is written here exactly once and
 * checked two ways: every fixed part of it is present in the server source (so the code says what
 * the catalogue says), and none of it uses a word the agent should not read (wording §2). The
 * behavioural tests next to each code site (and `refusal-texts-vocabulary.test.ts`) produce the
 * refusals themselves. `<...>` marks a value the code fills in.
 */
const CATALOGUE: readonly (readonly [string, string, string])[] = [
  ["M-01", "send_message_to", "No agent or agent team you can talk with has the address <address>. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run id. To have a task done by a new agent, use delegate_task."],
  ["M-02", "send_message_to", "send_message_to takes exactly one of recipient_address or target_agent_run_id, not both. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run id."],
  ["M-03", "send_message_to", "send_message_to needs one of recipient_address or target_agent_run_id. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run id."],
  ["M-04", "send_message_to", "'<address>' is not a valid address (<detail>). An address is exact and begins with '/', for example /team/agent. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run id."],
  ["M-05", "send_message_to", "<run id> is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: <coordinator run id>."],
  // M-06 ("You can't message this agent: it works on a different Task.") was withdrawn by autobyteus-492: the run ID is the
  // address, and a different Task is no reason to refuse a message (CM-13).
  ["M-07", "send_message_to", "This task agent's Task is closed. Only the agent that assigned the Task can continue it: set the Task to TODO or IN_PROGRESS, then message the task agent's run id (for a task agent team, its coordinator's run id)."],
  ["M-08", "send_message_to", "This Task is <status>. The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this run id again."],
  ["M-09", "send_message_to", "This task agent's current Task is <current task_id> (<status>); setting Task <reopened task_id> to TODO or IN_PROGRESS does not reach it. To have this task agent continue Task <reopened task_id>, call delegate_task with target_agent_run_id \"<run id>\" and task_id \"<reopened task_id>\"."],
  ["M-10", "send_message_to", "This task agent never started, so there is nothing to continue. Delegate the task again."],
  ["M-11", "send_message_to", "No running agent has the run id '<run id>', so the message was not sent. A stopped agent is not woken. Use an exact run id you were given: a sender run id (from a message or your new task), a run id delegate_task returned to you, or one list_running_agents lists. For an agent on another node, also pass node."],
  ["M-12", "send_message_to", "The agent '<run id>' did not accept the message: <reason>."],
  ["M-13", "send_message_to", "You can't send a message to yourself."],
  ["M-14", "send_message_to", "The agent with that run id is not running here, so the message was not sent. Use an exact run id you were given."],
  ["M-15", "send_message_to", "The agent '<run id>' is not running, so the message was not sent."],
  // M-16 ("The task agent '<run id>' has stopped …") was withdrawn with hosting (autobyteus-461): a delegated run is its own
  // run, and a message to it when stopped restores it.
  // M-17 ("The user is stopping this task agent.") went with hosted copies (autobyteus-461): a delegated run stops as itself.
  ["M-18", "send_message_to (result)", "<run id> continues with its conversation."],
  ["M-19", "send_message_to (result)", "<run id> continues with its conversation (its Task is open again) but did not receive this message; send it again."],
  ["M-20", "both tools", "This work is stopping or has stopped, so the message or delegation was not sent."],
  ["M-21", "delegate_task", "<address> is in your own team; you can't delegate to it. Talk with it using send_message_to."],
  ["M-22", "delegate_task", "'<address>' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use."],
  ["M-23", "delegate_task", "'<address>' is not a valid address (<detail>). An address is exact and begins with '/', for example /team/agent; if you have list_available_agents, it shows the addresses you can delegate to."],
  ["M-24", "delegate_task", "delegate_task needs recipient_address (an address beginning with '/') to create a new task agent, or target_agent_run_id / target_team_run_id with task_id to give a saved Task to one of your task agents."],
  ["M-25", "delegate_task", "Invalid delegate_task input: supply exactly one of target_team_run_id (a task agent team) or target_agent_run_id (a task agent)."],
  // autobyteus-587 SR-011: a task agent on another node takes node too (RF-14).
  ["M-26", "delegate_task", "Invalid delegate_task input: with target_team_run_id or target_agent_run_id, supply only that run id, task_id and, for a task agent on another node, node (not <arguments>)."],
  ["M-27", "delegate_task", "Invalid delegate_task input: <what is wrong>."],
  ["M-28", "delegate_task", "You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task."],
  ["M-29", "delegate_task", "Your Task is DONE or CANCELLED, so you can't start new work."],
  ["M-31", "delegate_task", "The Task is <status>; set it to TODO or IN_PROGRESS before you delegate it."],
  ["M-32", "delegate_task", "The Task was marked DONE or CANCELLED; its new work was not started."],
  ["M-33", "delegate_task", "Task <task_id> was given to the task agent, but the message with its work was not delivered (<reason>). Message the task agent's run id <run id>, or set Task <task_id> to CANCELLED, or delegate it to a new task agent."],
  ["M-34", "delegate_task", "<run id> is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address."],
  ["M-35", "delegate_task", "<run id> is the coordinator of task agent team <team run id>; use target_team_run_id \"<team run id>\"."],
  ["M-36", "delegate_task", "<run id> is a task agent team's run id; use target_team_run_id \"<run id>\"."],
  ["M-38", "delegate_task", "<run id> is a task agent's run id; use target_agent_run_id \"<run id>\"."],
  ["M-39", "delegate_task", "This task agent already works on this Task."],
  ["M-40", "delegate_task", "This task agent has no Task; delegate Task <task_id> with recipient_address instead."],
  ["M-41", "delegate_task", "This task agent works on part of another agent's Task, so you can't give it a Task. Delegate Task <task_id> to a new task agent with recipient_address."],
  ["M-42", "delegate_task", "Only the agent that gave this task agent its most recent Task can give it a new one. Delegate Task <task_id> to a new task agent with recipient_address instead."],
  ["M-44", "delegate_task", "This task agent already has Task <task_id>. To continue it, set Task <task_id> to TODO or IN_PROGRESS, then message the task agent's run id (for a task agent team, its coordinator's run id)."],
  ["M-45", "delegate_task", "This task agent never started, so it has no conversation to continue. Delegate Task <task_id> to a new task agent with recipient_address instead."],
  // autobyteus-492: send_message_to with node.
  ["M-46", "send_message_to", "send_message_to takes node only with target_agent_run_id: an address can't name an agent on another node. Use the agent's run id with node."],
  ["M-47", "send_message_to", "send_message_to with node needs an agent run that collaborates, so nothing was sent to another node."],
  // The other node's refusal (M-50, or M-05 for a team that runs there), worded with this node's name for that node.
  ["M-48", "send_message_to", "<M-50 without its final period> on node \"<node>\", so the message was not sent. A stopped agent is not woken. If you have list_running_agents, call it with node \"<node>\" to see what runs there."],
  ["M-49", "send_message_to", "<M-05> The team runs on node \"<node>\": send to its coordinator with node \"<node>\"."],
  ["M-50", "send_message_to (the other node's text)", "No running agent has the run id '<run id>'."],
];

const SRC = path.resolve("src");
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith(".ts") ? [path.join(dir, entry.name)] : []);

/** The server source with string joins removed and every `${...}` reduced to `<>`, so fixed text can be found in it. */
const normalizedSource = (): string => walk(SRC).map((file) => fs.readFileSync(file, "utf8")).join("\n")
  .replace(/["'`]\s*\+\s*[\r\n]+\s*["'`]/g, "")
  .replace(/["'`]\s*[\r\n]+\s*\+\s*["'`]/g, "")
  .replace(/\$\{toolName\}/g, "send_message_to")
  // Three values the code builds with a helper or a nested template: written out as the text they produce.
  .replace(/\$\{copyIdField\([^)]*\)\}/g, 'target_agent_run_id "<>"')
  .replace(/\$\{newCopyHint\([^)]*\)\}/g, "or delegate Task <> to a new task agent with recipient_address.")
  .replace(/\$\{input\.currentTaskStatus \? `([^`]*)\$\{input\.currentTaskStatus\}([^`]*)` : ""\}/g, "$1<>$2")
  .replace(/\\(["'`])/g, "$1")
  .replace(/\$\{[^}]*\}/g, "<>");

const ID_RULE = /(?<!Task's |Task |Unknown )\bIDs?\b|\bsender id\b/;
const FORBIDDEN = /\b(copy|copies|spawn\w*|this run(?! id)|your run(?! id)|the run(?! id)|in the run(?! id)|mounted|collaborators?|brought in|nested|task worker|work packet|pause[ds]?|wake[ds]?|restor\w+|reactivat\w+|shut down)\b/i;

describe("result and refusal catalogue (wording §7.3, SR-014)", () => {
  // M-30 ("Tasks are not available here …") was withdrawn with the process binding (autobyteus-461 SR-047, SR-052): every host
  // composes the Task side and its delegation, so no delegation finds none. M-37 (a team member's run ID) was withdrawn by
  // SR-071: a member's run ID gets base's M-34.
  it("lists M-01 to M-50 once each, without the withdrawn M-43, M-16, M-17, M-30, M-37 and M-06 (autobyteus-492)", () => {
    expect(CATALOGUE.map(([id]) => id)).toEqual(Array.from({ length: 50 }, (_unused, index) => `M-${String(index + 1).padStart(2, "0")}`)
      .filter((id) => id !== "M-43" && id !== "M-16" && id !== "M-17" && id !== "M-30" && id !== "M-37" && id !== "M-06"));
  });

  const source = normalizedSource();
  it.each(CATALOGUE)("%s (%s): the code says exactly what the catalogue says", (_id, _tool, text) => {
    const fragments = text.replace(/<[^>]+>/g, "<>").split("<>").map((part) => part.trim()).filter((part) => part.length > 2);
    for (const fragment of fragments) expect(source.includes(fragment), `missing from the source: ${fragment}`).toBe(true);
  });

  it.each(CATALOGUE)("%s (%s): uses no word the agent should not read", (_id, _tool, text) => {
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).not.toMatch(ID_RULE);
  });
});
