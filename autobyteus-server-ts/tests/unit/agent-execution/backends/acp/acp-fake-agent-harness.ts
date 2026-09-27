import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AcpAgentProcess } from "../../../../../src/runtime-management/acp/acp-agent-process.js";
import { AcpClientConnection } from "../../../../../src/runtime-management/acp/acp-client-connection.js";
import type { AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { AcpAgentSession } from "../../../../../src/agent-execution/backends/acp/session/acp-agent-session.js";
import type { AcpAgentSessionProfile } from "../../../../../src/agent-execution/backends/acp/acp-agent-session-profile.js";
import { grokBuildSessionProfile } from "../../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";

export const GROK_ACP_FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/grok-acp");
export const FAKE_ACP_AGENT = path.join(GROK_ACP_FIXTURES, "fake-acp-agent.mjs");
export const FAKE_GROK_CLI = path.join(GROK_ACP_FIXTURES, "fake-grok-cli.mjs");

export type FixtureRow = { dir: "in" | "out"; msg: Record<string, any> };

export const readFixture = (name: string): FixtureRow[] =>
  fs.readFileSync(path.join(GROK_ACP_FIXTURES, `${name}.jsonl`), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

/** Recorded session id of a fixture (from its `session/new` result or `session/load` request). */
export const fixtureSessionId = (name: string): string => {
  for (const { dir, msg } of readFixture(name)) {
    if (dir === "in" && typeof msg.result?.sessionId === "string") return msg.result.sessionId;
    if (dir === "out" && msg.method === "session/load") return msg.params.sessionId;
  }
  throw new Error(`No session id in fixture ${name}`);
};

export const writeCustomFixture = (rows: FixtureRow[]): string => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acp-fixture-")), "custom.jsonl");
  fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  return file;
};

export type FakeAgentOptions = {
  fixture: string;
  exitAtEnd?: boolean;
  stopBefore?: string;
  recordFile?: string;
};

export const fixturePath = (name: string): string => path.join(GROK_ACP_FIXTURES, `${name}.jsonl`);

export const spawnFakeAgent = (options: FakeAgentOptions): AcpAgentProcess => AcpAgentProcess.spawn({
  command: process.execPath,
  args: [FAKE_ACP_AGENT],
  cwd: os.tmpdir(),
  env: {
    ...process.env,
    FAKE_ACP_FIXTURE: options.fixture,
    ...(options.exitAtEnd ? { FAKE_ACP_EXIT_AT_END: "1" } : {}),
    ...(options.stopBefore ? { FAKE_ACP_STOP_BEFORE: options.stopBefore } : {}),
    ...(options.recordFile ? { FAKE_ACP_RECORD: options.recordFile } : {}),
  },
});

export type SessionHarness = {
  connection: AcpClientConnection;
  session: AcpAgentSession;
  events: AgentRunEvent[];
  failures: { code: string; message: string }[];
};

export const createSessionHarness = (options: FakeAgentOptions & {
  profile?: AcpAgentSessionProfile;
  autoExecuteTools?: boolean;
  idleTimeoutMs?: number;
}): SessionHarness => {
  const connection = new AcpClientConnection(spawnFakeAgent(options), "Fake Agent");
  const events: AgentRunEvent[] = [];
  const failures: { code: string; message: string }[] = [];
  const session = new AcpAgentSession({
    runId: "run-1",
    connection,
    profile: options.profile ?? grokBuildSessionProfile,
    model: "grok-4.7",
    autoExecuteTools: options.autoExecuteTools ?? false,
    emit: (batch) => { events.push(...batch); },
    onFailed: (failure) => { failures.push(failure); },
    idleTimeoutMs: options.idleTimeoutMs,
  });
  return { connection, session, events, failures };
};

export const waitFor = async (predicate: () => boolean, timeoutMs = 5_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("waitFor timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

export const eventTypes = (events: AgentRunEvent[]): string[] => events.map((event) => event.eventType);
