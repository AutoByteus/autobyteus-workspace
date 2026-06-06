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
    expect(content).toContain("pause, preserve the important parts of its current mental workspace");
    expect(content).toContain("continue the same work from the preserved summary");
    expect(content).toContain("manual testing");
    expect(content).toContain("Manual test guidance");
    expect(content).toContain("In normal context-refresh tasks");
    expect(content).toContain("[CONVERSATION_HISTORY_TO_SUMMARIZE]");
    expect(content).toContain("If the task supplies a required JSON shape, that requested shape is the authority");
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

    expect(content).toContain("Preserve:");
    expect(content).toContain("decisions and rationale");
    expect(content).toContain("validation evidence");
    expect(content).toContain("Drop or compress:");
    expect(content).toContain("transient progress/status messages");
    expect(content).toContain("Make the final answer exactly one JSON object");
    expect(content).toContain("Do not invent facts");
    expect(content).not.toContain('"tags"');
    expect(content).not.toContain("tags:");
    expect(content).not.toContain('"reference"');
    expect(content).not.toContain("reference:");
  });
});
