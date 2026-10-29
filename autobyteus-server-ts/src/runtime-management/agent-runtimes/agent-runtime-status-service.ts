import os from "node:os";
import path from "node:path";
import type { AgentRuntimeSignInReader, SignInReading } from "./agent-runtime-sign-in-reader.js";
import type { AgentRuntimeStrategy } from "./agent-runtime-strategy.js";
import type {
  AgentRuntimeAccountState, AgentRuntimeKind, AgentRuntimeOperation, AgentRuntimeStatus, AgentRuntimeUpdateState,
  RuntimeUpdateRefusal, RuntimeUpdateResult, RuntimeUpdateState,
} from "./agent-runtime-types.js";
import { OPERATION_TIMEOUT_MS, RuntimeProcessOperation } from "./runtime-process-operation.js";
import { compareRuntimeVersions } from "./runtime-version.js";
import { isSignInBrowserAvailable } from "./sign-in-browser-availability.js";

export type AgentRuntimeErrorCode =
  | "AGENT_RUNTIME_UNKNOWN"
  | "AGENT_RUNTIME_NOT_INSTALLED"
  | "AGENT_RUNTIME_BUSY"
  | "AGENT_RUNTIME_AGENTS_RUNNING"
  | "AGENT_RUNTIME_SIGN_IN_UNSUPPORTED"
  | "AGENT_RUNTIMES_CLOSED";

/** A refused action; its message is safe to show (it never carries vendor output). */
export class AgentRuntimeError extends Error {
  constructor(readonly code: AgentRuntimeErrorCode, message: string) {
    super(message);
    this.name = "AgentRuntimeError";
  }
}

export type AgentRuntimeStatusServiceDependencies = Readonly<{
  strategies: readonly AgentRuntimeStrategy[];
  signInReader: Pick<AgentRuntimeSignInReader, "read">;
  /** Running agents of that runtime on this node: standalone, team, Org and Application agents. */
  countRunningAgents: (runtimeKind: AgentRuntimeKind) => number;
  /** The folder sign-in reads use as cwd (Codex reads its global config there); the home folder by default. */
  homeDirectory?: string;
  createProcess?: (argv: readonly string[], options: Readonly<{ timeoutMs: number }>) => RuntimeProcessOperation;
  /** Whether the runtimes' own logins can open a browser on this node's desktop; by default read once from this process. */
  signInBrowserAvailable?: boolean;
}>;

type Row = {
  readonly strategy: AgentRuntimeStrategy;
  installed: boolean;
  installedVersion: string | null;
  updateState: AgentRuntimeUpdateState;
  latestVersion: string | null;
  accountState: AgentRuntimeAccountState;
  operation: AgentRuntimeOperation | null;
  process: RuntimeProcessOperation | null;
  checking: boolean;
  /** Each check takes the next number; a result is written only while its check is the latest. */
  generation: number;
  checkedAt: Date | null;
};

const accountStateOf = (reading: SignInReading): AgentRuntimeAccountState => {
  switch (reading.state) {
    case "signedIn": return "signedIn";
    case "signedOut": return "signedOut";
    case "notRequired": return "notApplicable";
    case "unknown": return "unknown";
  }
};

const commandLabel = (argv: readonly string[]): string =>
  [path.basename(argv[0] ?? ""), ...argv.slice(1)].join(" ");

const REFUSAL_ERRORS: Record<RuntimeUpdateRefusal["reason"], (agents: number) => AgentRuntimeError> = {
  NOT_INSTALLED: () => new AgentRuntimeError("AGENT_RUNTIME_NOT_INSTALLED", "This runtime is not installed."),
  BUSY: () => new AgentRuntimeError("AGENT_RUNTIME_BUSY", "This runtime is already updating or signing in."),
  AGENTS_RUNNING: (agents) =>
    new AgentRuntimeError("AGENT_RUNTIME_AGENTS_RUNNING", `Update unavailable while ${agents} agent(s) are running.`),
};

/**
 * The Agent Runtimes page's state for this node: per runtime its installed version, newest
 * version, sign-in state and at most one running vendor process (update or sign-in). Checks run
 * independently per runtime; the page polls `list()`, which never starts work.
 */
export class AgentRuntimeStatusService {
  private readonly rows: ReadonlyMap<AgentRuntimeKind, Row>;
  private readonly homeDirectory: string;
  private readonly createProcess: NonNullable<AgentRuntimeStatusServiceDependencies["createProcess"]>;
  private readonly browserAvailable: boolean;
  private closed = false;
  private updateStateListener: (() => void) | null = null;

