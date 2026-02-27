import { describe, expect, it } from "vitest";
import {
  isSendMessageToToolName,
  resolveDynamicToolArgsFromParams,
  resolveDynamicTools,
  resolveTeamRunIdFromMetadata,
} from "../../../../src/runtime-execution/codex-app-server/codex-send-message-tooling.js";

describe("codex-send-message-tooling", () => {
  it("exposes send_message_to dynamic tool only for team-bound sessions", () => {
    expect(
      resolveDynamicTools({
        teamRunId: null,
        interAgentRelayEnabled: true,
      }),
    ).toBeNull();

    expect(
      resolveDynamicTools({
        teamRunId: "team-1",
        interAgentRelayEnabled: false,
      }),
    ).toBeNull();

    const tools = resolveDynamicTools({
      teamRunId: "team-1",
      interAgentRelayEnabled: true,
    });
    expect(tools).toHaveLength(1);
    expect(tools?.[0]?.name).toBe("send_message_to");
  });

  it("normalizes send_message_to tool names across protocol variants", () => {
    expect(isSendMessageToToolName("send_message_to")).toBe(true);
    expect(isSendMessageToToolName("local.send_message_to")).toBe(true);
    expect(isSendMessageToToolName("tool/send_message_to")).toBe(true);
    expect(isSendMessageToToolName("run_bash")).toBe(false);
  });

  it("parses dynamic-tool JSON arguments when encoded as strings", () => {
    const args = resolveDynamicToolArgsFromParams({
      arguments: JSON.stringify({
        recipient_name: "pong",
        content: "hello",
      }),
    });
    expect(args).toEqual({
      recipient_name: "pong",
      content: "hello",
    });
  });

  it("resolves team run id from runtime metadata aliases", () => {
    expect(resolveTeamRunIdFromMetadata({ teamRunId: "team-a" })).toBe("team-a");
    expect(resolveTeamRunIdFromMetadata({ team_run_id: "team-b" })).toBe("team-b");
    expect(resolveTeamRunIdFromMetadata({})).toBeNull();
  });
});
