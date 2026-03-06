import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("prompt-engineering frontend removal integration", () => {
  it("keeps prompt-engineering components, stores, docs, and route files removed", () => {
    const root = process.cwd();

    const removedPaths = [
      "components/promptEngineering/CreatePromptView.vue",
      "components/promptEngineering/PromptCard.vue",
      "components/promptEngineering/PromptDetails.vue",
      "components/promptEngineering/PromptCompare.vue",
      "components/promptEngineering/DraftsList.vue",
      "components/promptEngineering/PromptMarketplace.vue",
      "components/promptEngineering/CanonicalModelSelector.vue",
      "components/promptEngineering/CreatableCategorySelect.vue",
      "stores/promptStore.ts",
      "stores/promptEngineeringViewStore.ts",
      "graphql/mutations/prompt_mutations.ts",
      "graphql/queries/prompt_queries.ts",
      "pages/prompt-engineering.vue",
    ];

    for (const relPath of removedPaths) {
      expect(existsSync(path.join(root, relPath))).toBe(false);
    }
  });
});
