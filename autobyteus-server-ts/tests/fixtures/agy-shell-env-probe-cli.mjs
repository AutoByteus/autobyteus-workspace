#!/usr/bin/env node
// Scripted AGY CLI that also runs a shell probe with its own environment (autobyteus-311, GitHub credential proxy).
// Use: ANTIGRAVITY_CLI_COMMAND=<absolute path to this file>. On a run launch (not `--version`, `--help`, `models` or
// `-p /usage`) it starts `bash $AGY_SHELL_PROBE_SCRIPT <AGY_SHELL_PROBE_DIR>/<run memory folder name>` as a child, as
// the real AGY's shell tool would inherit the AGY process's environment, and then continues as
// `agy-failure-cli.mjs` (its AGY_FAKE_CASE switches apply). The run memory folder is the parent of the capsule
// (`<memoryDir>/agy-project`, the process's cwd), so its name is the run ID. Without both variables it is exactly
// `agy-failure-cli.mjs`.
import { spawn } from "node:child_process";
import path from "node:path";

const arg = process.argv[2];
const isRunLaunch = !["--version", "--help", "models"].includes(arg)
  && !(process.argv.includes("-p") && process.argv.includes("/usage"));
const script = process.env.AGY_SHELL_PROBE_SCRIPT;
const probeRoot = process.env.AGY_SHELL_PROBE_DIR;
if (isRunLaunch && script && probeRoot) {
  const out = path.join(probeRoot, path.basename(path.dirname(process.cwd())));
  // Not awaited: the CLI answers its launch handshake while the probe's network calls run.
  spawn("bash", [script, out], { stdio: "ignore", env: process.env }).on("error", () => undefined);
}
await import("./agy-failure-cli.mjs");
