import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import {
  AgentRuntimeError, AgentRuntimeStatusService,
} from "../../../../src/runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type { AgentRuntimeStrategy } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-strategy.js";
import type { SignInReading } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import type { AgentRuntimeKind, AgentRuntimeStatus } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-types.js";
import type { RuntimeProcessResult } from "../../../../src/runtime-management/agent-runtimes/runtime-process-operation.js";

const CODEX = RuntimeKind.CODEX_APP_SERVER as AgentRuntimeKind;
const CLAUDE = RuntimeKind.CLAUDE_AGENT_SDK as AgentRuntimeKind;
const AGY = RuntimeKind.ANTIGRAVITY_CLI as AgentRuntimeKind;
const GROK = RuntimeKind.GROK_BUILD as AgentRuntimeKind;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
};

class FakeProcess {
  readonly finished: Promise<RuntimeProcessResult>;
  line: string | null = null;
  cancelled = false;
  private resolveFinished!: (result: RuntimeProcessResult) => void;
  constructor(readonly argv: readonly string[], readonly timeoutMs: number) {
    this.finished = new Promise((resolve) => { this.resolveFinished = resolve; });
  }
  latestLine() { return this.line; }
  exit(exitCode: number | null, output = "", extra: Partial<RuntimeProcessResult> = {}) {
    this.resolveFinished({ exitCode, output, cancelled: false, timedOut: false, ...extra });
  }
  cancel() {
    this.cancelled = true;
    this.resolveFinished({ exitCode: null, output: "", cancelled: true, timedOut: false });
  }
}

type FakeStrategyInput = Partial<Omit<AgentRuntimeStrategy, "runtimeKind">>;

const strategy = (runtimeKind: AgentRuntimeKind, input: FakeStrategyInput = {}): AgentRuntimeStrategy => ({
  runtimeKind,
  signInRoute: runtimeKind === CODEX || runtimeKind === GROK ? "browser" : "commandLine",
  installInstructionsUrl: `https://install.example/${runtimeKind}`,
  resolveExecutable: () => `/bin/${runtimeKind}`,
  readVersion: vi.fn(async () => "1.0.0"),
  readLatestVersion: vi.fn(async () => "1.0.0"),
  readSignIn: vi.fn(async () => ({ state: "signedIn" }) as SignInReading),
  updateArgv: (executable) => [executable, "update"],
  ...(runtimeKind === CODEX || runtimeKind === GROK ? { signInArgv: (executable: string) => [executable, "login"] } : {}),
  ...input,
});

