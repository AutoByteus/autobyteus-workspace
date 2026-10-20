import type { AgentRuntimeKind, AgentRuntimeSignInRoute } from "./agent-runtime-types.js";
import type { SignInReading } from "./agent-runtime-sign-in-reader.js";

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
  readVersion(executable: string): Promise<string | null>;
  /** The newest `x.y.z` from the vendor's own source (DEC-002); throws when it cannot be read. */
  readLatestVersion(executable: string): Promise<string>;
  /** The runtime's own sign-in report; never reads credentials. */
  readSignIn(executable: string, cwd: string): Promise<SignInReading>;
  /** The vendor's own update command (DEC-001). */
  updateArgv(executable: string): readonly string[];
  /** The vendor's own browser login; present only for the BROWSER route (Codex, Grok). */
  signInArgv?(executable: string): readonly string[];
}
