import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Server E2E files reach their test-owned node only along paths that carry its secret (node access model NA-1, NA-12;
 * TESTING.md, Node credentials). Two shapes that do not are visible in the source text:
 * - rule 1: a node composed with `buildStudioServer(` outside `startStudioE2eRuntimeServer`: its port is never
 *   registered with the credential attachment, so its requests carry no owner credential;
 * - rule 2: a `StreamableHTTPClientTransport(` to the MCP gateway outside `connectMcpGatewayClient`: the gateway needs
 *   its own token, which the owner-credential attachment does not add.
 * Each finding names the file and line, the cause and the helper to use. A raw `fastify.inject` without a header and a
 * spawned node without its launch credential are not detected here (deliberate refusal tests use the same shapes).
 */

const THIS_FILE = fileURLToPath(import.meta.url);
const SERVER_ROOT = resolve(dirname(THIS_FILE), "../..");
const E2E = join(SERVER_ROOT, "tests", "e2e");
const IN_PROCESS_START_HELPER = "tests/e2e/helpers/studio-runtime-test-server.ts";
const GATEWAY_CLIENT_HELPER = "tests/e2e/helpers/mcp-gateway-client.ts";

type Finding = Readonly<{ file: string; line: number; message: string }>;

const listFiles = (root: string): string[] => readdirSync(root).flatMap((name) => {
  const path = join(root, name);
  return statSync(path).isDirectory() ? listFiles(path) : [path];
});

const lineOf = (text: string, index: number): number => text.slice(0, index).split("\n").length;

/** The text from `openIndex` (an opening parenthesis) up to its matching closing one. */
const parenthesized = (text: string, openIndex: number): string => {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === "(") depth += 1;
    else if (text[index] === ")" && --depth === 0) return text.slice(openIndex, index + 1);
  }
  return text.slice(openIndex);
};

/** Rule 1: `buildStudioServer(` outside the in-process start helper. */
const findDirectStudioComposition = (file: string, text: string): Finding[] => {
  if (file === IN_PROCESS_START_HELPER) return [];
  return [...text.matchAll(/\bbuildStudioServer\s*\(/g)].map((match) => ({
    file,
    line: lineOf(text, match.index),
    message: `${file}:${lineOf(text, match.index)} composes a node with buildStudioServer: its requests carry no owner `
      + `credential. Start it with startStudioE2eRuntimeServer (${IN_PROCESS_START_HELPER}); see TESTING.md, Node credentials.`,
  }));
};

/** Rule 2: a Streamable HTTP transport to `/mcp/gateway` outside the gateway client helper. */
const findBareGatewayTransport = (file: string, text: string): Finding[] => {
  if (file === GATEWAY_CLIENT_HELPER) return [];
  return [...text.matchAll(/\bStreamableHTTPClientTransport\s*\(/g)]
    .filter((match) => parenthesized(text, match.index + match[0].length - 1).includes("mcp/gateway"))
    .map((match) => ({
      file,
      line: lineOf(text, match.index),
      message: `${file}:${lineOf(text, match.index)} opens the MCP gateway with its own StreamableHTTPClientTransport: `
        + `the gateway needs its token, not the owner credential. Connect with connectMcpGatewayClient `
        + `(${GATEWAY_CLIENT_HELPER}); see TESTING.md, Node credentials.`,
    }));
};

const e2eSources = () => listFiles(E2E)
  .filter((path) => path.endsWith(".ts"))
  .map((path) => ({ file: relative(SERVER_ROOT, path), text: readFileSync(path, "utf8") }));

describe("server E2E node credential paths", () => {
  it("composes in-process nodes only through startStudioE2eRuntimeServer", () => {
    const findings = e2eSources().flatMap(({ file, text }) => findDirectStudioComposition(file, text));
    expect(findings.map((finding) => finding.message)).toEqual([]);
  });

  it("opens the MCP gateway only through connectMcpGatewayClient", () => {
    const findings = e2eSources().flatMap(({ file, text }) => findBareGatewayTransport(file, text));
    expect(findings.map((finding) => finding.message)).toEqual([]);
  });

  it("flags a directly composed node, naming the file, the cause and the helper", () => {
    const sample = [
      "beforeAll(async () => {",
      "  const studio = await buildStudioServer({ appConfig, loggingConfig });",
      "});",
    ].join("\n");
    const findings = findDirectStudioComposition("tests/e2e/x.e2e.test.ts", sample);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.line).toBe(2);
    expect(findings[0]!.message).toContain("tests/e2e/x.e2e.test.ts:2");
    expect(findings[0]!.message).toContain("no owner credential");
    expect(findings[0]!.message).toContain("startStudioE2eRuntimeServer");
  });

  it("flags a gateway transport without the helper across lines, and leaves other MCP transports alone", () => {
    const sample = [
      "await client.connect(new StreamableHTTPClientTransport(",
      "  new URL(`${serverUrl}/mcp/gateway`),",
      "));",
      "await other.connect(new StreamableHTTPClientTransport(new URL(server.serverUrl), { requestInit }));",
    ].join("\n");
    const findings = findBareGatewayTransport("tests/e2e/y.e2e.test.ts", sample);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.line).toBe(1);
    expect(findings[0]!.message).toContain("tests/e2e/y.e2e.test.ts:1");
    expect(findings[0]!.message).toContain("needs its token");
    expect(findings[0]!.message).toContain("connectMcpGatewayClient");
  });
});