const build = (input: {
  strategies?: Partial<Record<AgentRuntimeKind, FakeStrategyInput>>;
  readings?: Partial<Record<AgentRuntimeKind, SignInReading | (() => Promise<SignInReading>)>>;
  agents?: Partial<Record<AgentRuntimeKind, number>>;
} = {}) => {
  const strategies = [CODEX, CLAUDE, AGY, GROK].map((kind) => strategy(kind, input.strategies?.[kind]));
  const processes: FakeProcess[] = [];
  const read = vi.fn(async (kind: AgentRuntimeKind) => {
    const reading = input.readings?.[kind] ?? { state: "signedIn" };
    return typeof reading === "function" ? reading() : reading;
  });
  const agents = { ...input.agents };
  const service = new AgentRuntimeStatusService({
    strategies,
    signInReader: { read },
    countRunningAgents: (kind) => agents[kind] ?? 0,
    homeDirectory: "/home/user",
    createProcess: (argv, options) => {
      const process = new FakeProcess(argv, options.timeoutMs);
      processes.push(process);
      return process as never;
    },
  });
  const row = (kind: AgentRuntimeKind): AgentRuntimeStatus => service.list().find((entry) => entry.runtimeKind === kind)!;
  return { service, strategies, processes, read, agents, row };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("AgentRuntimeStatusService checks", () => {
  it("lists the four runtimes in order and never starts work when read", () => {
    const { service, strategies } = build();
    expect(service.list().map((entry) => [entry.runtimeKind, entry.installed, entry.updateState, entry.checkedAt]))
      .toEqual([[CODEX, false, "notChecked", null], [CLAUDE, false, "notChecked", null], [AGY, false, "notChecked", null], [GROK, false, "notChecked", null]]);
    for (const entry of strategies) expect(entry.readVersion).not.toHaveBeenCalled();
  });

  it("settles once installed versions are read; newest versions and sign-in arrive per runtime, independently", async () => {
    const claudeLatest = deferred<string>();
    const grokLatest = deferred<string>();
    const { service, row, read } = build({
      strategies: {
        [CODEX]: { readVersion: vi.fn(async () => "0.163.0"), readLatestVersion: vi.fn(async () => "0.163.0") },
        [CLAUDE]: { readVersion: vi.fn(async () => "2.1.302"), readLatestVersion: vi.fn(() => claudeLatest.promise) },
        [AGY]: { readVersion: vi.fn(async () => null) },
        [GROK]: { readVersion: vi.fn(async () => "1.0.62"), readLatestVersion: vi.fn(() => grokLatest.promise) },
      },
      readings: { [CODEX]: { state: "signedOut", detail: "no logged-in account." }, [CLAUDE]: { state: "unknown", detail: "x" } },
    });

    await service.checkAll();
    expect(row(CLAUDE)).toMatchObject({ installed: true, installedVersion: "2.1.302", updateState: "checking" });
    expect(row(AGY)).toMatchObject({
      installed: false, installedVersion: null, updateState: "notChecked", accountState: "notApplicable",
      installInstructionsUrl: `https://install.example/${AGY}`,
    });
    await settle();
    expect(row(CODEX)).toMatchObject({ updateState: "upToDate", latestVersion: "0.163.0", accountState: "signedOut" });
    expect(row(CODEX).checkedAt).toBeInstanceOf(Date);

    // One source failing never touches another row, nor the installed version.
    grokLatest.reject(new Error("offline"));
    await settle();
    expect(row(GROK)).toMatchObject({ updateState: "checkFailed", installedVersion: "1.0.62", latestVersion: null });
    expect(row(CLAUDE).updateState).toBe("checking");

    claudeLatest.resolve("2.1.304");
    await settle();
    expect(row(CLAUDE)).toMatchObject({ updateState: "updateAvailable", latestVersion: "2.1.304", accountState: "unknown" });
    expect(read).toHaveBeenCalledWith(CODEX, { cwd: "/home/user" });
    expect(read).not.toHaveBeenCalledWith(AGY, expect.anything());
  });

  it("maps a Codex provider without OpenAI sign-in to not applicable (DEC-008)", async () => {
    const { service, row } = build({ readings: { [CODEX]: { state: "notRequired" } } });
    await service.checkAll();
    await settle();
    expect(row(CODEX).accountState).toBe("notApplicable");
  });

  it("keeps the last account reading while a re-check runs", async () => {
    const second = deferred<SignInReading>();
    let calls = 0;
    const { service, row } = build({
      readings: { [CLAUDE]: () => (++calls === 1 ? Promise.resolve({ state: "signedIn" }) : second.promise) },
    });
    await service.checkAll();
    await settle();
    await service.checkAll();
    expect(row(CLAUDE).accountState).toBe("signedIn");
    second.resolve({ state: "signedOut", detail: "" });
    await settle();
    expect(row(CLAUDE).accountState).toBe("signedOut");
  });

  it("counts running agents per runtime when read", () => {
    const { row, agents } = build({ agents: { [CLAUDE]: 2 } });
    expect(row(CLAUDE).runningAgentCount).toBe(2);
    agents[CLAUDE] = 0;
    expect(row(CLAUDE).runningAgentCount).toBe(0);
  });
});

describe("AgentRuntimeStatusService update", () => {
  const readyToUpdate = async (versions: string[], agents: Partial<Record<AgentRuntimeKind, number>> = {}) => {
    const queue = [...versions];
    const latest = versions.at(-1)!;
    const built = build({
      agents,
      strategies: {
        [CLAUDE]: {
          readVersion: vi.fn(async () => (queue.length > 1 ? queue.shift()! : queue[0]!)),
          readLatestVersion: vi.fn(async () => latest),
        },
      },
    });
    await built.service.checkAll();
    await settle();
    return built;
  };

  it("runs the vendor's update, shows its latest line, then 'Updated from X to Y' and re-checks to Up to date", async () => {
    const { service, row, processes } = await readyToUpdate(["2.1.302", "2.1.304"]);
    expect(row(CLAUDE).updateState).toBe("updateAvailable");

    service.startUpdate(CLAUDE);
    expect(processes[0]!.argv).toEqual([`/bin/${CLAUDE}`, "update"]);
    expect(processes[0]!.timeoutMs).toBe(600_000);
    processes[0]!.line = "Downloading 2.1.304…";
    expect(row(CLAUDE).operation).toEqual({
      kind: "update", state: "running", command: `${CLAUDE} update`, step: "Downloading 2.1.304…", fromVersion: "2.1.302",
    });

    processes[0]!.exit(0, "Successfully updated from 2.1.302 to version 2.1.304");
    await settle();
    await settle();
    expect(row(CLAUDE)).toMatchObject({
      installedVersion: "2.1.304",
      updateState: "upToDate",
      operation: { kind: "update", state: "succeeded", fromVersion: "2.1.302", toVersion: "2.1.304" },
    });

    // A user-started check clears the finished result.
    await service.checkAll();
    expect(row(CLAUDE).operation).toBeNull();
  });

  it("fails with the vendor's output when the update exits 0 without a newer version (e.g. Homebrew)", async () => {
    const { service, row, processes } = await readyToUpdate(["2.1.302", "2.1.302", "2.1.304"]);
    service.startUpdate(CLAUDE);
    processes[0]!.exit(0, "Claude is up to date!");
    await settle();
    expect(row(CLAUDE)).toMatchObject({
      installedVersion: "2.1.302",
      updateState: "updateAvailable",
      operation: { kind: "update", state: "failed", fromVersion: "2.1.302", error: "Claude is up to date!" },
    });
    // Try again is allowed.
    expect(() => service.startUpdate(CLAUDE)).not.toThrow();
  });

  it("names the exit code when a failed update printed nothing", async () => {
    const { service, row, processes } = await readyToUpdate(["2.1.302", "2.1.302", "2.1.304"]);
    service.startUpdate(CLAUDE);
    processes[0]!.exit(1, "");
    await settle();
    expect(row(CLAUDE).operation).toMatchObject({ state: "failed", error: `${CLAUDE} update exited with code 1.` });
  });

  it("refuses while that runtime's agents run, when not installed, and while busy", async () => {
    const { service, agents, processes } = await readyToUpdate(["2.1.302", "2.1.304"], { [CLAUDE]: 1 });
    const codeOf = (action: () => void) => {
      try { action(); } catch (error) { return (error as AgentRuntimeError).code; }
      return null;
    };
    expect(codeOf(() => service.startUpdate(CLAUDE))).toBe("AGENT_RUNTIME_AGENTS_RUNNING");
    agents[CLAUDE] = 0;
    service.startUpdate(CLAUDE);
    expect(codeOf(() => service.startUpdate(CLAUDE))).toBe("AGENT_RUNTIME_BUSY");
    expect(processes).toHaveLength(1);

    const notInstalled = build({ strategies: { [GROK]: { readVersion: vi.fn(async () => null) } } });
    await notInstalled.service.checkAll();
    expect(codeOf(() => notInstalled.service.startUpdate(GROK))).toBe("AGENT_RUNTIME_NOT_INSTALLED");
  });

  it("does not re-check a runtime whose update is running", async () => {
    const { service, strategies } = await readyToUpdate(["2.1.302", "2.1.304"]);
    const claude = strategies.find((entry) => entry.runtimeKind === CLAUDE)!;
    service.startUpdate(CLAUDE);
    const calls = vi.mocked(claude.readLatestVersion).mock.calls.length;
    await service.checkAll();
    await settle();
    expect(vi.mocked(claude.readLatestVersion).mock.calls.length).toBe(calls);
  });
});

describe("AgentRuntimeStatusService sign-in", () => {
  const signedOut = async (after: SignInReading) => {
    let calls = 0;
    const built = build({
      readings: { [CODEX]: () => Promise.resolve(++calls === 1 ? { state: "signedOut", detail: "no logged-in account." } : after) },
    });
    await built.service.checkAll();
    await settle();
    return built;
  };

  it("runs the vendor login; Signed in when the runtime then reports it", async () => {
    const { service, row, processes } = await signedOut({ state: "signedIn" });
    service.startSignIn(CODEX);
    expect(processes[0]!.argv).toEqual([`/bin/${CODEX}`, "login"]);
    expect(processes[0]!.timeoutMs).toBe(600_000);
    expect(row(CODEX).operation).toEqual({ kind: "signIn", state: "running" });
    processes[0]!.exit(0, "Open https://auth.example/?code=SECRET to sign in");
    await settle();
    expect(row(CODEX)).toMatchObject({ accountState: "signedIn", operation: null });
    expect(JSON.stringify(service.list())).not.toContain("SECRET");
  });

  it("returns to Sign in on Cancel without reading the account", async () => {
    const { service, row, processes, read } = await signedOut({ state: "signedIn" });
    const reads = read.mock.calls.length;
    service.startSignIn(CODEX);
    service.cancelSignIn(CODEX);
    await settle();
    expect(processes[0]!.cancelled).toBe(true);
    expect(row(CODEX)).toMatchObject({ accountState: "signedOut", operation: null });
    expect(read.mock.calls.length).toBe(reads);
  });

  it("says it didn't finish after the time-out or an exit without a sign-in", async () => {
    const { service, row, processes } = await signedOut({ state: "signedOut", detail: "no logged-in account." });
    service.startSignIn(CODEX);
    processes[0]!.exit(null, "", { timedOut: true });
    await settle();
    expect(row(CODEX)).toMatchObject({ accountState: "signedOut", operation: { kind: "signIn", state: "didNotFinish" } });
    // Try again.
    service.startSignIn(CODEX);
    expect(row(CODEX).operation).toEqual({ kind: "signIn", state: "running" });
  });

  it("offers no in-app sign-in for command-line runtimes (Claude, Antigravity)", async () => {
    const { service } = build();
    await service.checkAll();
    for (const kind of [CLAUDE, AGY]) {
      expect(() => service.startSignIn(kind)).toThrow(expect.objectContaining({ code: "AGENT_RUNTIME_SIGN_IN_UNSUPPORTED" }));
    }
  });
});

describe("AgentRuntimeStatusService close", () => {
  it("stops every running vendor process and refuses new work", async () => {
    const { service, processes } = build({ readings: { [GROK]: { state: "signedOut", detail: "" } } });
    await service.checkAll();
    await settle();
    service.startSignIn(GROK);
    service.startUpdate(CLAUDE);
    await service.close();
    expect(processes.every((process) => process.cancelled)).toBe(true);
    await expect(service.checkAll()).rejects.toMatchObject({ code: "AGENT_RUNTIMES_CLOSED" });
  });
});
