import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * One owner of platform agent tool result text (autobyteus-260, AC-002): every platform tool adapter, on the
 * native and the MCP route, turns its result into text with `toToolResultJson` (`autobyteus-ts/tools/tool-result-json.ts`)
 * or builds a structured MCP result with `toAgentToolsMcpStructuredJsonResult`, which applies the same rule.
 *
 * The rule, by source scan of `src/agent-tools/**` and `send-message-to-tool-result-contract.ts`:
 * (a) nothing imports or names the removed serializers (`json-utils`, `toJsonString`, `toBrowserJsonString`,
 *     `toTaskDelegationJsonString`, `toMediaJsonString`);
 * (b) no `JSON.stringify(` outside the allow-list below, each entry with the reason it is not a tool result;
 * (c) no `structuredContent:` literal (or `{ structuredContent }` shorthand) outside the MCP structured helper and the
 *     allow-listed pass-through files.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../src");
const SCANNED_ROOTS = ["agent-tools"];
const SCANNED_FILES = ["agent-communication/services/send-message-to-tool-result-contract.ts"];

/** Files whose `JSON.stringify(` is not a platform tool result, with the reason. */
const JSON_STRINGIFY_ALLOWED: Record<string, string> = {
  "agent-tools/browser/browser-bridge-client.ts": "the HTTP request body sent to the browser bridge, not a tool result",
  "agent-tools/mcp/agent-tools-mcp-routes.ts": "the Agent Tools MCP HTTP response body (the JSON-RPC envelope), not a tool result",
  "agent-tools/mcp/agent-tools-mcp-schema-mapper.ts": "a JSON clone of an input/output schema",
  "agent-tools/mcp/agent-tools-mcp-result-mapper.ts": "a JSON clone fallback when structuredClone fails; the result was already made",
};
/** Folders whose results are third-party tool results, which pass through unchanged (out of scope). */
const PASS_THROUGH_FOLDERS = ["agent-tools/mcp/configured-mcp/"];
/** Files allowed a `structuredContent:` literal, with the reason. */
const STRUCTURED_CONTENT_ALLOWED: Record<string, string> = {
  "agent-tools/mcp/agent-tools-mcp-structured-json-result.ts": "the MCP structured helper itself, which applies the rule",
  "agent-tools/mcp/application-agent-tool-mcp-adapter.ts": "application-defined tool results, which pass through unchanged (out of scope)",
};
const STRUCTURED_CONTENT_LITERAL = /\bstructuredContent\s*:|[{,]\s*structuredContent\s*[,}]/;
const REMOVED_SERIALIZERS = /\b(?:toJsonString|toBrowserJsonString|toTaskDelegationJsonString|toMediaJsonString)\b|json-utils(?:\.js)?["']/;

const listTsFiles = (root: string): string[] => readdirSync(root).flatMap((name) => {
  const path = join(root, name);
  if (statSync(path).isDirectory()) return listTsFiles(path);
  return path.endsWith(".ts") ? [path] : [];
});
const keyOf = (path: string): string => relative(SRC, path).split(sep).join("/");
const scannedFiles = (): string[] => [
  ...SCANNED_ROOTS.flatMap((root) => listTsFiles(join(SRC, root))),
  ...SCANNED_FILES.map((file) => join(SRC, file)),
].map(keyOf).filter((key) => !PASS_THROUGH_FOLDERS.some((folder) => key.startsWith(folder)));
const read = (key: string): string => readFileSync(join(SRC, key), "utf8");
const linesMatching = (pattern: RegExp, allowed: Record<string, string>): string[] =>
  scannedFiles().filter((key) => !Object.hasOwn(allowed, key)).flatMap((key) =>
    read(key).split("\n").flatMap((line, index) => pattern.test(line) ? [`${key}:${index + 1}: ${line.trim()}`] : []));

describe("agent tool result boundaries (one result rule)", () => {
  it("scans the platform tool adapters", () => {
    expect(scannedFiles()).toContain("agent-tools/project-tasks/project-task-native-tools.ts");
    expect(scannedFiles()).toContain("agent-communication/services/send-message-to-tool-result-contract.ts");
  });

  it("has no removed serializer left", () => {
    expect(linesMatching(REMOVED_SERIALIZERS, {})).toEqual([]);
  });

  it("serializes no tool result with JSON.stringify outside the allow-list", () => {
    expect(linesMatching(/JSON\.stringify\(/, JSON_STRINGIFY_ALLOWED)).toEqual([]);
  });

  it("builds structuredContent only in the MCP structured helper", () => {
    expect(linesMatching(STRUCTURED_CONTENT_LITERAL, STRUCTURED_CONTENT_ALLOWED)).toEqual([]);
  });

  it("keeps each allow-list entry needed (no stale entry)", () => {
    const stale = [
      ...Object.keys(JSON_STRINGIFY_ALLOWED).filter((key) => !/JSON\.stringify\(/.test(read(key))),
      ...Object.keys(STRUCTURED_CONTENT_ALLOWED).filter((key) => !STRUCTURED_CONTENT_LITERAL.test(read(key))),
    ];
    expect(stale).toEqual([]);
  });
});
