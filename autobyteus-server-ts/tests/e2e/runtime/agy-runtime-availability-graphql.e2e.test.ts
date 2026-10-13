/**
 * Antigravity CLI availability through the GraphQL schema (ticket agy-docker-node-availability-diagnostics).
 *
 * Purpose: prove that a signed-out `agy` reaches API clients as the fixed "not signed in" reason
 * (never the CLI's own output), that a non-sign-in failure keeps the generic reason, and that once
 * the CLI is signed in the same server reports Antigravity enabled and lists its models without a
 * restart (the server half of "sign in, then reopen the menu").
 *
 * Prerequisites: none. A scripted `agy` (written to a temp dir) stands in for the real CLI; its
 * state file switches it between signed-out, network-failure and signed-in. It reproduces agy
 * 1.3.3's real outputs. No provider calls, no credentials.
 *
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { overrideEnv } from "../helpers/grok-fake-cli.js";

const SIGN_IN_REASON =
  "Not signed in on this node. Run `agy` to sign in.";
const GENERIC_FAILURE_REASON = "Antigravity model discovery failed; check authentication or network and retry.";
const QUERY_TIMEOUT_MS = 30_000;

// agy 1.3.3 outputs (investigation R-03/R-07), plus a secret-looking string that must never surface.
const FAKE_AGY = `#!/usr/bin/env node
const fs = require("node:fs");
const state = fs.readFileSync(process.env.AGY_E2E_STATE_FILE, "utf8").trim();
const arg = process.argv[2];
if (arg === "--version") process.stdout.write("1.3.3\\n");
else if (arg === "--help") process.stdout.write("--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\\n");
else if (arg === "models") {
  if (state === "signed-out") {
    process.stderr.write("Error: Please sign in to view available models. Launch the CLI without arguments to sign in. token=abc /private/credential-path\\n");
    process.exitCode = 1;
  } else if (state === "network-failure") {
    process.stderr.write('Error: Eligibility check failed: Post "https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist": proxyconnect tcp: dial tcp 127.0.0.1:9: connect: connection refused\\n');
    process.exitCode = 1;
  } else process.stdout.write("gemini-3-pro\\tGemini 3 Pro\\ngemini-3-flash\\tGemini 3 Flash\\n");
}
`;

describe("Antigravity CLI availability GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let dir: string;
  let stateFile: string;
  let restoreEnv: () => void;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-availability-e2e-"));
    const command = path.join(dir, "agy");
    stateFile = path.join(dir, "state");
    await fs.writeFile(command, FAKE_AGY, { mode: 0o755 });
    await fs.writeFile(stateFile, "signed-out");
    // The AGY command is resolved when its module loads, so set it before building the schema.
    restoreEnv = overrideEnv({ ANTIGRAVITY_CLI_COMMAND: command, AGY_E2E_STATE_FILE: stateFile });
    const { buildGraphqlSchema } = await import("../../../src/api/graphql/schema.js");
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlModule = await import(require.resolve("graphql", { paths: [typeGraphqlRoot] }));
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    restoreEnv?.();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  const setState = (state: "signed-out" | "network-failure" | "signed-in") => fs.writeFile(stateFile, state);

  const antigravityAvailability = async () => {
    const result = await graphql({
      schema,
      source: `query RuntimeAvailability($runtimeKind: String!) {
        runtimeAvailability(runtimeKind: $runtimeKind) { runtimeKind enabled reason }
      }`,
      variableValues: { runtimeKind: "antigravity_cli" },
    });
    expect(result.errors).toBeUndefined();
    return (result.data as any).runtimeAvailability as { runtimeKind: string; enabled: boolean; reason: string | null };
  };

  const antigravityCatalog = () => graphql({
    schema,
    source: `query Catalog($runtimeKind: String) {
      providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
    }`,
    variableValues: { runtimeKind: "antigravity_cli" },
  });

  it("reports a signed-out CLI as not signed in, with the recovery step and no CLI output (AC-001, QR-001)", async () => {
    await setState("signed-out");
    const row = await antigravityAvailability();
    expect(row).toEqual({ runtimeKind: "antigravity_cli", enabled: false, reason: SIGN_IN_REASON });
    expect(row.reason).not.toMatch(/token=abc|credential-path|view available models|Launch the CLI|agy-availability-e2e/);
  }, QUERY_TIMEOUT_MS);

  it("keeps the generic reason for a failure without sign-in wording (AC-001 alternate)", async () => {
    await setState("network-failure");
    const row = await antigravityAvailability();
    expect(row).toEqual({ runtimeKind: "antigravity_cli", enabled: false, reason: GENERIC_FAILURE_REASON });
    expect(row.reason).not.toMatch(/Eligibility|proxyconnect|googleapis/);
  }, QUERY_TIMEOUT_MS);

  it("reports the CLI enabled with its models once signed in, without a server restart (AC-004 server half)", async () => {
    await setState("signed-out");
    expect((await antigravityAvailability()).enabled).toBe(false);
    const signedOutCatalog = await antigravityCatalog();
    expect(signedOutCatalog.errors?.[0]?.message).toBe(SIGN_IN_REASON);

    await setState("signed-in");
    expect(await antigravityAvailability()).toEqual({ runtimeKind: "antigravity_cli", enabled: true, reason: null });
    const catalog = await antigravityCatalog();
    expect(catalog.errors).toBeUndefined();
    const identifiers = ((catalog.data as any).providerModelCatalogSnapshots as Array<{ llmModels: Array<{ modelIdentifier: string }> }>)
      .flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
    expect(identifiers).toEqual(expect.arrayContaining(["gemini-3-pro", "gemini-3-flash"]));
  }, QUERY_TIMEOUT_MS);
});
