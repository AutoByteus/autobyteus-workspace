import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templatePath = (templateDirName: string): string => fileURLToPath(
  new URL(`../../../src/built-in-agents/templates/${templateDirName}/agent.md`, import.meta.url),
);

describe("built-in agent templates", () => {
  it("keeps Memory Compactor behavior, category, preservation/drop, and manual-test guidance", async () => {
    const content = await fs.readFile(templatePath("memory-compactor"), "utf-8");

    expect(content).toContain("name: Memory Compactor");
    expect(content).toContain("description: Summarizes earlier work so the same agent can continue later.");
    expect(content).toContain("You summarize earlier work so the same agent can continue later without rereading the full history.");
    expect(content).toContain("Keep the information that would let someone resume safely");
    expect(content).toContain("Omit chatter, repeated status updates, and details that will not help future continuation.");
    expect(content).toContain("When manually given pasted history, infer the same fields from the content.");
    expect(content).not.toContain("AutoByteus Memory Compactor");
    expect(content).not.toContain("AutoByteus conversation");
    expect(content).not.toContain("[SETTLED_BLOCKS]");
    expect(content).not.toMatch(/\bsettled\b/i);
    expect(content).not.toContain("output " + "contract");
    expect(content).not.toContain("parser-compatible");
    expect(content).not.toContain("raw trace");
    expect(content).not.toContain("block id");
    expect(content).not.toContain("turn id");
    expect(content).not.toContain("source event");

    for (const category of [
      "episodic_summary",
      "critical_issues",
      "unresolved_work",
      "durable_facts",
      "user_preferences",
      "important_artifacts",
    ]) {
      expect(content).toContain(category);
    }

    expect(content).toContain("decisions and rationale");
    expect(content).toContain("validation results");
    expect(content).toContain("repeated status updates");
    expect(content).toContain("The final answer must be exactly one JSON object");
    expect(content).toContain("Do not invent facts");
    expect(content).not.toContain('"tags"');
    expect(content).not.toContain("tags:");
    expect(content).not.toContain('"reference"');
    expect(content).not.toContain("reference:");
  });
});
