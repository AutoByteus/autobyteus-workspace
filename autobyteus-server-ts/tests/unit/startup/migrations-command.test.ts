/** Preserved command boundary: mocked exec, private files/HOME, no database or native process. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../../src/startup/migrations.js";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));

let root: string;
let appRoot: string;
let schemaPath: string;
const databaseUrl = "file:/owned/canonical.db";
const exec = vi.mocked(execFileSync);

function write(file: string, content = "fixture"): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

beforeEach(() => {
  exec.mockReset();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ab-prisma-command-"));
  appRoot = path.join(root, "server");
  schemaPath = write(path.join(appRoot, "prisma", "schema.prisma"));
  vi.spyOn(os, "homedir").mockReturnValue(root);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("PRISMA_QUERY_ENGINE_LIBRARY", undefined);
  vi.stubEnv("PRISMA_SCHEMA_ENGINE_BINARY", undefined);
  vi.stubEnv("DATABASE_URL", "file:/stale.db");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});

const deployArgs = () => ["migrate", "deploy", "--schema", schemaPath];
const pnpm = () => process.platform === "win32" ? "pnpm.cmd" : "pnpm";

describe("Prisma migration invocation and error contract", () => {
  it("retains missing-schema skip without invoking a command", () => {
    fs.unlinkSync(schemaPath);
    runMigrations({ appRoot, databaseUrl });
    expect(exec).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith("Prisma schema not found; skipping migrations.");
  });

  it("prefers local CLI JS, preserving complete overrides/base env and canonical DB", () => {
    const cli = write(path.join(appRoot, "node_modules", "prisma", "build", "index.js"));
    write(path.join(appRoot, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma"));
    vi.stubEnv("PRISMA_QUERY_ENGINE_LIBRARY", "/operator/query");
    vi.stubEnv("PRISMA_SCHEMA_ENGINE_BINARY", "/operator/schema");
    vi.stubEnv("TEST_MIGRATION_KEEP", "unchanged");
    const baseEnv = { ...process.env };
    runMigrations({ appRoot, databaseUrl });
    expect(exec).toHaveBeenCalledExactlyOnceWith(process.execPath, [cli, ...deployArgs()], {
      cwd: appRoot, stdio: "inherit", env: { ...baseEnv, DATABASE_URL: databaseUrl },
    });
    expect(process.env).toEqual(baseEnv);
  });

  it.each([true, false])("preserves local .bin (%s) or pnpm fallback without injecting ownerless engines", (hasBin) => {
    const bin = path.join(appRoot, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
    if (hasBin) write(bin);
    // Complete host-native cache files alone cannot establish a CLI revision.
    const target = process.platform === "darwin" ? (process.arch === "arm64" ? "darwin-arm64" : "darwin")
      : process.platform === "win32" ? "windows" : process.arch === "arm64" ? "linux-arm64-openssl-3.0.x" : "debian-openssl-3.0.x";
    const cache = path.join(root, ".cache", "prisma", "master", "a".repeat(40), target);
    write(path.join(cache, "libquery-engine"));
    write(path.join(cache, "schema-engine"));
    runMigrations({ appRoot, databaseUrl });
    expect(exec).toHaveBeenCalledExactlyOnceWith(hasBin ? bin : pnpm(), hasBin ? deployArgs() : ["exec", "prisma", ...deployArgs()], {
      cwd: appRoot, stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    expect(console.warn).toHaveBeenCalledWith("Unable to resolve Prisma engine override paths; Prisma CLI will use default engine resolution.");
  });

  it("keeps deploy → P3005 baseline resolve → deploy with canonical env every time", () => {
    exec.mockImplementationOnce(() => { throw new Error("P3005: non-empty schema"); });
    runMigrations({ appRoot, databaseUrl });
    expect(exec.mock.calls).toEqual([
      [pnpm(), ["exec", "prisma", ...deployArgs()], { cwd: appRoot, stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } }],
      [pnpm(), ["exec", "prisma", "migrate", "resolve", "--applied", "20260203074245_init", "--schema", schemaPath],
        { cwd: appRoot, stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } }],
      [pnpm(), ["exec", "prisma", ...deployArgs()], { cwd: appRoot, stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } }],
    ]);
  });

  it("propagates an ordinary deploy failure unchanged without baseline or success", () => {
    const failure = new Error("RPC listMigrationDirectories: Method not found");
    exec.mockImplementationOnce(() => { throw failure; });
    expect(() => runMigrations({ appRoot, databaseUrl })).toThrow(failure);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalledWith("Database migrations completed successfully.");
  });

  it.each(["resolve", "second deploy"])("does not suppress a failure during P3005 %s", (phase) => {
    const failure = new Error("fixture deployment failed");
    exec.mockImplementationOnce(() => { throw new Error("P3005"); });
    if (phase === "second deploy") exec.mockImplementationOnce(() => Buffer.alloc(0));
    exec.mockImplementationOnce(() => { throw failure; });
    expect(() => runMigrations({ appRoot, databaseUrl })).toThrow(failure);
    expect(exec).toHaveBeenCalledTimes(phase === "resolve" ? 2 : 3);
    expect(console.info).not.toHaveBeenCalledWith("Baseline migration resolved; database migrations completed.");
  });
});
