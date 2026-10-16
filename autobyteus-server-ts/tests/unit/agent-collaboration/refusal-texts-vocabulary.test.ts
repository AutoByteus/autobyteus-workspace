import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  delegationTargetUnavailableMessage,
  messageTargetNotFoundMessage,
  ownTeamDelegationRefusedMessage,
} from "../../../src/agent-collaboration/collaborators/collaborator-errors.js";
import { ASSIGNER_ONLY_REACTIVATION_MESSAGE } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { ROOT_NOT_ACTIVE_MESSAGE } from "../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { notCurrentTaskMessage } from "../../../src/projects/domain/task-execution-resources.js";

/**
 * Collaboration wording authority (ticket collaboration-prompt-wording, §10 check 9): the texts an
 * agent can receive from a refusal or result never use the retired vocabulary.
 */
const FORBIDDEN = /\b(copy|copies|spawn\w*|this run|your run|mounted|collaborators?|brought in|nested|task worker|work packet|pause[ds]?|wake[ds]?|restor\w+|shut down)\b/i;

const REFUSAL_SITES = [
  "src/agent-communication/services/global-agent-run-message-router.ts",
  "src/agent-collaboration/execution/communication/root-communication-engine.ts",
  "src/agent-collaboration/execution/backends/root-agent-execution-registry.ts",
  "src/agent-collaboration/domain/agent-team-address.ts",
  "src/agent-collaboration/collaborators/collaborator-errors.ts",
  "src/agent-collaboration/collaborators/message-recipient-resolution.ts",
  "src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts",
  "src/agent-collaboration/execution/task/root-task-execution-resource-scope.ts",
  "src/agent-collaboration/execution/task/task-execution-live-holds.ts",
  "src/agent-collaboration/execution/task/existing-copy-target.ts",
  "src/agent-collaboration/execution/task/task-execution-input.ts",
  "src/agent-collaboration/collaborators/catalog-delegation.ts",
  "src/agent-collaboration/execution/task/task-execution-resource-port.ts",
  "src/agent-collaboration/execution/task/task-delegation-command.ts",
  "src/projects/domain/task-execution-resources.ts",
  "src/projects/services/project-task-service.ts",
  "src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts",
];

const LITERAL = /"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

/** Text literals (more than one word) of a source file, outside comments and `${...}` placeholders. */
const textLiterals = (file: string): string[] => {
  const source = fs.readFileSync(path.resolve(file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\/\/.*$/, ""))
    .join("\n");
  return (source.match(LITERAL) ?? [])
    .map((literal) => literal.slice(1, -1).replace(/\$\{[^}]*\}/g, "X"))
    .filter((text) => /\s/.test(text) && /[A-Za-z]{3}/.test(text));
};

describe("refusal and result texts use the agent-facing vocabulary (REQ-008, AC-005)", () => {
  it.each(REFUSAL_SITES)("%s has no retired word in a text an agent can read", (file) => {
    const offenders = textLiterals(file).filter((text) => FORBIDDEN.test(text));
    expect(offenders).toEqual([]);
  });

  it("the shared messages say what happened and what to do next, by ID and in task agent terms", () => {
    expect(messageTargetNotFoundMessage("/x")).toBe(
      "No agent or agent team you can talk with has the address /x. To have a task done by a new agent, use delegate_task; then talk with it by its ID.");
    expect(ownTeamDelegationRefusedMessage("/x")).toBe("/x is in your own team; you can't delegate to it. Talk with it using send_message_to.");
    expect(delegationTargetUnavailableMessage("/x")).toBe(
      "'/x' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use.");
    expect(ROOT_NOT_ACTIVE_MESSAGE).toBe("This work is stopping or has stopped, so the message or delegation was not sent.");
    expect(ASSIGNER_ONLY_REACTIVATION_MESSAGE).toContain("Only the agent that assigned the Task can continue it");
    const current = notCurrentTaskMessage({ teamRunId: "t1" } as never, { taskId: "B", status: "DONE" }, "A");
    expect(current).toContain("This task agent's current Task is B (DONE); setting Task A to TODO or IN_PROGRESS does not reach it.");
    for (const text of [
      messageTargetNotFoundMessage("/x"), ownTeamDelegationRefusedMessage("/x"), delegationTargetUnavailableMessage("/x"),
      ROOT_NOT_ACTIVE_MESSAGE, ASSIGNER_ONLY_REACTIVATION_MESSAGE, current,
    ]) expect(text).not.toMatch(FORBIDDEN);
  });
});
