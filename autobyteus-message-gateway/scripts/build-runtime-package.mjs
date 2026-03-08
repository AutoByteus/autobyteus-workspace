#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COLORS = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gatewayRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(gatewayRoot, "..");
const packageJsonPath = path.join(gatewayRoot, "package.json");
const serverPackageJsonPath = path.join(
  workspaceRoot,
  "autobyteus-server-ts",
  "package.json",
);
const desktopPackageJsonPath = path.join(
  workspaceRoot,
  "autobyteus-web",
  "package.json",
);
const defaultReleaseManifestPath = path.join(
  workspaceRoot,
  "autobyteus-server-ts",
  "src",
  "managed-capabilities",
  "messaging-gateway",
  "release-manifest.json",
);
const defaultOutputDir = path.join(gatewayRoot, "dist-runtime");
const stageDir = path.join(gatewayRoot, ".runtime-package-stage");
const localPackageDir = path.join(stageDir, "_local-packages");
const defaultRepositorySlug =
  process.env.GITHUB_REPOSITORY ?? "AutoByteus/autobyteus-workspace";
const PRUNE_STAGE_PATHS = [
  "src",
  "tests",
  "tickets",
  "tools",
  "docker",
  "tsconfig.json",
  "tsconfig.build.json",
  "vitest.config.ts",
  ".gitignore",
  "pnpm-lock.yaml",
  "package-lock.json",
];

function color(text, value) {
  return `${value}${text}${COLORS.reset}`;
}

function info(message) {
  console.log(color(message, COLORS.green));
}

function warn(message) {
  console.log(color(message, COLORS.yellow));
}

function fail(message) {
  console.error(color(message, COLORS.red));
}

function resolveExecutable(command) {
  if (process.platform !== "win32") {
    return command;
  }
  if (
    command.includes("\\") ||
    command.includes("/") ||
    command.endsWith(".exe") ||
    command.endsWith(".cmd")
  ) {
    return command;
  }
  return `${command}.cmd`;
}

async function runCommand(command, args, options = {}) {
  const executable = resolveExecutable(command);
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: "inherit",
      shell: process.platform === "win32" && executable.endsWith(".cmd"),
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code}): ${executable} ${args.join(" ")}`));
    });
  });
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function isWorkspaceDependency(version) {
  return typeof version === "string" && version.startsWith("workspace:");
}

async function cleanDirectory(directoryPath) {
  await rm(directoryPath, { recursive: true, force: true });
  await mkdir(directoryPath, { recursive: true });
}

async function getPackedTarballName(outputDirectory, previousEntries) {
  const currentEntries = new Set((await readdir(outputDirectory)).filter((name) => name.endsWith(".tgz")));
  const created = [...currentEntries].filter((name) => !previousEntries.has(name));
  if (created.length !== 1) {
    throw new Error(`Expected exactly one packed tarball, found ${created.length}`);
  }
  return created[0];
}

function printHelp() {
  console.log(`Usage: node scripts/build-runtime-package.mjs [options]

Options:
  --skip-build           Skip workspace/gateway build steps and package existing build output.
  --output-dir <path>    Write runtime artifacts to a custom directory.
  --release-tag <tag>    Generate release metadata for a specific tag.
  --help                 Show this help message.
