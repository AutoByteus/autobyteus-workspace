import os from "node:os";
import type { InitializeResponse, SessionConfigOption, SessionInfo } from "@agentclientprotocol/sdk";
import { commandBound, deadlineCause, type ReadDeadline } from "../read-deadline.js";
import type { AcpAgentLaunchProfile, AcpDiscoveryLaunchRequest, AcpLaunch } from "./acp-agent-launch-profile.js";
import { AcpAgentProcess } from "./acp-agent-process.js";
import { AcpClientConnection } from "./acp-client-connection.js";

/**
 * The bound of one short agent process (autobyteus-551): an agent's start-up alone may take as long as a run's
 * (`AGENT_START_TIMEOUT_MS` in the connection, 90 s), so its short processes get the same.
 */
const DISCOVERY_TIMEOUT_MS = 90_000;
/** A follow-up wait ends this long before the short process's bound, so it never turns the answer into a time-out. */
const FOLLOW_UP_BOUND_MARGIN_MS = 250;

export type AcpDiscoveryFailureKind = "unavailable" | "timeout" | "failed";

/** Classified discovery failure; carries no provider output, paths or credentials. */
export class AcpDiscoveryError extends Error {
  /** `cause`: a `DeadlineExceededError` when a read step's deadline ended the process. */
  constructor(readonly kind: AcpDiscoveryFailureKind, agentLabel: string, options?: { cause: Error }) {
    super(`ACP_DISCOVERY_${kind.toUpperCase()}: ${agentLabel} discovery ${kind === "timeout" ? "timed out" : kind === "unavailable" ? "could not start the agent" : "failed"}.`, options);
    this.name = "AcpDiscoveryError";
  }
}

/** `deadline`: the end time of the whole read step this short process belongs to; without it, the usual 90 s. */
export type AcpShortProcessOptions = Readonly<{ deadline?: ReadDeadline }>;

/** Where a short process runs and the provider relay it gets (`AcpDiscoveryLaunchRequest`). */
export type AcpShortProcessPlace = Readonly<{ cwd: string }> & AcpDiscoveryLaunchRequest;

/** A short process with no relay (an unrelayed node's own agent). */
export const NO_RELAY: AcpDiscoveryLaunchRequest = Object.freeze({ relayBaseUrl: null, nodeRelayAccess: null });

const TEMPORARY_PLACE: AcpShortProcessPlace = Object.freeze({ cwd: os.tmpdir(), ...NO_RELAY });

/**
 * Runs a short-lived agent process for `use` (no session, no prompt, so no inference), bounded by the usual time-out
 * cut to the step's deadline. `use` gets the time the bound ends (`Date.now()` scale). The process is always stopped.
 */
const withShortAcpProcess = async <T>(
  profile: AcpAgentLaunchProfile,
  place: AcpShortProcessPlace,
  options: AcpShortProcessOptions,
  use: (connection: AcpClientConnection, boundEndsAt: number) => Promise<T>,
): Promise<T> => {
  const bound = commandBound(options.deadline, DISCOVERY_TIMEOUT_MS);
  const timedOut = () => new AcpDiscoveryError("timeout", profile.agentLabel, deadlineCause(bound));
  if (bound.timeoutMs <= 0) throw timedOut();
  let launch: AcpLaunch;
  try {
    launch = await profile.discoveryLaunch({ relayBaseUrl: place.relayBaseUrl, nodeRelayAccess: place.nodeRelayAccess });
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
    const boundEndsAt = Date.now() + bound.timeoutMs;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(timedOut()), bound.timeoutMs);
    });
    return await Promise.race([use(connection, boundEndsAt), closed, timeout]);
  } catch (error) {
    throw error instanceof AcpDiscoveryError ? error : new AcpDiscoveryError("failed", profile.agentLabel);
  } finally {
    if (timer) clearTimeout(timer);
    await connection.close();
    await launch.release().catch(() => undefined);
  }
};

/**
 * A connection-wide notification an agent may send shortly after `initialize` that replaces part of its answer (e.g. a
 * catalog it refreshed during start-up): its method, and how long after the answer to wait for it.
 */
export type AcpFollowUpNotification = Readonly<{ method: string; withinMs: number }>;

/** `followUp`: the params of the first follow-up notification, or `null` when none came within the wait. */
export type AcpDiscoveryHandshake = Readonly<{ initialize: InitializeResponse; followUp: Record<string, unknown> | null }>;

/**
 * The agent's `initialize` result from a short-lived process (catalog discovery), with its follow-up notification. The
 * listener is attached before `initialize`, so a notification that comes before the answer is kept. After the answer
 * the wait ends at the first matching notification, `withinMs` after the answer, or shortly before the process's bound
 * ends, whichever is first; it never times out itself: without a notification the answer is returned alone.
 */
export const runAcpDiscoveryHandshake = (
  profile: AcpAgentLaunchProfile,
  followUp: AcpFollowUpNotification,
  options: AcpShortProcessOptions = {},
  relay: AcpDiscoveryLaunchRequest = NO_RELAY,
): Promise<AcpDiscoveryHandshake> => withShortAcpProcess(profile, { ...TEMPORARY_PLACE, ...relay }, options, async (connection, boundEndsAt) => {
  const seen: { params: Record<string, unknown> | null; arrived: (() => void) | null } = { params: null, arrived: null };
  const unsubscribe = connection.onConnectionNotification((method, params) => {
    if (method !== followUp.method || seen.params) return;
    seen.params = params;
    seen.arrived?.();
  });
  try {
    const initialize = await connection.initialize();
    const waitMs = Math.min(followUp.withinMs, boundEndsAt - FOLLOW_UP_BOUND_MARGIN_MS - Date.now());
    if (!seen.params && waitMs > 0) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, waitMs);
        seen.arrived = () => { clearTimeout(timer); resolve(); };
      });
    }
    return { initialize, followUp: seen.params };
  } finally {
    unsubscribe();
  }
});

/**
 * One agent extension request (an agent's own method, e.g. its billing) after `initialize`, on a short-lived process within the
 * same bound; the method name is sent as given. Starts no session, so it spends no tokens.
 */
export const runAcpExtensionRequest = (
  profile: AcpAgentLaunchProfile,
  method: string,
  options: AcpShortProcessOptions = {},
  relay: AcpDiscoveryLaunchRequest = NO_RELAY,
): Promise<Record<string, unknown>> => withShortAcpProcess(profile, { ...TEMPORARY_PLACE, ...relay }, options, async (connection) => {
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
