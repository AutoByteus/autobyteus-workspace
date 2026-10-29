import type { RuntimeKind } from "../runtime-kind-enum.js";

/** The four external runtimes the Agent Runtimes page shows, in page order. */
export type AgentRuntimeKind =
  | RuntimeKind.CODEX_APP_SERVER
  | RuntimeKind.CLAUDE_AGENT_SDK
  | RuntimeKind.ANTIGRAVITY_CLI
  | RuntimeKind.GROK_BUILD;

export type AgentRuntimeUpdateState = "checking" | "upToDate" | "updateAvailable" | "checkFailed" | "notChecked";

/** `notApplicable`: not installed, or Codex with a provider that needs no OpenAI sign-in (DEC-008). */
export type AgentRuntimeAccountState = "checking" | "signedIn" | "signedOut" | "unknown" | "notApplicable";

/** BROWSER: the page starts the runtime's own login. COMMAND_LINE: the user signs in from its command line. */
export type AgentRuntimeSignInRoute = "browser" | "commandLine";

export type AgentRuntimeOperation =
  | Readonly<{ kind: "update"; state: "running"; command: string; step: string | null; fromVersion: string }>
  | Readonly<{ kind: "update"; state: "succeeded"; command: string; fromVersion: string; toVersion: string }>
  /** `error`: the vendor's own output (ANSI stripped, at most 4 KB). */
  | Readonly<{ kind: "update"; state: "failed"; command: string; fromVersion: string; error: string }>
  | Readonly<{ kind: "signIn"; state: "running" }>
  | Readonly<{ kind: "signIn"; state: "didNotFinish" }>;

/** One row of the page, as the status service holds it. `installedVersion` is null iff not installed. */
export type AgentRuntimeStatus = Readonly<{
  runtimeKind: AgentRuntimeKind;
  installed: boolean;
  installedVersion: string | null;
  updateState: AgentRuntimeUpdateState;
  latestVersion: string | null;
  accountState: AgentRuntimeAccountState;
  signInRoute: AgentRuntimeSignInRoute;
  installInstructionsUrl: string;
  runningAgentCount: number;
  operation: AgentRuntimeOperation | null;
  /** When this runtime's last check finished; null before the first one. */
  checkedAt: Date | null;
}>;

/**
 * One runtime's update facts for the update notifications: no status, no operation.
 * `checked` is false until a check in this process read the installed version.
 */
export type RuntimeUpdateState = Readonly<{
  runtimeKind: AgentRuntimeKind;
  checked: boolean;
  /** Null when not installed (or not checked yet). */
  installedVersion: string | null;
  /** The newest version when newer than the installed one, else the installed one; null when unknown. */
  latestVersion: string | null;
  /** The last check could not read the newest version; the installed one is current. */
  checkFailed: boolean;
  lastCheckedAt: Date | null;
}>;

export type RuntimeUpdateRefusalReason = "NOT_INSTALLED" | "BUSY" | "AGENTS_RUNNING";

/** A refused update: nothing was started. */
export type RuntimeUpdateRefusal = Readonly<{ result: "refused"; reason: RuntimeUpdateRefusalReason; runningAgents: number }>;

/** The result of one update through `AgentRuntimeStatusService.runUpdate`. */
export type RuntimeUpdateResult =
  | RuntimeUpdateRefusal
  | Readonly<{ result: "updated"; fromVersion: string; toVersion: string }>
  /** `error`: the vendor's own output, as the page shows it. */
  | Readonly<{ result: "failed"; error: string }>;
