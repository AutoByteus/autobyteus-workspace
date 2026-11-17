import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The run stream protocol: a client sends commands only after the stream's CONNECTED message; a command sent before it
 * is refused with SESSION_NOT_READY (`src/api/websocket/agent.ts`). Since autobyteus-461 a Team or Org view sends
 * CONNECTED after its reads, a few milliseconds after the socket opens, so a test client that sends on `open` is always
 * refused. The 461 release smoke found such a client in a live-gated suite that no ticket run had executed.
 *
 * This check reads every E2E and integration test source without running it (no live gate): a file that opens a Team
 * or Org stream and sends a command must wait for that stream's readiness (CONNECTED, or the view snapshot that follows
 * it). It is file-level: a file with one waiting client and one sending on open still passes, so new clients should use
 * `waitConnected` from `tests/e2e/helpers/agent-stream-frames.ts`.
 */
const TEAM_OR_ORG_STREAM = /\/ws\/agent-(?:team|org)\//;
const STREAM_COMMAND = /sendE2eSendMessageCommand\(|["'](?:SEND_MESSAGE|INTERRUPT_GENERATION|APPROVE_TOOL|DENY_TOOL)["']/;
const READINESS_WAIT = /waitConnected\(|waitForStreamConnected\(|["']CONNECTED["']|_VIEW_SNAPSHOT["']|restoreByMemberMessage\(/;

/** Why a test source would send on a Team or Org stream before it is ready, or null when it would not. */
const sendsBeforeStreamReady = (source: string): string | null => {
  if (!TEAM_OR_ORG_STREAM.test(source) || !STREAM_COMMAND.test(source)) return null;
  return READINESS_WAIT.test(source) ? null : "opens a Team or Org stream and sends a command without waiting for CONNECTED";
};

/**
 * Sources that send before readiness on purpose, each to prove the stream's answer to an early command, with why. Each
 * must still send early (checked below), so an exemption is removed with the behavior it covers.
 */
const SENDS_EARLY_ON_PURPOSE: Readonly<Record<string, string>> = {
  "tests/e2e/agent/run-stream-early-command.e2e.test.ts":
    "autobyteus-500 FU-036 RSE-1: a command sent on open is refused SESSION_NOT_READY or acknowledged, never dropped",
};

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const testSources = (dir: string): string[] => readdirSync(path.join(serverRoot, dir), { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:ts|mjs)$/.test(entry.name))
  .map((entry) => path.relative(serverRoot, path.join(entry.parentPath, entry.name)));

describe("Team and Org stream test clients wait for CONNECTED before sending", () => {
  it("flags a client that sends on open and passes one that waits", () => {
    const opensTeam = 'const socket = new WebSocket(`ws://${host}/ws/agent-team/${teamRunId}`);\n'
      + 'await new Promise((resolve) => socket.once("open", resolve));\n';
    const send = 'sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "hi" });\n';
    expect(sendsBeforeStreamReady(opensTeam + send)).toMatch(/without waiting for CONNECTED/);
    expect(sendsBeforeStreamReady(opensTeam.replace("agent-team", "agent-org") + send)).toMatch(/without waiting/);
    expect(sendsBeforeStreamReady(opensTeam + 'socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION" }));\n'))
      .toMatch(/without waiting/);
    expect(sendsBeforeStreamReady(opensTeam + "await waitConnected(messages);\n" + send)).toBeNull();
    expect(sendsBeforeStreamReady(opensTeam + 'await until(() => frames.some((f) => f.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));\n' + send))
      .toBeNull();
    expect(sendsBeforeStreamReady(opensTeam)).toBeNull();
  });

  it("every E2E and integration test source waits", () => {
    const sources = [...testSources("tests/e2e"), ...testSources("tests/integration")];
    expect(sources.length).toBeGreaterThan(100);
    const offending = sources.flatMap((file) => {
      if (file in SENDS_EARLY_ON_PURPOSE) return [];
      const reason = sendsBeforeStreamReady(readFileSync(path.join(serverRoot, file), "utf8"));
      return reason ? [`${file}: ${reason}`] : [];
    });
    expect(offending).toEqual([]);
  });

  it("each source exempted for sending early on purpose exists and still sends early", () => {
    for (const file of Object.keys(SENDS_EARLY_ON_PURPOSE)) {
      expect(sendsBeforeStreamReady(readFileSync(path.join(serverRoot, file), "utf8")), `${file}: remove its exemption`).not.toBeNull();
    }
  });
});
