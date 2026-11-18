import type { ReadDeadline } from "../read-deadline.js";
import type { AgentRuntimeStrategy } from "./agent-runtime-strategy.js";
import type { AgentRuntimeKind } from "./agent-runtime-types.js";

/**
 * A runtime's sign-in report. `detail` stays on the server: application launch readiness uses it
 * in its reason text; it never reaches GraphQL or logs (REQ-008).
 */
export type SignInReading =
  | Readonly<{ state: "signedIn" }>
  | Readonly<{ state: "signedOut"; detail: string }>
  /** Codex with no account and an OpenAI sign-in that is not required (custom provider, DEC-008). */
  | Readonly<{ state: "notRequired" }>
  /** The report could not be obtained (command or protocol failure). */
  | Readonly<{ state: "unknown"; detail: string }>;

/**
 * The one owner of "is this runtime signed in", for the Agent Runtimes page and application
 * launch readiness alike. Stateless: each read asks the runtime itself.
 */
export class AgentRuntimeSignInReader {
  private readonly strategies: ReadonlyMap<AgentRuntimeKind, AgentRuntimeStrategy>;

  constructor(strategies: readonly AgentRuntimeStrategy[]) {
    this.strategies = new Map(strategies.map((strategy) => [strategy.runtimeKind, strategy]));
  }

  /**
   * `cwd`: the folder the runtime reads its project config from (Codex): a workspace, or the home folder.
   * `deadline`: the end time of the read step (the available-agent-runtimes read); without it, the usual time-outs.
   */
  read(runtimeKind: AgentRuntimeKind, input: Readonly<{ cwd: string; deadline?: ReadDeadline }>): Promise<SignInReading> {
    const strategy = this.strategies.get(runtimeKind);
    if (!strategy) throw new Error(`No agent runtime strategy for '${runtimeKind}'.`);
    return strategy.readSignIn(strategy.resolveExecutable(), input.cwd, { deadline: input.deadline });
  }
}
