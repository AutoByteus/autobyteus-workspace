/**
 * The secret suggestion rule against the shared vectors (`test-support/fixtures/mcp-secret-suggestion-vectors.json`),
 * which the web matcher is tested against too, so both match the same way. Dummy values only.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { McpSecretField } from "autobyteus-ts/tools/mcp/types.js";
import { McpSecretSuggestionRule } from "../../../../src/mcp-server-management/services/mcp-secret-suggestion-rule.js";

type Vector = { field: McpSecretField; value: string; expected: string | null };
const { rule, vectors } = JSON.parse(
  fs.readFileSync(new URL("../../../../../test-support/fixtures/mcp-secret-suggestion-vectors.json", import.meta.url), "utf8"),
) as { rule: unknown; vectors: Vector[] };

describe("McpSecretSuggestionRule", () => {
  it.each(vectors.map((vector) => [vector.field, vector.value, vector.expected] as const))(
    "%s = %j → %s", (field, value, expected) => {
      expect(McpSecretSuggestionRule.match(field, value)).toBe(expected);
    });

  it("treats the token and an Authorization header in any case as always secret, and nothing else", () => {
    expect(McpSecretSuggestionRule.isAlwaysSecret("token")).toBe(true);
    expect(McpSecretSuggestionRule.isAlwaysSecret("header:AUTHORIZATION")).toBe(true);
    expect(McpSecretSuggestionRule.isAlwaysSecret("env:Authorization")).toBe(false);
    expect(McpSecretSuggestionRule.isAlwaysSecret("header:X-Api-Key")).toBe(false);
  });

  it("publishes exactly the rule in the shared vectors (the approved keywords, prefixes and always-secret fields)", () => {
    expect(McpSecretSuggestionRule.data).toEqual(rule);
    expect(McpSecretSuggestionRule.data).toEqual({
      nameKeywords: ["KEY", "TOKEN", "SECRET", "PASSWORD", "PASS", "CREDENTIAL", "AUTH"],
      valuePrefixes: ["github_pat_", "ghp_", "sk-", "xoxb-", "glpat-", "ATATT", "AKIA"],
      alwaysSecretFields: ["token", "header:Authorization"],
    });
  });
});
