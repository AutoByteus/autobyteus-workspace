import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { appConfigProvider } from "../config/app-config-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

function getPnpmCommand(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function getPrismaCommand(appRoot: string): { command: string; argsPrefix: string[] } {
  const localPrismaJs = path.join(appRoot, "node_modules", "prisma", "build", "index.js");
  if (fs.existsSync(localPrismaJs)) {
    // Prefer running the JS entrypoint directly via current Node runtime.
    // This avoids Windows `.cmd` invocation edge cases in packaged Electron apps.
    return { command: process.execPath, argsPrefix: [localPrismaJs] };
  }

  const prismaBin = process.platform === "win32" ? "prisma.cmd" : "prisma";
  const localPrisma = path.join(appRoot, "node_modules", ".bin", prismaBin);
  if (fs.existsSync(localPrisma)) {
    return { command: localPrisma, argsPrefix: [] };
  }
  return { command: getPnpmCommand(), argsPrefix: ["exec", "prisma"] };
}

const BASELINE_MIGRATION = "20260203074245_init";

export type PrismaEngineSource = "existing-env" | "bundled" | "cache";

export interface PrismaEnginePair {
  queryEngineLibrary: string;
  schemaEngineBinary: string;
  source: PrismaEngineSource;
  sourcePath: string;
}

function isReadableFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function getRuntimeQueryEngineSuffix(): string {
  if (process.platform === "win32") return ".dll.node";
  if (process.platform === "darwin") return ".dylib.node";
  return ".so.node";
}

function getRuntimeSchemaEngineExtension(): string {
  return process.platform === "win32" ? ".exe" : "";
}

function getRuntimeTargetPreference(): string[] {
  if (process.platform === "win32") {
    return ["windows"];
  }
  if (process.platform === "darwin") {
    if (process.arch === "arm64") {
      return ["darwin-arm64", "darwin"];
    }
    return ["darwin", "darwin-arm64"];
  }
  return ["debian-openssl-3.0.x", "debian-openssl-1.1.x", "linux-musl"];
}

function pickPreferredEngineFile(candidates: string[]): string | null {
  if (candidates.length === 0) {
    return null;
  }

  const preferences = getRuntimeTargetPreference();
  for (const token of preferences) {
    const matched = candidates.find((name) => name.includes(token));
    if (matched) {
      return matched;
    }
  }

  return candidates.sort((a, b) => a.localeCompare(b))[0] ?? null;
}

function listBundledPrismaEngineDirs(appRoot: string): string[] {
  const candidates = [path.join(appRoot, "node_modules", "@prisma", "engines")];
  const pnpmRoot = path.join(appRoot, "node_modules", ".pnpm");

  if (!fs.existsSync(pnpmRoot)) {
    return candidates;
  }

  try {
    const pnpmEntries = fs.readdirSync(pnpmRoot, { withFileTypes: true });
    for (const entry of pnpmEntries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith("@prisma+engines@")) continue;
      candidates.push(path.join(pnpmRoot, entry.name, "node_modules", "@prisma", "engines"));
    }
  } catch {
    return candidates;
  }

  return candidates;
}

function resolveBundledPrismaEnginePair(appRoot: string): PrismaEnginePair | null {
  const querySuffix = getRuntimeQueryEngineSuffix();
  const schemaExtension = getRuntimeSchemaEngineExtension();

  for (const engineDir of listBundledPrismaEngineDirs(appRoot)) {
    if (!fs.existsSync(engineDir)) continue;

    let entries: string[];
    try {
      entries = fs.readdirSync(engineDir);
    } catch {
      continue;
    }

    const queryCandidateName = pickPreferredEngineFile(
      entries.filter((name) => name.startsWith("libquery_engine-") && name.endsWith(querySuffix)),
    );
    const schemaCandidateName = pickPreferredEngineFile(
      entries.filter((name) => {
        if (!name.startsWith("schema-engine-")) return false;
        if (name.endsWith(".sha256")) return false;
        return schemaExtension.length === 0 ? !name.endsWith(".exe") : name.endsWith(schemaExtension);
      }),
    );

    if (!queryCandidateName || !schemaCandidateName) continue;

    const queryEngineLibrary = path.join(engineDir, queryCandidateName);
    const schemaEngineBinary = path.join(engineDir, schemaCandidateName);
    if (!isReadableFile(queryEngineLibrary) || !isReadableFile(schemaEngineBinary)) continue;

    return {
      queryEngineLibrary,
      schemaEngineBinary,
      source: "bundled",
      sourcePath: engineDir,
    };
  }

  return null;
}