  constructor(private readonly dependencies: AgentRuntimeStatusServiceDependencies) {
    this.rows = new Map(dependencies.strategies.map((strategy) => [strategy.runtimeKind, {
      strategy,
      installed: false,
      installedVersion: null,
      updateState: "notChecked",
      latestVersion: null,
      accountState: "notApplicable",
      operation: null,
      process: null,
      checking: false,
      generation: 0,
      checkedAt: null,
    } satisfies Row]));
    this.homeDirectory = dependencies.homeDirectory ?? os.homedir();
    this.createProcess = dependencies.createProcess
      ?? ((argv, options) => new RuntimeProcessOperation(argv, options));
    this.browserAvailable = dependencies.signInBrowserAvailable
      ?? isSignInBrowserAvailable(process.platform, process.env);
  }

  /**
   * Whether this node's runtimes' own logins can open a browser on its own desktop (a Docker
   * node's VNC Chromium, a desktop session); the page offers Sign in on a remote node only then.
   * Fixed for the server's lifetime; reading it starts no work.
   */
  signInBrowserAvailable(): boolean {
    return this.browserAvailable;
  }

  /** The rows in page order. Reads only. */
  list(): AgentRuntimeStatus[] {
    return [...this.rows.values()].map((row) => ({
      runtimeKind: row.strategy.runtimeKind,
      installed: row.installed,
      installedVersion: row.installedVersion,
      updateState: row.updateState,
      latestVersion: row.latestVersion,
      accountState: row.accountState,
      signInRoute: row.strategy.signInRoute,
      installInstructionsUrl: row.strategy.installInstructionsUrl,
      runningAgentCount: this.runningAgents(row),
      operation: row.operation?.kind === "update" && row.operation.state === "running"
        ? { ...row.operation, step: row.process?.latestLine() ?? null }
        : row.operation,
      checkedAt: row.checkedAt,
    }));
  }

  /**
   * A user-started check (page open, Check again): clears finished update/sign-in results and
   * checks every runtime that is not checking and has no running operation. Settles once their
   * installed versions are read; newest versions and sign-in states arrive independently later.
   */
  async checkAll(): Promise<void> {
    this.assertOpen();
    const installReads: Promise<void>[] = [];
    for (const row of this.rows.values()) {
      if (row.operation?.state === "running") continue;
      row.operation = null;
      if (!row.checking) installReads.push(this.check(row));
    }
    await Promise.all(installReads);
  }

  /** Starts the runtime's own update (the page); a refusal throws its existing error code. */
  startUpdate(runtimeKind: AgentRuntimeKind): void {
    const started = this.beginUpdate(runtimeKind);
    if ("result" in started) throw REFUSAL_ERRORS[started.reason](started.runningAgents);
  }

  /**
   * The same update, awaited (a notification's Update, the automatic update): refused while the
   * runtime's agents run, when not installed or busy; otherwise the vendor update's result.
   */
  runUpdate(runtimeKind: AgentRuntimeKind): Promise<RuntimeUpdateResult> {
    const started = this.beginUpdate(runtimeKind);
    return "result" in started ? Promise.resolve(started) : started;
  }

  /**
   * A background check (the update notifications' pass): reads the installed and newest versions
   * only, never the sign-in (which for Codex starts its app-server), and keeps finished update and
   * sign-in results. Skipped while the runtime is checking or has a running operation.
   */
  async checkInBackground(runtimeKind: AgentRuntimeKind): Promise<void> {
    const row = this.requireRow(runtimeKind);
    if (row.checking || row.operation?.state === "running") return;
    const generation = ++row.generation;
    const current = () => row.generation === generation && !this.closed;
    row.checking = true;
    row.updateState = "checking";
    let executable: string | null = null;
    let version: string | null = null;
    try {
      executable = row.strategy.resolveExecutable();
      version = await row.strategy.readVersion(executable);
    } catch {
      version = null;
    }
    if (!current()) return;
    row.installedVersion = version;
    row.installed = version !== null;
    if (!row.installed || !executable) {
      row.updateState = "notChecked";
      row.latestVersion = null;
      row.accountState = "notApplicable";
    } else {
      try {
        const latest = await row.strategy.readLatestVersion(executable);
        if (!current()) return;
        row.latestVersion = latest;
        row.updateState = compareRuntimeVersions(latest, version!) > 0 ? "updateAvailable" : "upToDate";
      } catch {
        if (!current()) return;
        row.latestVersion = null;
        row.updateState = "checkFailed";
      }
    }
    this.finishCheck(row);
  }