`);
}

function parseArgs(argv) {
  const options = {
    skipBuild: false,
    outputDir: defaultOutputDir,
    releaseTag: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--skip-build") {
      options.skipBuild = true;
      continue;
    }
    if (arg === "--output-dir") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("Missing value for --output-dir");
      }
      options.outputDir = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (arg === "--release-tag") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("Missing value for --release-tag");
      }
      options.releaseTag = next.trim() || null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function buildWorkspaceArtifacts() {
  warn("\nBuilding gateway runtime artifacts...");
  await runCommand("pnpm", ["-C", workspaceRoot, "-r", "--filter", "autobyteus-ts", "build"]);
  await runCommand("pnpm", ["-C", gatewayRoot, "build"]);
}

async function deployGatewayPackageToStage() {
  warn("\nDeploying gateway package into staging directory...");
  await runCommand("pnpm", ["-C", workspaceRoot, "--filter", "autobyteus-message-gateway", "deploy", stageDir, "--legacy"]);
  await rm(path.join(stageDir, "node_modules"), { recursive: true, force: true });
}

async function packWorkspaceDependencies(sourceManifest) {
  const dependencies = Object.entries(sourceManifest.dependencies ?? {});
  const workspaceDependencies = dependencies.filter(([, version]) => isWorkspaceDependency(version));
  if (workspaceDependencies.length === 0) {
    return {};
  }

  warn("\nPacking local workspace dependencies for portable install...");
  await mkdir(localPackageDir, { recursive: true });
  const packed = {};

  for (const [packageName] of workspaceDependencies) {
    const packageRoot = path.join(workspaceRoot, packageName);
    if (!(await exists(packageRoot))) {
      throw new Error(`Workspace package not found: ${packageRoot}`);
    }
    const before = new Set((await readdir(localPackageDir)).filter((name) => name.endsWith(".tgz")));
    await runCommand("pnpm", ["pack", "--pack-destination", localPackageDir], { cwd: packageRoot });
    const tarballName = await getPackedTarballName(localPackageDir, before);
    packed[packageName] = `file:${toPosixPath(path.join("./_local-packages", tarballName))}`;
  }

  return packed;
}

async function rewriteStagePackageManifest(sourceManifest, localDependencySpecs) {
  const manifestPath = path.join(stageDir, "package.json");
  const manifest = await readJson(manifestPath);

  manifest.private = false;
  manifest.dependencies = {
    ...(manifest.dependencies ?? {}),
    ...localDependencySpecs,
  };
  manifest.devDependencies = {};
  manifest.scripts = {
    ...(manifest.scripts ?? {}),
    start: "node dist/index.js",
  };

  if (sourceManifest.engines) {
    manifest.engines = sourceManifest.engines;
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function installRuntimeDependencies() {
  warn("\nInstalling runtime dependencies into staging directory...");
  await runCommand("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], {
    cwd: stageDir,
  });
}

async function pruneStageFiles() {
  warn("\nPruning non-runtime files from staging directory...");
  await rm(localPackageDir, { recursive: true, force: true });
  for (const relativePath of PRUNE_STAGE_PATHS) {
    await rm(path.join(stageDir, relativePath), { recursive: true, force: true });
  }
}

async function verifyRuntimeEntrypoint() {
  const entrypoint = path.join(stageDir, "dist", "index.js");
  if (!(await exists(entrypoint))) {
    throw new Error(`Runtime entrypoint was not found in staged package: ${entrypoint}`);
  }
}

async function computeSha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

function sanitizePackageName(name) {
  return name.replace(/^@/, "").replace(/[\\/]/g, "-");
}

async function writeRuntimeMetadata(sourceManifest, archivePath) {
  const archiveName = path.basename(archivePath);
  const sha256 = await computeSha256(archivePath);
  const metadata = {
    packageName: sourceManifest.name,
    packageVersion: sourceManifest.version,
    artifactVersion: sourceManifest.version,
    platformKey: "node-generic",
    archiveType: "tar.gz",
    archiveFileName: archiveName,
    sha256,
    entrypoint: "dist/index.js",
    packageRoot: ".",
    generatedAt: new Date().toISOString(),
  };

  const metadataPath = path.join(path.dirname(archivePath), `${archiveName}.json`);
  const checksumPath = path.join(path.dirname(archivePath), `${archiveName}.sha256`);
  await writeFile(path.join(stageDir, "runtime-artifact.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  await writeFile(checksumPath, `${sha256}  ${archiveName}\n`, "utf8");
  return { metadataPath, checksumPath, metadata };
}

async function resolveReleaseMetadata(options) {
  const [serverManifest, desktopManifest] = await Promise.all([
    readJson(serverPackageJsonPath),
    readJson(desktopPackageJsonPath),
  ]);

  if (!serverManifest.version) {
    throw new Error("autobyteus-server-ts package version is missing.");
  }
  if (!desktopManifest.version) {
    throw new Error("autobyteus-web package version is missing.");
  }

  return {
    serverVersion: serverManifest.version,
    releaseTag: normalizeReleaseTag(options.releaseTag ?? `v${desktopManifest.version}`),
    repositorySlug: defaultRepositorySlug,
  };
}

async function writeReleaseManifest(input) {
  const archiveName = path.basename(input.archivePath);
  const releaseAssetBaseUrl = `https://github.com/${input.repositorySlug}/releases/download/${input.releaseTag}`;
  const manifest = {
    schemaVersion: 1,
    releases: [
      {
        serverVersion: input.serverVersion,
        releaseTag: input.releaseTag,
        artifactVersion: input.gatewayManifest.version,
        platformKey: "node-generic",
        archiveType: "tar.gz",
        downloadUrl: `${releaseAssetBaseUrl}/${archiveName}`,
        sha256Url: `${releaseAssetBaseUrl}/${archiveName}.sha256`,
        metadataUrl: `${releaseAssetBaseUrl}/${archiveName}.json`,
        supportedProviders: ["WHATSAPP", "WECOM", "DISCORD", "TELEGRAM"],
        excludedProviders: ["WECHAT"],
      },
    ],
  };

  const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
  const artifactManifestPath = path.join(
    path.dirname(input.archivePath),
    "release-manifest.json",
  );
  await writeFile(artifactManifestPath, serializedManifest, "utf8");
  await writeFile(defaultReleaseManifestPath, serializedManifest, "utf8");

  return {
    artifactManifestPath,
    syncedManifestPath: defaultReleaseManifestPath,
    manifest,
  };
}

