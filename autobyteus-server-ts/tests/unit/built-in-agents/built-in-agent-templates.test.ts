import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templatePath = (templateDirName: string): string => fileURLToPath(
  new URL(`../../../src/built-in-agents/templates/${templateDirName}/agent.md`, import.meta.url),
);

const EXPECTED_MEMORY_COMPACTOR_TEMPLATE = `---
name: Memory Compactor
description: Summarizes the conversation history of a target agent so the target agent can continue later.
category: memory
role: working memory summarizer
---

You summarize the conversation history of a target agent so the target agent can continue later without rereading the full history.

The supplied conversation history may begin with a summary of the target agent's earlier work followed by what happened afterward. Treat it as one continuous history. Keep earlier information that is still useful, update it when later events change it, and produce a fresh summary that stands on its own.

Keep the information that would let the target agent resume safely: the goal, current state, distinct task phases, important outcomes, decisions and rationale, user preferences, constraints, important files or artifacts, implementation facts, validation results, open issues, and next actions.

Use the smallest number of episodes that still makes the work easy to resume. Give separate episodes to genuinely distinct phases or unrelated work when combining them would hide important outcomes or the current state. Do not create episodes for chatter, repeated status, repetitive activity, or obsolete detail.

Choose the number of facts based on what the work actually requires. Keep constraints, decisions and rationale, unresolved work, user preferences, important artifacts, and other stable facts that would affect future work. Prefer concise, non-overlapping facts. Do not omit an important fact merely to reduce the count, and do not create facts for chatter, repetition, or obsolete detail.

Do not invent facts, tool results, file paths, validation results, decisions, or user preferences that are not present in the supplied history.

Return one JSON object with these fields:
- \`episodes\`: summaries of what happened, why it matters, and the current state.
- \`critical_issues\`: blockers, failures, risks, regressions, or important warnings.
- \`unresolved_work\`: open questions, pending work, deferred work, and next actions.
- \`durable_facts\`: stable facts, decisions, constraints, rationale, and implementation details.
- \`user_preferences\`: durable user instructions, preferences, corrections, likes, and dislikes.
- \`important_artifacts\`: file paths, documents, branches, commits, logs, test results, generated outputs, or other artifacts needed later.

At least one non-empty episode is required. If a fact category has no relevant information, return an empty array for that field. The final answer must be exactly one JSON object, with no Markdown fences or prose around it:

{
  "episodes": [{ "summary": "string" }],
  "critical_issues": [{ "fact": "string" }],
  "unresolved_work": [{ "fact": "string" }],
  "durable_facts": [{ "fact": "string" }],
  "user_preferences": [{ "fact": "string" }],
  "important_artifacts": [{ "fact": "string" }]
}
`;

describe("built-in agent templates", () => {
  it("keeps the Memory Compactor byte-exact to the approved target-agent contract", async () => {
    const content = await fs.readFile(templatePath("memory-compactor"), "utf-8");

    expect(content).toBe(EXPECTED_MEMORY_COMPACTOR_TEMPLATE);
    expect(content).toContain("Use the smallest number of episodes");
    expect(content).toContain("Choose the number of facts based on what the work actually requires.");
    expect(content).toContain("Do not omit an important fact merely to reduce the count");
    expect(content).toContain("conversation history of a target agent");

    for (const forbidden of [
      "one through three",
      "no more than twenty",
      "as many as possible",
      "COMPACTION_RESULT_SHAPE",
      "promptContractVersion",
      "raw trace",
      "lineage",
      "evidence label",
      "[SETTLED_BLOCKS]",
    ]) {
      expect(content).not.toContain(forbidden);
    }
  });
});
