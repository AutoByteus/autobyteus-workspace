import os from "node:os";
import type { InitializeResponse } from "@agentclientprotocol/sdk";
import { commandBound, deadlineCause, type ReadDeadline } from "../read-deadline.js";
import type { AcpAgentLaunchProfile } from "./acp-agent-launch-profile.js";
import { AcpAgentProcess } from "./acp-agent-process.js";
import { AcpClientConnection } from "./acp-client-connection.js";

const DISCOVERY_TIMEOUT_MS = 15_000;

export type AcpDiscoveryFailureKind = "unavailable" | "timeout" | "failed";

/** Classified discovery failure; carries no provider output, paths or credentials. */
export class AcpDiscoveryError extends Error {
  /** `cause`: a `DeadlineExceededError` when a read step's deadline ended the process. */
  constructor(readonly kind: AcpDiscoveryFailureKind, agentLabel: string, options?: { cause: Error }) {
    super(`ACP_DISCOVERY_${kind.toUpperCase()}: ${agentLabel} discovery ${kind === "timeout" ? "timed out" : kind === "unavailable" ? "could not start the agent" : "failed"}.`, options);
    this.name = "AcpDiscoveryError";
  }
}

/** `deadline`: the end time of the whole read step this short process belongs to; without it, the usual 15 s. */
export type AcpShortProcessOptions = Readonly<{ deadline?: ReadDeadline }>;

/**
 * Runs a short-lived agent process for `use` (no session, no prompt, so no inference), bounded by the usual time-out
 * cut to the step's deadline. The process is always stopped.
 */
const withShortAcpProcess = async <T>(
  profile: AcpAgentLaunchProfile,
  options: AcpShortProcessOptions,
  use: (connection: AcpClientConnection) => Promise<T>,
): Promise<T> => {
  const bound = commandBound(options.deadline, DISCOVERY_TIMEOUT_MS);
  const timedOut = () => new AcpDiscoveryError("timeout", profile.agentLabel, deadlineCause(bound));
  if (bound.timeoutMs <= 0) throw timedOut();
  const process = AcpAgentProcess.spawn({
    command: profile.command(),
    args: profile.args({ model: null, reasoningEffort: null }),
    env: profile.env(globalThis.process.env),
    cwd: os.tmpdir(),
  });
  const connection = new AcpClientConnection(process, profile.agentLabel);
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const closed = new Promise<never>((_, reject) => connection.onClose((close) => reject(
      new AcpDiscoveryError(close.exit?.spawnErrorCode === "ENOENT" ? "unavailable" : "failed", profile.agentLabel))));
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(timedOut()), bound.timeoutMs);
    });
    return await Promise.race([use(connection), closed, timeout]);
  } catch (error) {
    throw error instanceof AcpDiscoveryError ? error : new AcpDiscoveryError("failed", profile.agentLabel);
  } finally {
    if (timer) clearTimeout(timer);
    await connection.close();
  }
};

/** The agent's `initialize` result from a short-lived process (catalog discovery). */
export const runAcpDiscoveryHandshake = (
  profile: AcpAgentLaunchProfile,
  options: AcpShortProcessOptions = {},
): Promise<InitializeResponse> => withShortAcpProcess(profile, options, (connection) => connection.initialize());

/**
 * One agent extension request (an agent's own method, e.g. its billing) after `initialize`, on a short-lived process within the
 * same bound; the method name is sent as given. Starts no session, so it spends no tokens.
 */
export const runAcpExtensionRequest = (
  profile: AcpAgentLaunchProfile,
  method: string,
  options: AcpShortProcessOptions = {},
): Promise<Record<string, unknown>> => withShortAcpProcess(profile, options, async (connection) => {
  await connection.initialize();
  return connection.extension(method, {});
});
