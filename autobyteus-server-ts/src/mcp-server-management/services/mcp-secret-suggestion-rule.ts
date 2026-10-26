import type { McpSecretField } from "autobyteus-ts/tools/mcp/types.js";

/** Why a value is treated as secret: an always-secret field, a name keyword, or a well-known value prefix. */
export type McpSecretMatch = "ALWAYS_SECRET" | "NAME" | "VALUE_PREFIX";

/** The rule's data, as the web reads it (`mcpSecretSuggestionRule`). */
export type McpSecretSuggestionRuleData = Readonly<{
  nameKeywords: readonly string[];
  valuePrefixes: readonly string[];
  alwaysSecretFields: readonly McpSecretField[];
}>;

/**
 * The secret suggestion rule (MDEC-001): which MCP values are pre-locked and offered for the move.
 *
 * - The HTTP `token` and an `Authorization` header (any case) are always secret.
 * - An env or header name that contains one of the keywords (any case) is suggested.
 * - A value that starts with one of the well-known token prefixes (exact case) is suggested.
 *
 * It is a suggestion only: the user can lock or unlock any other row. The web never defines it; it reads it.
 */
export class McpSecretSuggestionRule {
  static readonly data: McpSecretSuggestionRuleData = Object.freeze({
    nameKeywords: Object.freeze(["KEY", "TOKEN", "SECRET", "PASSWORD", "PASS", "CREDENTIAL", "AUTH"]),
    valuePrefixes: Object.freeze(["github_pat_", "ghp_", "sk-", "xoxb-", "glpat-", "ATATT", "AKIA"]),
    alwaysSecretFields: Object.freeze<McpSecretField[]>(["token", "header:Authorization"]),
  });

  static isAlwaysSecret(field: McpSecretField): boolean {
    return field === "token" || field.toLowerCase() === "header:authorization";
  }

  /** Why `field` with `value` is treated as secret, or `null` when the rule does not suggest it. */
  static match(field: McpSecretField, value: string): McpSecretMatch | null {
    if (McpSecretSuggestionRule.isAlwaysSecret(field)) return "ALWAYS_SECRET";
    const name = field.slice(field.indexOf(":") + 1).toUpperCase();
    if (McpSecretSuggestionRule.data.nameKeywords.some((keyword) => name.includes(keyword))) return "NAME";
    const trimmed = value.trim();
    if (McpSecretSuggestionRule.data.valuePrefixes.some((prefix) => trimmed.startsWith(prefix))) return "VALUE_PREFIX";
    return null;
  }
}