async function createRuntimeArchive(sourceManifest, outputDir) {
  warn("\nCreating runtime archive...");
  const archiveBaseName = `${sanitizePackageName(sourceManifest.name)}-${sourceManifest.version}-node-generic`;
  const archivePath = path.join(outputDir, `${archiveBaseName}.tar.gz`);
  await runCommand("tar", ["-czf", archivePath, "-C", stageDir, "."]);
  return { archivePath, archiveBaseName };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const sourceManifest = await readJson(packageJsonPath);
  const releaseMetadata = await resolveReleaseMetadata(options);

  await cleanDirectory(stageDir);
  await cleanDirectory(options.outputDir);

  if (!options.skipBuild) {
    await buildWorkspaceArtifacts();
  } else {
    warn("\nSkipping build step; packaging existing runtime output...");
  }

  await deployGatewayPackageToStage();
  const localDependencySpecs = await packWorkspaceDependencies(sourceManifest);
  await rewriteStagePackageManifest(sourceManifest, localDependencySpecs);
  await installRuntimeDependencies();
  await pruneStageFiles();
  await verifyRuntimeEntrypoint();

  const metadataSeedPath = path.join(stageDir, "runtime-artifact.json");
  await writeFile(
    metadataSeedPath,
    `${JSON.stringify(
      {
        packageName: sourceManifest.name,
        packageVersion: sourceManifest.version,
        artifactVersion: sourceManifest.version,
        platformKey: "node-generic",
        archiveType: "tar.gz",
        entrypoint: "dist/index.js",
        packageRoot: ".",
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const { archivePath } = await createRuntimeArchive(sourceManifest, options.outputDir);
  const { metadataPath, checksumPath, metadata } = await writeRuntimeMetadata(sourceManifest, archivePath);
  const { artifactManifestPath, syncedManifestPath, manifest } =
    await writeReleaseManifest({
      archivePath,
      gatewayManifest: sourceManifest,
      releaseTag: releaseMetadata.releaseTag,
      repositorySlug: releaseMetadata.repositorySlug,
      serverVersion: releaseMetadata.serverVersion,
    });

  info(`\nRuntime package archive: ${archivePath}`);
  info(`Runtime package metadata: ${metadataPath}`);
  info(`Runtime package checksum: ${checksumPath}`);
  info(`Release manifest artifact: ${artifactManifestPath}`);
  info(`Synced default release manifest: ${syncedManifestPath}`);
  info(`Release tag: ${manifest.releases[0].releaseTag}`);
  info(`Server version: ${manifest.releases[0].serverVersion}`);
  info(`Platform key: ${metadata.platformKey}`);
}

run().catch((error) => {
  fail(`Failed to build runtime package: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

function normalizeReleaseTag(value) {
  if (typeof value !== "string") {
    throw new Error("Release tag must be a string.");
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error("Release tag cannot be empty.");
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}
