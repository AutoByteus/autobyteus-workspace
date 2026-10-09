#!/usr/bin/env node
// Checks or prepares the build outputs that the server integration suite consumes.
//
//   node ./scripts/integration-test-prerequisites.mjs check    exit 1 with one message if any is missing
//   node ./scripts/integration-test-prerequisites.mjs prepare  build them in order, then check
//
// The integration tests load the server's built watcher runtime, the application
// SDK/devkit packages and the Brief Studio importable package. Without them, dozens
// of unrelated integration tests fail; this script turns that into one clear message.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const serverRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(serverRoot, "..");
const devkitRoot = path.join(workspaceRoot, "autobyteus-application-devkit");
const briefStudioRoot = path.join(workspaceRoot, "applications", "brief-studio");

const PREPARE_COMMAND = "pnpm -C autobyteus-server-ts test:integration:prepare";

const REQUIRED_ARTIFACTS = [
  path.join(serverRoot, "dist", "file-explorer", "watcher", "runtime", "watcher-runtime-process.js"),
  path.join(workspaceRoot, "autobyteus-application-sdk-contracts", "dist", "index.js"),
  path.join(workspaceRoot, "autobyteus-application-backend-sdk", "dist", "index.js"),
  path.join(workspaceRoot, "autobyteus-application-frontend-sdk", "dist", "index.js"),
  path.join(devkitRoot, "dist", "cli.js"),
  path.join(
    briefStudioRoot,
    "dist",
    "importable-package",
    "applications",
    "brief-studio",
    "application.json",
  ),
];

// Ordered: the server build's prebuild builds autobyteus-ts, the SDK contracts and the
// backend SDK; the devkit depends on the server and the SDKs; Brief Studio is packed
// with the devkit CLI directly, so the `autobyteus-app` bin link is not needed.
const PREPARE_STEPS = [
  { label: "server build (with shared packages)", command: "pnpm", args: ["-C", serverRoot, "build"] },
  {
    label: "application frontend SDK",
    command: "pnpm",
    args: ["-C", path.join(workspaceRoot, "autobyteus-application-frontend-sdk"), "build"],
  },
  { label: "application devkit", command: "pnpm", args: ["-C", devkitRoot, "build"] },
  {
    label: "Brief Studio importable package",
    command: process.execPath,
    args: [path.join(devkitRoot, "dist", "cli.js"), "pack"],
    cwd: briefStudioRoot,
  },
];

const findMissingArtifacts = () => REQUIRED_ARTIFACTS.filter((artifact) => !fs.existsSync(artifact));

const check = () => {
  const missing = findMissingArtifacts();
  if (missing.length === 0) {
    console.log("Integration test prerequisites are present.");
    return 0;
  }
  console.error("Integration test prerequisites are missing:");
  for (const artifact of missing) {
    console.error(`  - ${path.relative(workspaceRoot, artifact)}`);
  }
  console.error(`Build them from the repository root with: ${PREPARE_COMMAND}`);
  return 1;
};

const prepare = () => {
  for (const step of PREPARE_STEPS) {
    console.log(`\n[integration prerequisites] ${step.label}`);
    const result = spawnSync(step.command, step.args, {
      cwd: step.cwd ?? workspaceRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (result.status !== 0) {
      console.error(`[integration prerequisites] failed: ${step.label}`);
      return result.status ?? 1;
    }
  }
  return check();
};

const mode = process.argv[2];
if (mode === "check") {
  process.exit(check());
} else if (mode === "prepare") {
  process.exit(prepare());
} else {
  console.error("Usage: node ./scripts/integration-test-prerequisites.mjs <check|prepare>");
  process.exit(2);
}
