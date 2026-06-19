import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPrismaCommandEnv,
  getPrismaRuntimeTargetPreference,
  resolvePrismaEnginePair,
} from "../../../src/startup/migrations.js";

function getQueryEngineFileName(): string {
  if (process.platform === "win32") return "libquery_engine-windows.dll.node";
  if (process.platform === "darwin") return "libquery_engine-darwin-arm64.dylib.node";
  if (process.arch === "arm64") return "libquery_engine-linux-arm64-openssl-3.0.x.so.node";
  return "libquery_engine-debian-openssl-3.0.x.so.node";
}

function getSchemaEngineFileName(): string {
  if (process.platform === "win32") return "schema-engine-windows.exe";
  if (process.platform === "darwin") return "schema-engine-darwin-arm64";
  if (process.arch === "arm64") return "schema-engine-linux-arm64-openssl-3.0.x";
  return "schema-engine-debian-openssl-3.0.x";
}

function getCacheTargetName(): string {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return process.arch === "arm64" ? "darwin-arm64" : "darwin";
  return process.arch === "arm64" ? "linux-arm64-openssl-3.0.x" : "debian-openssl-3.0.x";
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const tempDirs: string[] = [];
const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
const originalArchDescriptor = Object.getOwnPropertyDescriptor(process, "arch");

function trackTempDir(dir: string): string {
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  if (originalPlatformDescriptor) {
    Object.defineProperty(process, "platform", originalPlatformDescriptor);
  }
  if (originalArchDescriptor) {
    Object.defineProperty(process, "arch", originalArchDescriptor);
  }
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function withRuntimeIdentity<T>(
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture,
  callback: () => T,
): T {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
  Object.defineProperty(process, "arch", { value: arch, configurable: true });
  return callback();
}

describe("Prisma migration engine env resolution", () => {
  it("prefers ARM64 Linux prisma targets on ARM64 runtimes", () => {
    expect(getPrismaRuntimeTargetPreference("linux", "arm64")).toEqual([
      "linux-arm64-openssl-3.0.x",
      "linux-arm64-openssl-1.1.x",
    ]);
  });

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

  it("selects bundled ARM64 engines over Debian x64 engines on Linux ARM64", () => {
    withRuntimeIdentity("linux", "arm64", () => {
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

      const x64Query = path.join(engineDir, "libquery_engine-debian-openssl-3.0.x.so.node");
      const x64Schema = path.join(engineDir, "schema-engine-debian-openssl-3.0.x");
      const arm64Query = path.join(engineDir, "libquery_engine-linux-arm64-openssl-3.0.x.so.node");
      const arm64Schema = path.join(engineDir, "schema-engine-linux-arm64-openssl-3.0.x");
      fs.writeFileSync(x64Query, "query-x64");
      fs.writeFileSync(x64Schema, "schema-x64");
      fs.writeFileSync(arm64Query, "query-arm64");
      fs.writeFileSync(arm64Schema, "schema-arm64");

      const cacheRoot = trackTempDir(makeTempDir("ab-migrations-cache-"));
      const pair = resolvePrismaEnginePair(appRoot, {}, cacheRoot);

      expect(pair).not.toBeNull();
      expect(pair?.source).toBe("bundled");
      expect(pair?.queryEngineLibrary).toBe(arm64Query);
      expect(pair?.schemaEngineBinary).toBe(arm64Schema);
    });
  });

  it("does not fall back to cached Debian x64 engines on Linux ARM64", () => {
    withRuntimeIdentity("linux", "arm64", () => {
      const appRoot = trackTempDir(makeTempDir("ab-migrations-app-root-"));
      const cacheRoot = trackTempDir(makeTempDir("ab-migrations-cache-"));
      const x64TargetDir = path.join(cacheRoot, "abcdef", "debian-openssl-3.0.x");
      fs.mkdirSync(x64TargetDir, { recursive: true });
      fs.writeFileSync(path.join(x64TargetDir, "libquery-engine"), "query-x64-cache");
      fs.writeFileSync(path.join(x64TargetDir, "schema-engine"), "schema-x64-cache");

      const env = buildPrismaCommandEnv(appRoot, { FOO: "bar" }, cacheRoot);

      expect(env.FOO).toBe("bar");
      expect(env.PRISMA_QUERY_ENGINE_LIBRARY).toBeUndefined();
      expect(env.PRISMA_SCHEMA_ENGINE_BINARY).toBeUndefined();
    });
  });

  it("falls back to prisma cache when bundled engines are missing", () => {
    const appRoot = trackTempDir(makeTempDir("ab-migrations-app-root-"));
    const cacheRoot = trackTempDir(makeTempDir("ab-migrations-cache-"));
    const targetDir = path.join(cacheRoot, "abcdef", getCacheTargetName());
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
