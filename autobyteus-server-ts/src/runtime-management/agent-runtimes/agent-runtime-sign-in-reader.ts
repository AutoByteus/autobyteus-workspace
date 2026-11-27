import type { ReadDeadline } from "../read-deadline.js";
import type { AgentRuntimeStrategy } from "./agent-runtime-strategy.js";
import type { AgentRuntimeKind } from "./agent-runtime-types.js";
import type { ProviderRelayAccess, RelayedRuntimeKind } from "../../credential-proxy/provider-relays/provider-relay-access.js";
import { relayedNodeSettings } from "../../credential-proxy/provider-relays/provider-relay-settings.js";

const RELAYED_RUNTIME_KINDS: ReadonlySet<string> = new Set(["claude_agent_sdk", "codex_app_server", "grok_build", "deepseek_harness"]);
const isRelayedRuntimeKind = (runtimeKind: AgentRuntimeKind): runtimeKind is AgentRuntimeKind & RelayedRuntimeKind =>
  RELAYED_RUNTIME_KINDS.has(runtimeKind);

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

  /**
   * `providerRelays`: the process's provider relays (read on use: the composition sets them before it serves). On a
   * relayed node they, not the runtimes' own logins, decide sign-in (DS-005).
   */
  constructor(
    strategies: readonly AgentRuntimeStrategy[],
    private readonly providerRelays: () => Pick<ProviderRelayAccess, "isRelayed" | "statusOf"> | null,
  ) {
    this.strategies = new Map(strategies.map((strategy) => [strategy.runtimeKind, strategy]));
  }

  /**
   * `cwd`: the folder the runtime reads its project config from (Codex): a workspace, or the home folder.
   * `deadline`: the end time of the read step (the available-agent-runtimes read); without it, the usual time-outs.
   */
  read(runtimeKind: AgentRuntimeKind, input: Readonly<{ cwd: string; deadline?: ReadDeadline }>): Promise<SignInReading> {
    const strategy = this.strategies.get(runtimeKind);
    if (!strategy) throw new Error(`No agent runtime strategy for '${runtimeKind}'.`);
    const relayed = this.relayedReading(runtimeKind);
    if (relayed) return Promise.resolve(relayed);
    return strategy.readSignIn(strategy.resolveExecutable(), input.cwd, { deadline: input.deadline });
  }

  /** On a relayed node: signed in iff C1 gives the runtime a credential; `null` on an unrelayed node. */
  private relayedReading(runtimeKind: AgentRuntimeKind): SignInReading | null {
    const access = this.providerRelays();
    if (!(access ? access.isRelayed() : relayedNodeSettings() !== null)) return null;
    if (!isRelayedRuntimeKind(runtimeKind)) {
      return { state: "signedOut", detail: "This runtime cannot run on a relayed node: it cannot call its provider through a relay." };
    }
    if (!access) return { state: "signedOut", detail: "This node is relayed, but this process runs no AutoByteus credential proxy." };
    return access.statusOf(runtimeKind);
  }
}
