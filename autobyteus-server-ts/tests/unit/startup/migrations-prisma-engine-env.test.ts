import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildPrismaCommandEnv, resolvePrismaEnginePair } from "../../../src/startup/migrations.js";

function getQueryEngineFileName(): string {
  if (process.platform === "win32") return "libquery_engine-windows.dll.node";
  if (process.platform === "darwin") return "libquery_engine-darwin-arm64.dylib.node";
  return "libquery_engine-debian-openssl-3.0.x.so.node";
}

function getSchemaEngineFileName(): string {
  if (process.platform === "win32") return "schema-engine-windows.exe";
  if (process.platform === "darwin") return "schema-engine-darwin-arm64";
  return "schema-engine-debian-openssl-3.0.x";
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const tempDirs: string[] = [];

function trackTempDir(dir: string): string {
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Prisma migration engine env resolution", () => {
  it("prefers bundled prisma engines when available", () => {
    const appRoot = trackTempDir(makeTempDir("ab-migrations-app-root-"));
    const engineDir = path.join(
      appRoot,
      "node_modules",
      ".pnpm",
      "@prisma+engines@5.22.0",
      "node_modules",
      "@prisma",
      "engines",
    );
    fs.mkdirSync(engineDir, { recursive: true });

    const queryPath = path.join(engineDir, getQueryEngineFileName());
    const schemaPath = path.join(engineDir, getSchemaEngineFileName());
    fs.writeFileSync(queryPath, "query");
    fs.writeFileSync(schemaPath, "schema");

    const cacheRoot = trackTempDir(makeTempDir("ab-migrations-cache-"));
    const pair = resolvePrismaEnginePair(appRoot, {}, cacheRoot);

    expect(pair).not.toBeNull();
    expect(pair?.source).toBe("bundled");
    expect(pair?.queryEngineLibrary).toBe(queryPath);
    expect(pair?.schemaEngineBinary).toBe(schemaPath);
  });

  it("falls back to prisma cache when bundled engines are missing", () => {
    const appRoot = trackTempDir(makeTempDir("ab-migrations-app-root-"));
    const cacheRoot = trackTempDir(makeTempDir("ab-migrations-cache-"));
    const targetDir = path.join(cacheRoot, "abcdef", "debian-openssl-3.0.x");
    fs.mkdirSync(targetDir, { recursive: true });

    const queryPath = path.join(targetDir, "libquery-engine");
    const schemaPath = path.join(targetDir, "schema-engine");
    fs.writeFileSync(queryPath, "query-cache");
    fs.writeFileSync(schemaPath, "schema-cache");

    const env = buildPrismaCommandEnv(appRoot, { EXISTING_VAR: "1" }, cacheRoot);

    expect(env.EXISTING_VAR).toBe("1");
    expect(env.PRISMA_QUERY_ENGINE_LIBRARY).toBe(queryPath);
    expect(env.PRISMA_SCHEMA_ENGINE_BINARY).toBe(schemaPath);
  });

  it("keeps existing explicit prisma engine overrides", () => {
    const appRoot = trackTempDir(makeTempDir("ab-migrations-app-root-"));
    const env = buildPrismaCommandEnv(
      appRoot,
      {
        PRISMA_QUERY_ENGINE_LIBRARY: "/custom/query",
        PRISMA_SCHEMA_ENGINE_BINARY: "/custom/schema",
      },
      "/does/not/matter",
    );

    expect(env.PRISMA_QUERY_ENGINE_LIBRARY).toBe("/custom/query");
    expect(env.PRISMA_SCHEMA_ENGINE_BINARY).toBe("/custom/schema");
  });

  it("returns base env when no engine source can be resolved", () => {
    const appRoot = trackTempDir(makeTempDir("ab-migrations-app-root-"));
    const cacheRoot = path.join(appRoot, "missing-cache");

    const env = buildPrismaCommandEnv(appRoot, { FOO: "bar" }, cacheRoot);

    expect(env.FOO).toBe("bar");
    expect(env.PRISMA_QUERY_ENGINE_LIBRARY).toBeUndefined();
    expect(env.PRISMA_SCHEMA_ENGINE_BINARY).toBeUndefined();
  });
});
