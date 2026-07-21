import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = path.resolve(import.meta.dirname, "..");
const smokeScript = path.join(rootDir, "scripts", "smoke-built-in-agents-bootstrap.mjs");
const sanitizedEnvironment = {};

for (const key of ["PATH", "HOME", "USERPROFILE", "TMPDIR", "TMP", "TEMP", "SystemRoot", "WINDIR"]) {
  const value = process.env[key];
  if (value) sanitizedEnvironment[key] = value;
}

const result = spawnSync(process.execPath, [smokeScript], {
  cwd: rootDir,
  env: sanitizedEnvironment,
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`Sanitized built-in agents bootstrap smoke exited with status ${String(result.status)}.`);
}

console.info("Sanitized built-module/bootstrap smoke passed without DATABASE_URL.");
