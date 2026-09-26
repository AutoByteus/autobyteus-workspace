import os from "node:os";
import type { InitializeResponse } from "@agentclientprotocol/sdk";
import type { AcpAgentLaunchProfile } from "./acp-agent-launch-profile.js";
import { AcpAgentProcess } from "./acp-agent-process.js";
import { AcpClientConnection } from "./acp-client-connection.js";

const DISCOVERY_TIMEOUT_MS = 15_000;

export type AcpDiscoveryFailureKind = "unavailable" | "timeout" | "failed";

/** Classified discovery failure; carries no provider output, paths or credentials. */
export class AcpDiscoveryError extends Error {
  constructor(readonly kind: AcpDiscoveryFailureKind, agentLabel: string) {
    super(`ACP_DISCOVERY_${kind.toUpperCase()}: ${agentLabel} discovery ${kind === "timeout" ? "timed out" : kind === "unavailable" ? "could not start the agent" : "failed"}.`);
    this.name = "AcpDiscoveryError";
  }
}

/**
 * Runs a short-lived agent process through `initialize` only (no session, no prompt, so no
 * inference) and returns the agent's `initialize` result. The process is always stopped.
 */
export const runAcpDiscoveryHandshake = async (
  profile: AcpAgentLaunchProfile,
  timeoutMs: number = DISCOVERY_TIMEOUT_MS,
): Promise<InitializeResponse> => {
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
      timer = setTimeout(() => reject(new AcpDiscoveryError("timeout", profile.agentLabel)), timeoutMs);
    });
    return await Promise.race([connection.initialize(), closed, timeout]);
  } catch (error) {
    throw error instanceof AcpDiscoveryError ? error : new AcpDiscoveryError("failed", profile.agentLabel);
  } finally {
    if (timer) clearTimeout(timer);
    await connection.close();
  }
};
