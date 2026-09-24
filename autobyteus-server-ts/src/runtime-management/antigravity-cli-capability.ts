import { spawnSync } from "node:child_process";

const COMMAND = process.env.ANTIGRAVITY_CLI_COMMAND?.trim() || "agy";
const REQUIRED_FLAGS = ["--agent", "--new-project", "--add-dir", "--conversation", "--input-format", "--output-format", "--dangerously-skip-permissions"];

export const antigravityCommand = (): string => COMMAND;

export const probeAntigravityCli = (): { available: boolean; reason: string | null } => {
  const version = spawnSync(COMMAND, ["--version"], { encoding: "utf8", timeout: 3_000 });
  if (version.error || version.status !== 0) {
    return { available: false, reason: `Antigravity CLI '${COMMAND}' is unavailable: ${version.error?.message ?? version.stderr.trim()}` };
  }
  const match = /\b(\d+)\.(\d+)\.(\d+)\b/.exec(version.stdout);
  if (!match || Number(match[1]) !== 1 || Number(match[2]) !== 2 || Number(match[3]) < 10) {
    return { available: false, reason: `Antigravity CLI version '${version.stdout.trim()}' is not validated (requires 1.2.10-compatible).` };
  }
  const help = spawnSync(COMMAND, ["--help"], { encoding: "utf8", timeout: 3_000 });
  if (help.error || help.status !== 0 || REQUIRED_FLAGS.some((flag) => !(help.stdout + help.stderr).includes(flag))) {
    return { available: false, reason: "Antigravity CLI lacks required structured-run flags." };
  }
  return { available: true, reason: null };
};

export const listAntigravityModels = (): { id: string; name: string }[] => {
  const capability = probeAntigravityCli();
  if (!capability.available) throw new Error(capability.reason ?? "Antigravity CLI unavailable.");
  const result = spawnSync(COMMAND, ["models"], { encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Antigravity model discovery failed: ${result.error?.message ?? result.stderr.trim()}`);
  const models = result.stdout.split(/\r?\n/).map((line) => {
    const [id, name] = line.split("\t", 2);
    return id && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id) && name ? { id, name } : null;
  }).filter((model): model is { id: string; name: string } => model !== null);
  if (models.length === 0) throw new Error("Antigravity CLI returned no parseable models; check authentication and network access.");
  return models;
};
