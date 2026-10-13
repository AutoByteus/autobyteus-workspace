/** Filesystem selection only: real dependency symlinks, inert native files, no CLI/DB execution. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPrismaCommandEnv,
  getPrismaRuntimeTargetPreference,
  resolvePrismaEnginePair,
} from "../../../src/startup/migrations.js";

const revision = "a".repeat(40);
const unrelatedRevision = "b".repeat(40);
const tempDirs: string[] = [];
const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
const originalArch = Object.getOwnPropertyDescriptor(process, "arch")!;

function write(file: string, contents: string): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  return file;
}

function link(target: string, destination: string): void {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.symlinkSync(target, destination, process.platform === "win32" ? "junction" : "dir");
}

function fixture(layout: "root-pnpm" | "package-pnpm" | "flat" = "root-pnpm") {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "ab-prisma-graph-")));
  tempDirs.push(root);
  const appRoot = path.join(root, "server");
  const modules = path.join(appRoot, "node_modules");
  const store = path.join(layout === "root-pnpm" ? root : appRoot, "node_modules", ".pnpm");
  const cliDir = layout === "flat" ? path.join(modules, "prisma")
    : path.join(store, "prisma@5.22.0", "node_modules", "prisma");
  const engineDir = layout === "flat" ? path.join(modules, "@prisma", "engines")
    : path.join(store, "@prisma+engines@5.22.0", "node_modules", "@prisma", "engines");
  const versionDir = layout === "flat" ? path.join(modules, "@prisma", "engines-version")
    : path.join(store, "@prisma+engines-version@fixture", "node_modules", "@prisma", "engines-version");
  const cliPath = write(path.join(cliDir, "build", "index.js"), 'throw new Error("Do not execute CLI during discovery");');
  write(path.join(cliDir, "package.json"), JSON.stringify({ name: "prisma", main: "build/index.js" }));
  const engineManifest = write(path.join(engineDir, "package.json"), JSON.stringify({ name: "@prisma/engines", main: "index.js" }));
  write(path.join(engineDir, "index.js"), 'throw new Error("Do not execute engine downloader");');
  const versionManifest = write(path.join(versionDir, "package.json"), JSON.stringify({
    name: "@prisma/engines-version", main: "index.js", prisma: { enginesVersion: revision },
  }));
  write(path.join(versionDir, "index.js"), 'throw new Error("Read JSON, not package JS");');
  if (layout !== "flat") {
    link(cliDir, path.join(modules, "prisma"));
    link(engineDir, path.join(path.dirname(cliDir), "@prisma", "engines"));
    link(versionDir, path.join(path.dirname(engineDir), "engines-version"));
  }
  return { root, appRoot, engineDir, engineManifest, versionManifest, cliPath, cacheRoot: path.join(root, "cache", "master") };
}

// pnpm's vitest shim sets NODE_PATH to the repository's virtual store. For
// absent package metadata, test native resolution in a clean child instead of
// accidentally finding the test runner's installed Prisma dependency. Transpile
// this exact source owner; no native binaries, database or mocked resolver.
function resolveWithoutRunnerPackages(f: ReturnType<typeof fixture>) {
  const source = fs.readFileSync(new URL("../../../src/startup/migrations.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const call = `console.log(JSON.stringify(resolvePrismaEnginePair(${JSON.stringify(f.appRoot)}, {}, ${JSON.stringify(f.cacheRoot)})));`;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module"], {
    input: js + "\n" + call, encoding: "utf8", cwd: f.root,
    env: { HOME: f.root, USERPROFILE: f.root, SystemRoot: process.env.SystemRoot },
  }));
}

function bundledPair(dir: string, target = getPrismaRuntimeTargetPreference()[0]) {
  const suffix = process.platform === "win32" ? ".dll.node" : process.platform === "darwin" ? ".dylib.node" : ".so.node";
  const extension = process.platform === "win32" ? ".exe" : "";
  return {
    queryEngineLibrary: write(path.join(dir, `libquery_engine-${target}${suffix}`), "query-bundle"),
    schemaEngineBinary: write(path.join(dir, `schema-engine-${target}${extension}`), "schema-bundle"),
    source: "bundled", sourcePath: dir,
  };
}

function cachedPair(root: string, commit = revision, target = getPrismaRuntimeTargetPreference()[0]) {
  const dir = path.join(root, commit, target);
  return {
    queryEngineLibrary: write(path.join(dir, "libquery-engine"), "query-cache"),
    schemaEngineBinary: write(path.join(dir, "schema-engine"), "schema-cache"),
    source: "cache", sourcePath: dir,
  };
}

function runtime(platform: NodeJS.Platform, arch: NodeJS.Architecture) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
  Object.defineProperty(process, "arch", { value: arch, configurable: true });
}

afterEach(() => {
  Object.defineProperty(process, "platform", originalPlatform);
  Object.defineProperty(process, "arch", originalArch);
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("CLI-owned Prisma migration engines", () => {
  it.each(["root-pnpm", "package-pnpm", "flat"] as const)("follows the real %s dependency graph, preferring its bundle over newer cache", (layout) => {
    const f = fixture(layout);
    const expected = bundledPair(f.engineDir);
    const wrong = cachedPair(f.cacheRoot, unrelatedRevision);
    for (const file of [wrong.queryEngineLibrary, wrong.schemaEngineBinary]) fs.utimesSync(file, new Date(2100, 0, 1), new Date(2100, 0, 1));
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toEqual(expected);
    expect(fs.readFileSync(wrong.schemaEngineBinary, "utf8")).toBe("schema-cache");
  });

  it("ignores unrelated direct and virtual-store installations", () => {
    const f = fixture();
    bundledPair(path.join(f.appRoot, "node_modules", "@prisma", "engines"));
    bundledPair(path.join(f.appRoot, "node_modules", ".pnpm", "@prisma+engines@99.0.0", "node_modules", "@prisma", "engines"));
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toBeNull();
    const owned = bundledPair(f.engineDir);
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toEqual(owned);
  });

  it("uses only exact-revision cache when its bundle is incomplete", () => {
    const f = fixture();
    const bundle = bundledPair(f.engineDir);
    fs.unlinkSync(bundle.schemaEngineBinary);
    const expected = cachedPair(f.cacheRoot);
    const wrong = cachedPair(f.cacheRoot, unrelatedRevision);
    fs.utimesSync(wrong.schemaEngineBinary, new Date(2100, 0, 1), new Date(2100, 0, 1));
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toEqual(expected);
  });

  it("does not select a complete cache belonging to another revision", () => {
    const f = fixture();
    cachedPair(f.cacheRoot, unrelatedRevision);
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toBeNull();
  });

  it("does not combine files across revisions or targets", () => {
    const f = fixture();
    const own = cachedPair(f.cacheRoot);
    const other = cachedPair(f.cacheRoot, unrelatedRevision);
    fs.unlinkSync(own.schemaEngineBinary);
    fs.unlinkSync(other.queryEngineLibrary);
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toBeNull();
    const split = cachedPair(f.cacheRoot, revision, `${getPrismaRuntimeTargetPreference()[0]}-other`);
    fs.unlinkSync(split.queryEngineLibrary);
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toBeNull();
  });

  it("sorts equivalent targets stably, without file mtimes", () => {
    const f = fixture();
    const target = getPrismaRuntimeTargetPreference()[0];
    const newer = cachedPair(f.cacheRoot, revision, `${target}-z`);
    const expected = cachedPair(f.cacheRoot, revision, `${target}-a`);
    fs.utimesSync(newer.schemaEngineBinary, new Date(2100, 0, 1), new Date(2100, 0, 1));
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toEqual(expected);
  });

  it.each([undefined, "", "5.22.0", "../other", "a".repeat(39), "g".repeat(40), 42, null])("declines automatic selection for invalid native revision %s", (enginesVersion) => {
    const f = fixture();
    bundledPair(f.engineDir);
    cachedPair(f.cacheRoot);
    write(f.versionManifest, JSON.stringify({ prisma: { enginesVersion } }));
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toBeNull();
  });

  it.each(["cliPath", "engineManifest", "versionManifest"] as const)("declines when %s is missing", (field) => {
    const f = fixture();
    bundledPair(f.engineDir);
    cachedPair(f.cacheRoot);
    fs.unlinkSync(f[field]);
    expect(resolveWithoutRunnerPackages(f)).toBeNull();
  });

  it("declines malformed or unreadable revision JSON", () => {
    const f = fixture();
    bundledPair(f.engineDir);
    cachedPair(f.cacheRoot);
    write(f.versionManifest, "{");
    expect(resolveWithoutRunnerPackages(f)).toBeNull();
    fs.unlinkSync(f.versionManifest);
    fs.mkdirSync(f.versionManifest);
    expect(resolveWithoutRunnerPackages(f)).toBeNull();
  });

  it("keeps complete explicit overrides even without metadata or files", () => {
    const f = fixture();
    fs.unlinkSync(f.cliPath);
    const baseEnv = { PRISMA_QUERY_ENGINE_LIBRARY: "/operator/query", PRISMA_SCHEMA_ENGINE_BINARY: "/operator/schema" };
    expect(resolvePrismaEnginePair(f.appRoot, baseEnv, f.cacheRoot)).toEqual({
      queryEngineLibrary: baseEnv.PRISMA_QUERY_ENGINE_LIBRARY,
      schemaEngineBinary: baseEnv.PRISMA_SCHEMA_ENGINE_BINARY,
      source: "existing-env", sourcePath: "process.env",
    });
  });

  it.each(["PRISMA_QUERY_ENGINE_LIBRARY", "PRISMA_SCHEMA_ENGINE_BINARY"])("replaces a partial %s only when an automatic pair resolves", (key) => {
    const f = fixture();
    const baseEnv = { [key]: "/partial", KEEP: "value", DATABASE_URL: "file:/stale" };
    const input = { appRoot: f.appRoot, databaseUrl: "file:/canonical", baseEnv, cacheRoot: f.cacheRoot };
    expect(buildPrismaCommandEnv(input)).toEqual({ ...baseEnv, DATABASE_URL: input.databaseUrl });
    const pair = bundledPair(f.engineDir);
    expect(buildPrismaCommandEnv(input)).toEqual({ ...baseEnv, DATABASE_URL: input.databaseUrl,
      PRISMA_QUERY_ENGINE_LIBRARY: pair.queryEngineLibrary, PRISMA_SCHEMA_ENGINE_BINARY: pair.schemaEngineBinary });
    expect(baseEnv.DATABASE_URL).toBe("file:/stale");
  });

  it.each([
    ["linux", "arm64", ["linux-arm64-openssl-3.0.x", "linux-arm64-openssl-1.1.x"]],
    ["linux", "x64", ["debian-openssl-3.0.x", "debian-openssl-1.1.x", "linux-musl"]],
    ["darwin", "arm64", ["darwin-arm64", "darwin"]],
    ["darwin", "x64", ["darwin", "darwin-arm64"]],
    ["win32", "x64", ["windows"]],
    ["freebsd", "x64", []],
  ] as const)("retains %s/%s target preference", (platform, arch, targets) => {
    expect(getPrismaRuntimeTargetPreference(platform, arch)).toEqual(targets);
  });

  it("prefers Linux ARM64 openssl3 over openssl1 and never selects Debian x64", () => {
    const f = fixture();
    runtime("linux", "arm64");
    bundledPair(f.engineDir, "debian-openssl-3.0.x");
    cachedPair(f.cacheRoot, revision, "debian-openssl-3.0.x");
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toBeNull();
    const lower = bundledPair(f.engineDir, "linux-arm64-openssl-1.1.x");
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toEqual(lower);
    const preferred = bundledPair(f.engineDir, "linux-arm64-openssl-3.0.x");
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toEqual(preferred);
    fs.unlinkSync(preferred.schemaEngineBinary);
    fs.unlinkSync(lower.schemaEngineBinary);
    const cachedLower = cachedPair(f.cacheRoot, revision, "linux-arm64-openssl-1.1.x");
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toEqual(cachedLower);
    const cachedPreferred = cachedPair(f.cacheRoot, revision, "linux-arm64-openssl-3.0.x");
    expect(resolvePrismaEnginePair(f.appRoot, {}, f.cacheRoot)).toEqual(cachedPreferred);
  });
});
