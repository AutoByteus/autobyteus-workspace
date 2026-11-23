import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { restoreByMemberMessage } from "../../e2e/helpers/restore-by-member-message.js";

type Frame = Record<string, any>;

/**
 * A scripted view stream, in the server's order (`agent-org-stream-handler.ts`): on the message the run is restored and
 * the view brought live (the second snapshot), the message is posted, the summary recorded, and only then acknowledged.
 * `ackAfterMs` stands for the time the summary takes, which a loaded whole run makes long (autobyteus-619 FU-004).
 */
const scriptedStream = async (kind: "team" | "org", script: Readonly<{ ackAfterMs: number; ack?: "accepted" | "rejected" }>) => {
  const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const state = { active: false, acknowledged: false };
  const snapshot = kind === "org" ? "AGENT_ORG_EXECUTION_VIEW_SNAPSHOT" : "TEAM_EXECUTION_VIEW_SNAPSHOT";
  server.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: snapshot, payload: {} }));
    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw)) as Frame;
      if (message.type !== "SEND_MESSAGE") return;
      state.active = true;
      socket.send(JSON.stringify({ type: snapshot, payload: {} }));
      if (kind === "team") return; // A Team acknowledges no accepted message.
      setTimeout(() => {
        state.acknowledged = true;
        socket.send(JSON.stringify({ type: "AGENT_COMMAND_ACK", payload: { command_id: message.payload.command_id, state: script.ack ?? "accepted" } }));
      }, script.ackAfterMs);
    });
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const gql = async () => kind === "org"
    ? { getAgentOrgRunConfig: { isActive: state.active } }
    : { getTeamRunResumeConfig: { isActive: state.active } };
  return { server, state, input: { url, gql, kind, runId: "run-1", memberRunId: "member-1", timeoutMs: 10_000 } as const };
};

const servers: WebSocketServer[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe("restoreByMemberMessage waits until the server has handled its message (autobyteus-619 REQ-003)", () => {
  it("an Org: resolves only after the acknowledgement of its own command, not when the run is active and live", async () => {
    const stream = await scriptedStream("org", { ackAfterMs: 1_000 });
    servers.push(stream.server);
    await restoreByMemberMessage(stream.input);
    expect(stream.state.acknowledged).toBe(true);
  });

  it("an Org: a rejected acknowledgement of a run that stayed stopped is a refusal", async () => {
    const stream = await scriptedStream("org", { ackAfterMs: 0, ack: "rejected" });
    servers.push(stream.server);
    stream.state.active = false;
    const refused = restoreByMemberMessage({ ...stream.input, gql: async () => ({ getAgentOrgRunConfig: { isActive: false } }) });
    await expect(refused).rejects.toThrow(/refused/);
  });

  it("a Team, which acknowledges no accepted message: resolves once the run is active and its view live", async () => {
    const stream = await scriptedStream("team", { ackAfterMs: 0 });
    servers.push(stream.server);
    await expect(restoreByMemberMessage(stream.input)).resolves.toBeUndefined();
    expect(stream.state.active).toBe(true);
  });
});
