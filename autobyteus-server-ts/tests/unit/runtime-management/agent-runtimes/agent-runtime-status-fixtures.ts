import { vi } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRuntimeStatusService } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type { AgentRuntimeStrategy } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-strategy.js";
import type { SignInReading } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import type { AgentRuntimeKind, AgentRuntimeStatus } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-types.js";
import type { RuntimeProcessResult } from "../../../../src/runtime-management/agent-runtimes/runtime-process-operation.js";

/** The status service over fake strategies, sign-in reader and vendor processes (no real runtime). */
export const CODEX = RuntimeKind.CODEX_APP_SERVER as AgentRuntimeKind;
export const CLAUDE = RuntimeKind.CLAUDE_AGENT_SDK as AgentRuntimeKind;
export const AGY = RuntimeKind.ANTIGRAVITY_CLI as AgentRuntimeKind;
export const GROK = RuntimeKind.GROK_BUILD as AgentRuntimeKind;

export const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
};

export class FakeProcess {
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

export type FakeStrategyInput = Partial<Omit<AgentRuntimeStrategy, "runtimeKind">>;

export const strategy = (runtimeKind: AgentRuntimeKind, input: FakeStrategyInput = {}): AgentRuntimeStrategy => ({
  runtimeKind,
  signInRoute: runtimeKind === CODEX || runtimeKind === GROK ? "browser" : "commandLine",
  installInstructionsUrl: `https://install.example/${runtimeKind}`,
  resolveExecutable: () => `/bin/${runtimeKind}`,
  readVersion: vi.fn(async () => "1.0.0"),
  readLatestVersion: vi.fn(async () => "1.0.0"),
  readSignIn: vi.fn(async () => ({ state: "signedIn" }) as SignInReading),
  readUsageLimits: vi.fn(async () => ({ state: "not_reported" }) as const),
  updateArgv: (executable) => [executable, "update"],
  ...(runtimeKind === CODEX || runtimeKind === GROK ? { signInArgv: (executable: string) => [executable, "login"] } : {}),
  ...input,
});

export const build = (input: {
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

export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