  /** Each runtime's update facts, in page order. Reads only. */
  listUpdateStates(): RuntimeUpdateState[] {
    return [...this.rows.values()].map((row) => ({
      runtimeKind: row.strategy.runtimeKind,
      checked: row.checkedAt !== null,
      installedVersion: row.installedVersion,
      latestVersion: row.updateState === "updateAvailable" ? row.latestVersion
        : row.updateState === "upToDate" ? row.installedVersion : null,
      checkFailed: row.updateState === "checkFailed",
      lastCheckedAt: row.checkedAt,
    }));
  }

  /** One listener, told after a check finished or an update settled. */
  setUpdateStateListener(listener: (() => void) | null): void {
    this.updateStateListener = listener;
  }

  /** Starts the runtime's own browser login (Codex, Grok); the vendor CLI opens the browser. */
  startSignIn(runtimeKind: AgentRuntimeKind): void {
    const row = this.requireRow(runtimeKind);
    if (!row.strategy.signInArgv) {
      throw new AgentRuntimeError("AGENT_RUNTIME_SIGN_IN_UNSUPPORTED", "Sign in from this runtime's command line.");
    }
    this.requireIdleInstalledRow(runtimeKind);
    const process = this.createProcess(
      row.strategy.signInArgv(row.strategy.resolveExecutable()),
      { timeoutMs: OPERATION_TIMEOUT_MS },
    );
    row.process = process;
    row.operation = { kind: "signIn", state: "running" };
    // The output can hold a sign-in URL or code: it is never kept, shown or logged (REQ-008).
    void process.finished.then(async (result) => {
      if (row.process !== process || this.closed) return;
      if (result.cancelled && !result.timedOut) {
        row.process = null;
        row.operation = null;
        return;
      }
      const reading = await this.readSignIn(row);
      if (row.process !== process || this.closed) return;
      row.process = null;
      row.accountState = accountStateOf(reading);
      row.operation = reading.state === "signedIn" ? null : { kind: "signIn", state: "didNotFinish" };
    });
  }

  /** Stops a running sign-in; the row returns to its Sign in button. */
  cancelSignIn(runtimeKind: AgentRuntimeKind): void {
    const row = this.requireRow(runtimeKind);
    if (row.operation?.kind === "signIn" && row.operation.state === "running") row.process?.cancel();
  }

  /** Server close: no new work; every running vendor process is stopped (QR-003). */
  async close(): Promise<void> {
    this.closed = true;
    const running = [...this.rows.values()].map((row) => row.process).filter((process) => process !== null);
    for (const process of running) process.cancel();
    await Promise.all(running.map((process) => process.finished));
  }

  private async check(row: Row): Promise<void> {
    const generation = ++row.generation;
    const current = () => row.generation === generation && !this.closed;
    row.checking = true;
    row.updateState = "checking";
    if (!row.installed) row.accountState = "checking";
    let executable: string | null = null;
    let version: string | null = null;
    try {
      executable = row.strategy.resolveExecutable();
      version = await row.strategy.readVersion(executable);
    } catch {
      version = null;
    }
    if (!current()) return;
    row.installedVersion = version;
    row.installed = version !== null;
    if (!row.installed || !executable) {
      row.updateState = "notChecked";
      row.latestVersion = null;
      row.accountState = "notApplicable";
      this.finishCheck(row);
      return;
    }
    const installedVersion = row.installedVersion!;
    const latest = row.strategy.readLatestVersion(executable).then((version) => {
      if (!current()) return;
      row.latestVersion = version;
      row.updateState = compareRuntimeVersions(version, installedVersion) > 0 ? "updateAvailable" : "upToDate";
    }, () => {
      if (!current()) return;
      row.latestVersion = null;
      row.updateState = "checkFailed";
    });
    const account = this.readSignIn(row).then((reading) => {
      if (current()) row.accountState = accountStateOf(reading);
    });
    // The installed version is known: the caller settles now; the rest finishes on its own.
    void Promise.all([latest, account]).then(() => { if (current()) this.finishCheck(row); });
  }

  private finishCheck(row: Row): void {
    row.checking = false;
    row.checkedAt = new Date();
    this.announce();
  }