function resolveCachedPrismaEnginePair(cacheRoot: string): PrismaEnginePair | null {
  if (!fs.existsSync(cacheRoot)) {
    return null;
  }

  let bestMatch:
    | {
        queryEngineLibrary: string;
        schemaEngineBinary: string;
        sourcePath: string;
        mtimeMs: number;
      }
    | null = null;

  let cacheVersions: fs.Dirent[];
  try {
    cacheVersions = fs.readdirSync(cacheRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const versionEntry of cacheVersions) {
    if (!versionEntry.isDirectory()) continue;
    const versionDir = path.join(cacheRoot, versionEntry.name);

    let targetEntries: fs.Dirent[];
    try {
      targetEntries = fs.readdirSync(versionDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const targetEntry of targetEntries) {
      if (!targetEntry.isDirectory()) continue;
      const sourcePath = path.join(versionDir, targetEntry.name);
      const queryEngineLibrary = path.join(sourcePath, "libquery-engine");
      const schemaEngineBinary = path.join(sourcePath, "schema-engine");
      if (!isReadableFile(queryEngineLibrary) || !isReadableFile(schemaEngineBinary)) continue;

      const queryMtime = fs.statSync(queryEngineLibrary).mtimeMs;
      const schemaMtime = fs.statSync(schemaEngineBinary).mtimeMs;
      const mtimeMs = Math.max(queryMtime, schemaMtime);
      if (!bestMatch || mtimeMs > bestMatch.mtimeMs) {
        bestMatch = { queryEngineLibrary, schemaEngineBinary, sourcePath, mtimeMs };
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    queryEngineLibrary: bestMatch.queryEngineLibrary,
    schemaEngineBinary: bestMatch.schemaEngineBinary,
    source: "cache",
    sourcePath: bestMatch.sourcePath,
  };
}

export function resolvePrismaEnginePair(
  appRoot: string,
  baseEnv: NodeJS.ProcessEnv = process.env,
  cacheRoot: string = path.join(os.homedir(), ".cache", "prisma", "master"),
): PrismaEnginePair | null {
  if (baseEnv.PRISMA_QUERY_ENGINE_LIBRARY && baseEnv.PRISMA_SCHEMA_ENGINE_BINARY) {
    return {
      queryEngineLibrary: baseEnv.PRISMA_QUERY_ENGINE_LIBRARY,
      schemaEngineBinary: baseEnv.PRISMA_SCHEMA_ENGINE_BINARY,
      source: "existing-env",
      sourcePath: "process.env",
    };
  }

  const bundled = resolveBundledPrismaEnginePair(appRoot);
  if (bundled) {
    return bundled;
  }

  return resolveCachedPrismaEnginePair(cacheRoot);
}

export function buildPrismaCommandEnv(
  appRoot: string,
  baseEnv: NodeJS.ProcessEnv = process.env,
  cacheRoot: string = path.join(os.homedir(), ".cache", "prisma", "master"),
): NodeJS.ProcessEnv {
  const pair = resolvePrismaEnginePair(appRoot, baseEnv, cacheRoot);
  return pair
    ? {
        ...baseEnv,
        PRISMA_QUERY_ENGINE_LIBRARY: pair.queryEngineLibrary,
        PRISMA_SCHEMA_ENGINE_BINARY: pair.schemaEngineBinary,
      }
    : { ...baseEnv };
}

function runPrismaCommand(appRoot: string, args: string[]): void {
  const { command, argsPrefix } = getPrismaCommand(appRoot);
  const enginePair = resolvePrismaEnginePair(appRoot, process.env);
  const prismaEnv = enginePair
    ? {
        ...process.env,
        PRISMA_QUERY_ENGINE_LIBRARY: enginePair.queryEngineLibrary,
        PRISMA_SCHEMA_ENGINE_BINARY: enginePair.schemaEngineBinary,
      }
    : { ...process.env };
  if (enginePair) {
    logger.info(`Using Prisma engine overrides from ${enginePair.source}: ${enginePair.sourcePath}`);
  } else {
    logger.warn("Unable to resolve Prisma engine override paths; Prisma CLI will use default engine resolution.");
  }
  execFileSync(command, [...argsPrefix, ...args], {
    cwd: appRoot,
    stdio: "inherit",
    env: prismaEnv,
  });
}

export function runMigrations(): void {
  const config = appConfigProvider.config;
  const appRoot = config.getAppRootDir();
  const schemaPath = path.join(appRoot, "prisma", "schema.prisma");

  if (!fs.existsSync(schemaPath)) {
    logger.warn("Prisma schema not found; skipping migrations.");
    return;
  }

  try {
    logger.info("Running Prisma migrations...");
    runPrismaCommand(appRoot, ["migrate", "deploy", "--schema", schemaPath]);
    logger.info("Database migrations completed successfully.");
  } catch (error) {
    const message = String(error);
    if (message.includes("P3005")) {
      logger.warn(
        "Prisma reported a non-empty schema without migration history. " +
          `Marking baseline migration ${BASELINE_MIGRATION} as applied.`,
      );
      runPrismaCommand(appRoot, [
        "migrate",
        "resolve",
        "--applied",
        BASELINE_MIGRATION,
        "--schema",
        schemaPath,
      ]);
      runPrismaCommand(appRoot, ["migrate", "deploy", "--schema", schemaPath]);
      logger.info("Baseline migration resolved; database migrations completed.");
      return;
    }
    logger.error(`Error running database migrations: ${message}`);
    throw error;
  }
}
