import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("md-centric GraphQL document contracts", () => {
  const root = process.cwd();

  it("keeps agent and team GraphQL documents on instructions/category fields only", () => {
    const docs = [
      "graphql/queries/agentDefinitionQueries.ts",
      "graphql/mutations/agentDefinitionMutations.ts",
      "graphql/queries/agentTeamDefinitionQueries.ts",
      "graphql/mutations/agentTeamDefinitionMutations.ts",
    ];

    for (const relPath of docs) {
      const content = readFileSync(path.join(root, relPath), "utf-8");
      expect(content).toContain("instructions");
      expect(content).toContain("category");
      expect(content).not.toContain("activePromptVersion");
    }
  });

  it("keeps prompt GraphQL document files removed", () => {
    const removed = [
      "graphql/queries/prompt_queries.ts",
      "graphql/mutations/prompt_mutations.ts",
    ];

    for (const relPath of removed) {
      expect(existsSync(path.join(root, relPath))).toBe(false);
    }
  });
});