  /**
   * The one update path: the refusals, checked synchronously, or the started vendor update (the
   * row is claimed before this returns), settling with its result.
   */
  private beginUpdate(runtimeKind: AgentRuntimeKind): RuntimeUpdateRefusal | Promise<RuntimeUpdateResult> {
    const row = this.requireRow(runtimeKind);
    const agents = this.runningAgents(row);
    if (!row.installed || !row.installedVersion) return { result: "refused", reason: "NOT_INSTALLED", runningAgents: agents };
    if (row.operation?.state === "running") return { result: "refused", reason: "BUSY", runningAgents: agents };
    if (agents > 0) return { result: "refused", reason: "AGENTS_RUNNING", runningAgents: agents };
    const executable = row.strategy.resolveExecutable();
    const argv = row.strategy.updateArgv(executable);
    const command = commandLabel(argv);
    const fromVersion = row.installedVersion;
    const process = this.createProcess(argv, { timeoutMs: OPERATION_TIMEOUT_MS });
    row.process = process;
    row.operation = { kind: "update", state: "running", command, step: null, fromVersion };
    return process.finished.then(async (result): Promise<RuntimeUpdateResult> => {
      const version = await row.strategy.readVersion(executable);
      const error = result.output || `${command} exited with code ${String(result.exitCode)}.`;
      if (row.process !== process || this.closed) return { result: "failed", error };
      row.process = null;
      if (version) row.installedVersion = version;
      if (result.exitCode === 0 && version && compareRuntimeVersions(version, fromVersion) > 0) {
        row.operation = { kind: "update", state: "succeeded", command, fromVersion, toVersion: version };
        this.announce();
        // The automatic re-check keeps "Updated from X to Y." (AR-006).
        void this.check(row);
        return { result: "updated", fromVersion, toVersion: version };
      }
      // A failure, or exit 0 without a newer version (e.g. a Homebrew install's "Claude is up to date!").
      row.operation = { kind: "update", state: "failed", command, fromVersion, error };
      this.announce();
      return { result: "failed", error };
    });
  }

  private announce(): void {
    try {
      this.updateStateListener?.();
    } catch (error) {
      console.warn("AGENT_RUNTIME_UPDATE_STATE_LISTENER_FAILED", error);
    }
  }

  private async readSignIn(row: Row): Promise<SignInReading> {
    try {
      return await this.dependencies.signInReader.read(row.strategy.runtimeKind, { cwd: this.homeDirectory });
    } catch (error) {
      return { state: "unknown", detail: error instanceof Error ? error.message : String(error) };
    }
  }

  private runningAgents(row: Row): number {
    return this.dependencies.countRunningAgents(row.strategy.runtimeKind);
  }

  private requireRow(runtimeKind: AgentRuntimeKind): Row {
    this.assertOpen();
    const row = this.rows.get(runtimeKind);
    if (!row) throw new AgentRuntimeError("AGENT_RUNTIME_UNKNOWN", `Unknown agent runtime '${runtimeKind}'.`);
    return row;
  }

  private requireIdleInstalledRow(runtimeKind: AgentRuntimeKind): Row {
    const row = this.requireRow(runtimeKind);
    if (!row.installed || !row.installedVersion) {
      throw new AgentRuntimeError("AGENT_RUNTIME_NOT_INSTALLED", "This runtime is not installed.");
    }
    if (row.operation?.state === "running") {
      throw new AgentRuntimeError("AGENT_RUNTIME_BUSY", "This runtime is already updating or signing in.");
    }
    return row;
  }

  private assertOpen(): void {
    if (this.closed) throw new AgentRuntimeError("AGENT_RUNTIMES_CLOSED", "The server is shutting down.");
  }
}

let configuredService: AgentRuntimeStatusService | null = null;

/** Binds the studio server's service for the GraphQL resolver; `close()` unbinds it and stops its processes. */
export const configureAgentRuntimeStatusService = (
  service: AgentRuntimeStatusService,
): Readonly<{ close(): Promise<void> }> => {
  if (configuredService) throw new Error("The agent runtime status service is already configured.");
  configuredService = service;
  return Object.freeze({
    close: async () => {
      if (configuredService === service) configuredService = null;
      await service.close();
    },
  });
};

export const getAgentRuntimeStatusService = (): AgentRuntimeStatusService => {
  if (!configuredService) throw new Error("The agent runtime status service is not configured.");
  return configuredService;
};
