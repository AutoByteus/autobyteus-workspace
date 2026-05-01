import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const agentMdPath = fileURLToPath(
  new URL(
    "../../../../src/agent-execution/compaction/default-compactor-agent/agent.md",
    import.meta.url,
  ),
);

describe("default compactor agent template", () => {
  it("contains stable behavior, category, preservation/drop, and manual-test guidance", async () => {
    const content = await fs.readFile(agentMdPath, "utf-8");

    expect(content).toContain("Manual testing");
    expect(content).toContain("Automated compaction tasks");
    expect(content).toContain("When an automated task supplies an exact output contract, that contract wins");

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
    expect(content).toContain("Return JSON only");
    expect(content).toContain("Do not invent facts");
    expect(content).not.toContain('"tags"');
    expect(content).not.toContain("tags:");
    expect(content).not.toContain('"reference"');
    expect(content).not.toContain("reference:");
  });
});
