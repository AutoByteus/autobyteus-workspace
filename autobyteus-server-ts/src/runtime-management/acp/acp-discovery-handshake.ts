import os from "node:os";
import type { InitializeResponse, SessionConfigOption, SessionInfo } from "@agentclientprotocol/sdk";
import { commandBound, deadlineCause, type ReadDeadline } from "../read-deadline.js";
import type { AcpAgentLaunchProfile, AcpLaunch } from "./acp-agent-launch-profile.js";
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

/** Where a short process runs and the provider relay address it gets (without a pass). */
export type AcpShortProcessPlace = Readonly<{ cwd: string; relayBaseUrl: string | null }>;

const TEMPORARY_PLACE: AcpShortProcessPlace = Object.freeze({ cwd: os.tmpdir(), relayBaseUrl: null });

/**
 * Runs a short-lived agent process for `use` (no session, no prompt, so no inference), bounded by the usual time-out
 * cut to the step's deadline. The process is always stopped.
 */
const withShortAcpProcess = async <T>(
  profile: AcpAgentLaunchProfile,
  place: AcpShortProcessPlace,
  options: AcpShortProcessOptions,
  use: (connection: AcpClientConnection) => Promise<T>,
): Promise<T> => {
  const bound = commandBound(options.deadline, DISCOVERY_TIMEOUT_MS);
  const timedOut = () => new AcpDiscoveryError("timeout", profile.agentLabel, deadlineCause(bound));
  if (bound.timeoutMs <= 0) throw timedOut();
  let launch: AcpLaunch;
  try {
    launch = await profile.discoveryLaunch({ relayBaseUrl: place.relayBaseUrl });
  } catch {
    throw new AcpDiscoveryError("failed", profile.agentLabel);
  }
  const process = AcpAgentProcess.spawn({
    command: profile.command(), args: launch.args, env: launch.env, cwd: place.cwd,
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
    await launch.release().catch(() => undefined);
  }
};

/** The agent's `initialize` result from a short-lived process (catalog discovery). */
export const runAcpDiscoveryHandshake = (
  profile: AcpAgentLaunchProfile,
  options: AcpShortProcessOptions = {},
): Promise<InitializeResponse> =>
  withShortAcpProcess(profile, TEMPORARY_PLACE, options, (connection) => connection.initialize());

/**
 * One agent extension request (an agent's own method, e.g. its billing) after `initialize`, on a short-lived process within the
 * same bound; the method name is sent as given. Starts no session, so it spends no tokens.
 */
export const runAcpExtensionRequest = (
  profile: AcpAgentLaunchProfile,
  method: string,
  options: AcpShortProcessOptions = {},
): Promise<Record<string, unknown>> => withShortAcpProcess(profile, TEMPORARY_PLACE, options, async (connection) => {
  await connection.initialize();
  return connection.extension(method, {});
});

const newestSession = (sessions: readonly SessionInfo[]): SessionInfo | null =>
  sessions.reduce<SessionInfo | null>((newest, session) =>
    !newest || (session.updatedAt ?? "") > (newest.updatedAt ?? "") ? session : newest, null);

/**
 * The agent's session config options (models, reasoning effort) from a short-lived process in `cwd`: the newest session
 * listed there is resumed, or one is created, and closed again, so repeated discovery keeps one session. Sends no
 * prompt, so it spends no tokens.
 */
export const runAcpSessionOptionsDiscovery = (
  profile: AcpAgentLaunchProfile,
  place: AcpShortProcessPlace,
  options: AcpShortProcessOptions = {},
): Promise<SessionConfigOption[]> => withShortAcpProcess(profile, place, options, async (connection) => {
  const initialized = await connection.initialize();
  const sessionCapabilities = initialized.agentCapabilities?.sessionCapabilities;
  const listed = sessionCapabilities?.list && sessionCapabilities.resume
    ? newestSession((await connection.listSessions({ cwd: place.cwd })).sessions)
    : null;
  let sessionId: string;
  let configOptions: SessionConfigOption[];
  if (listed) {
    sessionId = listed.sessionId;
    configOptions = (await connection.resumeSession({ sessionId, cwd: place.cwd, mcpServers: [] })).configOptions ?? [];
  } else {
    const created = await connection.newSession({ cwd: place.cwd, mcpServers: [] });
    sessionId = created.sessionId;
    configOptions = created.configOptions ?? [];
  }
  if (sessionCapabilities?.close) await connection.closeSession(sessionId);
  return configOptions;
});
