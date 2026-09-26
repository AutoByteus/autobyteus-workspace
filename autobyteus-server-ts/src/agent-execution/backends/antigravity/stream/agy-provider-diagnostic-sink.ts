import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

export type AgyProviderFailureDiagnostic = Readonly<
  | { kind: "tool"; runId: string; turnId: string; invocationId: string; providerState: string;
      providerError: unknown; providerOutput: unknown }
  | { kind: "turn"; runId: string; turnId: string; safeReasonCode: string;
      providerStatus: unknown; providerError: unknown; providerResponse: unknown }
>;

const bounded = (value: unknown): string => {
  try { return JSON.stringify(value)?.slice(0, 10_000) ?? "null"; }
  catch { return "[unserializable]"; }
};

export const recordAgyProviderDiagnostic = async (
  memoryDir: string, diagnostic: AgyProviderFailureDiagnostic,
): Promise<void> => {
  const directory = path.join(memoryDir, "agy-provider-diagnostics");
  try { await fs.mkdir(directory, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const directoryStat = await fs.lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error("AGY_DIAGNOSTIC_DIRECTORY_UNSAFE");
  await fs.chmod(directory, 0o700);
  const record = diagnostic.kind === "turn" ? {
    kind: "turn", runId: diagnostic.runId, turnId: diagnostic.turnId, safeReasonCode: diagnostic.safeReasonCode,
    providerStatus: bounded(diagnostic.providerStatus), providerError: bounded(diagnostic.providerError),
    providerResponse: bounded(diagnostic.providerResponse),
  } : {
    kind: "tool", runId: diagnostic.runId, turnId: diagnostic.turnId, invocationId: diagnostic.invocationId,
    providerState: diagnostic.providerState,
    providerError: bounded(diagnostic.providerError), providerOutput: bounded(diagnostic.providerOutput),
  };
  let line = JSON.stringify(record);
  if (Buffer.byteLength(line, "utf8") > 32 * 1024 - 1)
    line = JSON.stringify({ kind: diagnostic.kind, runId: diagnostic.runId, turnId: diagnostic.turnId,
      safeReasonCode: "DIAGNOSTIC_TRUNCATED" });
  const file = path.join(directory, "provider-failures.jsonl");
  const handle = await fs.open(file, constants.O_CREAT | constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW, 0o600);
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error("AGY_DIAGNOSTIC_FILE_UNSAFE");
    await handle.chmod(0o600);
    await handle.writeFile(`${line}\n`);
  } finally { await handle.close(); }
};
