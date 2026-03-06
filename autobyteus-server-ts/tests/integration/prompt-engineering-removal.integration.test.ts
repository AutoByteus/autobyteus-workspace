import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("prompt-engineering removal integration", () => {
  it("keeps server prompt-engineering module and prompt-mapping providers removed", () => {
    const root = process.cwd();

    const removedPaths = [
      "src/prompt-engineering",
      "src/agent-definition/providers/file-agent-prompt-mapping-provider.ts",
      "src/agent-definition/providers/agent-prompt-mapping-persistence-provider.ts",
      "src/agent-definition/providers/mapping-persistence-provider-registry.ts",
      "src/api/graphql/types/prompt.ts",
    ];

    for (const relPath of removedPaths) {
      expect(existsSync(path.join(root, relPath))).toBe(false);
    }
  });
});
