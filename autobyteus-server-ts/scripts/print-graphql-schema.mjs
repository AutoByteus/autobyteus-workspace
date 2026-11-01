#!/usr/bin/env node
// Writes the SDL of the server's GraphQL schema, built in-process from the BUILT server (dist), to a file.
// Usage: node scripts/print-graphql-schema.mjs <outFile>
// Used by `pnpm -C autobyteus-web codegen:local` / `codegen:check`, which build the server first (a stale dist would print a
// stale schema). No running app and no user data: the process runs with a temporary HOME and data folder that are removed
// afterwards, and the SDL goes to the file only (libraries that log on import write to stderr).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const outFile = process.argv[2];
if (!outFile) {
  console.error("Usage: node scripts/print-graphql-schema.mjs <outFile>");
  process.exit(2);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "print-graphql-schema-"));
process.env.HOME = scratch;
process.env.USERPROFILE = scratch;
process.env.AUTOBYTEUS_DATA_DIR = path.join(scratch, "data");
console.log = (...args) => console.error(...args);
console.info = (...args) => console.error(...args);

try {
  await import("reflect-metadata");
  const { printSchema } = await import("graphql");
  const schemaModule = path.resolve(import.meta.dirname, "..", "dist", "api", "graphql", "schema.js");
  if (!fs.existsSync(schemaModule)) {
    throw new Error(`${schemaModule} not found: build the server first (pnpm -C autobyteus-server-ts build).`);
  }
  const { buildGraphqlSchema } = await import(schemaModule);
  fs.writeFileSync(outFile, `${printSchema(await buildGraphqlSchema())}\n`, "utf8");
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
process.exit(0);
