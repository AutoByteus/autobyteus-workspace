import "reflect-metadata";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { printSchema as printSchemaFn } from "graphql";
import { afterAll, describe, expect, it } from "vitest";
import { buildGraphqlSchema } from "../../src/api/graphql/schema.js";

/**
 * autobyteus-345 (REQ-007, AC-009): `autobyteus-web/generated/graphql.ts` equals what the web codegen prints for the CURRENT
 * server schema. The routine runner of `pnpm -C autobyteus-web codegen:check`: the schema is built from source in this process
 * (never from `dist`, so a stale build cannot give a false pass), written to a temporary file and handed to the web check,
 * which generates into a temporary file and compares bytes. A schema with one more type must fail the same check.
 * To fix a failure: `pnpm -C autobyteus-web codegen:local`. No running app, no user data.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CODEGEN = join(ROOT, "autobyteus-web", "scripts", "codegen-local.mjs");
/** The `graphql` module type-graphql built the schema with (vitest would otherwise load a second copy of it). */
const loadPrintSchema = async (): Promise<typeof printSchemaFn> => {
  const require = createRequire(import.meta.url);
  const typeGraphqlRoot = dirname(require.resolve("type-graphql"));
  return (await import(require.resolve("graphql", { paths: [typeGraphqlRoot] }))).printSchema;
};
const scratch = mkdtempSync(join(tmpdir(), "web-generated-graphql-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const check = (schemaFile: string) => spawnSync(process.execPath, [CODEGEN, "--check", "--schema-file", schemaFile], {
  cwd: join(ROOT, "autobyteus-web"),
  encoding: "utf8",
  env: { PATH: process.env.PATH ?? "", HOME: scratch, TMPDIR: scratch },
});

describe("autobyteus-web/generated/graphql.ts", () => {
  it("equals the web codegen output for the current server schema, and the check fails on a changed schema", async () => {
    const sdl = (await loadPrintSchema())(await buildGraphqlSchema());
    const current = join(scratch, "current.graphql");
    writeFileSync(current, `${sdl}\n`);
    const passed = check(current);
    expect(passed.status, `${passed.stdout}\n${passed.stderr}`).toBe(0);

    const changed = join(scratch, "changed.graphql");
    writeFileSync(changed, `${sdl}\n\ntype GeneratedGraphqlMutationProbe {\n  id: ID!\n}\n`);
    const failed = check(changed);
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain("out of date");
  }, 180_000);
});
