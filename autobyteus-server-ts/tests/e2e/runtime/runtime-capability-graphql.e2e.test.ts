import "reflect-metadata";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { createFakeGrokCommand, overrideEnv, type FakeGrokCommand } from "../helpers/grok-fake-cli.js";

type RuntimeCapability = { runtimeKind: string; enabled: boolean; reason: string | null };

// Every query probes the host's real runtime CLIs in parallel; Antigravity's catalog probe
// alone can take several seconds, so the default 5 s test timeout is too tight.
const CAPABILITY_QUERY_TIMEOUT_MS = 60_000;

describe("Runtime capability GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let fakeGrok: FakeGrokCommand;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
    fakeGrok = await createFakeGrokCommand();
  });

  afterAll(async () => {
    if (fakeGrok) await fs.rm(fakeGrok.dir, { recursive: true, force: true });
  });

  const queryCapabilities = async (): Promise<RuntimeCapability[]> => {
    const result = await graphql({
      schema,
      source: `
        query RuntimeCapabilities {
          runtimeAvailabilities {
            runtimeKind
            enabled
            reason
          }
        }
      `,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    const capabilities = (result.data as any)?.runtimeAvailabilities as RuntimeCapability[];
    expect(Array.isArray(capabilities)).toBe(true);
    return capabilities;
  };

  const grokRowWith = async (env: Record<string, string | undefined>): Promise<RuntimeCapability | undefined> => {
    const restore = overrideEnv(env);
    try {
      return (await queryCapabilities()).find((capability) => capability.runtimeKind === "grok_build");
    } finally {
      restore();
    }
  };

  it("returns backend-owned runtime capability metadata for all five runtime kinds", async () => {
    const capabilities = await queryCapabilities();
    expect(capabilities.map((capability) => capability.runtimeKind).sort()).toEqual([
      "antigravity_cli",
      "autobyteus",
      "claude_agent_sdk",
      "codex_app_server",
      "grok_build",
    ]);
  }, CAPABILITY_QUERY_TIMEOUT_MS);

  it("enables grok_build with no reason when a supported Grok CLI answers the bounded probe (AC-001)", async () => {
    expect(await grokRowWith({ GROK_BUILD_COMMAND: fakeGrok.command, FAKE_GROK_VERSION: undefined }))
      .toEqual({ runtimeKind: "grok_build", enabled: true, reason: null });
  }, CAPABILITY_QUERY_TIMEOUT_MS);

  it("disables grok_build with a safe classified reason when the Grok command is missing (AC-001, QR-001)", async () => {
    const missingCommand = path.join(fakeGrok.dir, "no-such-grok");
    const row = await grokRowWith({ GROK_BUILD_COMMAND: missingCommand });
    expect(row).toEqual({
      runtimeKind: "grok_build",
      enabled: false,
      reason: "Grok CLI is unavailable; install it or set GROK_BUILD_COMMAND and retry.",
    });
    expect(row?.reason).not.toContain(fakeGrok.dir);
  }, CAPABILITY_QUERY_TIMEOUT_MS);

  it("disables grok_build as unsupported below the minimum Grok CLI version (AC-001)", async () => {
    expect(await grokRowWith({ GROK_BUILD_COMMAND: fakeGrok.command, FAKE_GROK_VERSION: "1.0.40" })).toEqual({
      runtimeKind: "grok_build",
      enabled: false,
      reason: "Grok CLI version or agent mode is unsupported; update to 1.0.41 or later and retry.",
    });
  }, CAPABILITY_QUERY_TIMEOUT_MS);
});
