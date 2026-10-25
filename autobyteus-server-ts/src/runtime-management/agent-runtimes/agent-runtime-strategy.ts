import type { ReadDeadline } from "../read-deadline.js";
import type { AgentRuntimeKind, AgentRuntimeSignInRoute } from "./agent-runtime-types.js";
import type { SignInReading } from "./agent-runtime-sign-in-reader.js";
import type { UsageLimitsReading } from "./usage-limits/usage-limits-reading.js";

/**
 * `deadline`: the end time of the read step a call belongs to (the available-agent-runtimes read); every command inside
 * the call shares it. Without it (the Agent Runtimes page, launch readiness) each command keeps its usual time-out.
 */
export type RuntimeReadOptions = Readonly<{ deadline?: ReadDeadline }>;

/** A runtime's shared client kept open for one read; released (awaited) when the read is done. */
export type RuntimeClientHold = Readonly<{ release(): Promise<void> }>;

/**
 * What one runtime's commands and sources are. Stateless; the status service and the sign-in
 * reader select one by `runtimeKind`. `executable` is always what `resolveExecutable()` returned,
 * i.e. the same command AutoByteus runs agents with.
 */
export interface AgentRuntimeStrategy {
  readonly runtimeKind: AgentRuntimeKind;
  readonly signInRoute: AgentRuntimeSignInRoute;
  /** The vendor's official install page (DEC-004). */
  readonly installInstructionsUrl: string;
  /** The runtime's existing command resolver, unchanged (UD-007). */
  resolveExecutable(): string;
  /** The installed `x.y.z`, read fresh; null when the runtime cannot be run (not installed). */
  readVersion(executable: string, options?: RuntimeReadOptions): Promise<string | null>;
  /** The newest `x.y.z` from the vendor's own source (DEC-002); throws when it cannot be read. */
  readLatestVersion(executable: string): Promise<string>;
  /** The runtime's own sign-in report; never reads credentials. */
  readSignIn(executable: string, cwd: string, options?: RuntimeReadOptions): Promise<SignInReading>;
  /**
   * The runtime's own usage limits, read with 0 tokens, within the deadline; never throws (failure → `unknown`).
   * Which models each limit covers and whether it is exhausted follow the runtime's own rules.
   */
  readUsageLimits(executable: string, cwd: string, options: Readonly<{ deadline: ReadDeadline }>): Promise<UsageLimitsReading>;
  /**
   * Keeps the runtime's shared client for `cwd` open across one read's steps, so they start it once and no step meets
   * another's close. Only runtimes with a shared client implement it (Codex). Null when it cannot be held now.
   */
  holdClient?(cwd: string): RuntimeClientHold | null;
  /** The vendor's own update command (DEC-001). */
  updateArgv(executable: string): readonly string[];
  /** The vendor's own browser login; present only for the BROWSER route (Codex, Grok). */
  signInArgv?(executable: string): readonly string[];
}
