import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { projectAgentCollaborationView } from "../../../../src/services/agent-streaming/agent-collaboration-view-projector.js";

/**
 * autobyteus-461 rule 3 (the frontend contract's acceptance check): an agent run's view is in the shapes the web received
 * at base `827f1e68dc` (recorded there by `IMP-46-base-view-shapes.test.ts`, story 5.1's S1, S6 and S10), except its run
 * tree: since SR-084 the runs it delegated, and their statuses and closed set, are its tree's rows (`RUN_TREE_SNAPSHOT`,
 * `run_tree_changed`), whose acceptance is the tree's own tests. Compared by key paths (values differ by run).
 */
const base = JSON.parse(readFileSync(new URL("../../../fixtures/char-461/base-agent-view-shapes.json", import.meta.url), "utf8"));

const pathsOf = (value: unknown, prefix = ""): string[] => {
  if (Array.isArray(value)) return value.length ? [...new Set(value.flatMap((item) => pathsOf(item, `${prefix}[]`)))] : [`${prefix}[]`];
  if (value && typeof value === "object") {
    if (prefix.endsWith("llmConfig")) return [prefix];
    return Object.keys(value).flatMap((key) => [`${prefix}.${key}`, ...pathsOf((value as Record<string, unknown>)[key], `${prefix}.${key}`)]);
  }
  return [];
};
/**
 * SR-083, SR-084 (rule 3 as narrowed): the statuses and the input of the runs it delegated leave the view (each run's own,
 * by run ID), and so do its delegated rows and closed set (its tree's). Every other key path is base's.
 */
const isExceptedPath = (path: string) => /\.(agent_statuses|agent_input_states|taskExecutions|closed_task_executions|remote_task_executions)(\.|\[|$)/.test(path);
/** autobyteus-500 (FU-006, naming N2): base's `execution_tree.host` is the run's own agent, now named `execution_tree.agent`. */
const renamedFromBase = (path: string) => path.replace(/\.execution_tree\.host(?=\.|$)/, ".execution_tree.agent");
const same = (actual: unknown, expected: unknown) =>
  expect([...new Set(pathsOf(actual).filter((path) => !isExceptedPath(path)))].sort())
    .toEqual([...new Set(pathsOf(expected).filter((path) => !isExceptedPath(path)).map(renamedFromBase))].sort());

const agent = { address: "/research_assistant" as never, agentRunId: "agent-run", agentDefinitionId: "research-assistant" };

describe("an agent run's view in base's shapes (rule 3)", () => {
  it("the snapshot: its own parts", () => {
    const snapshot = projectAgentCollaborationView({ agentRunId: "agent-run", isActive: true, baseChangeSequence: 0, liveSequenceId: "live", lastMessageChangeSequence: 0,
      snapshot: { agent, createdAt: "2026-11-01T00:00:00.000Z" } });
    same(snapshot, base.snapshot);
  });

});
