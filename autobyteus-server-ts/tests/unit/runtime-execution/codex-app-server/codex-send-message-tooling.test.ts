import { describe, expect, it } from "vitest";
import {
  isSendMessageToToolName,
  renderTeamManifestDeveloperInstructions,
  resolveAllowedRecipientNamesFromManifest,
  resolveDynamicToolArgsFromParams,
  resolveDynamicToolNameFromParams,
  resolveDynamicTools,
  resolveSendMessageToEnabledFromMetadata,
  resolveTeamManifestMembersFromMetadata,
  resolveTeamRunIdFromMetadata,
} from "../../../../src/runtime-execution/codex-app-server/codex-send-message-tooling.js";

describe("codex-send-message-tooling", () => {
  it("exposes send_message_to dynamic tool only for team-bound sessions", () => {
    expect(
      resolveDynamicTools({
        teamRunId: null,
        interAgentRelayEnabled: true,
        sendMessageToEnabled: true,
      }),
    ).toBeNull();

    expect(
      resolveDynamicTools({
        teamRunId: "team-1",
        interAgentRelayEnabled: false,
        sendMessageToEnabled: true,
      }),
    ).toBeNull();

    expect(
      resolveDynamicTools({
        teamRunId: "team-1",
        interAgentRelayEnabled: true,
        sendMessageToEnabled: false,
      }),
    ).toBeNull();

    const tools = resolveDynamicTools({
      teamRunId: "team-1",
      interAgentRelayEnabled: true,
      sendMessageToEnabled: true,
      allowedRecipientNames: ["Student Agent"],
    });
    expect(tools).toHaveLength(1);
    expect(tools?.[0]?.name).toBe("send_message_to");
    expect(
      (tools?.[0]?.inputSchema as { properties?: { recipient_name?: { enum?: string[] } } })
        ?.properties?.recipient_name?.enum,
    ).toEqual(["Student Agent"]);
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

  it("resolves dynamic-tool name from nested item aliases", () => {
    expect(
      resolveDynamicToolNameFromParams({
        item: {
          tool_name: "send_message_to",
        },
      }),
    ).toBe("send_message_to");
    expect(
      resolveDynamicToolNameFromParams({
        item: {
          tool: {
            name: "send_message_to",
          },
        },
      }),
    ).toBe("send_message_to");
  });

  it("resolves dynamic-tool arguments from nested item/tool payloads", () => {
    expect(
      resolveDynamicToolArgsFromParams({
        item: {
          arguments: {
            recipient_name: "pong",
            content: "hello-from-item",
          },
        },
      }),
    ).toEqual({
      recipient_name: "pong",
      content: "hello-from-item",
    });

    expect(
      resolveDynamicToolArgsFromParams({
        tool: {
          arguments: {
            recipient_name: "pong",
            content: "hello-from-tool",
          },
        },
      }),
    ).toEqual({
      recipient_name: "pong",
      content: "hello-from-tool",
    });
  });

  it("resolves team run id from runtime metadata aliases", () => {
    expect(resolveTeamRunIdFromMetadata({ teamRunId: "team-a" })).toBe("team-a");
    expect(resolveTeamRunIdFromMetadata({ team_run_id: "team-b" })).toBe("team-b");
    expect(resolveTeamRunIdFromMetadata({})).toBeNull();
  });

  it("resolves send_message_to capability from runtime metadata aliases", () => {
    expect(resolveSendMessageToEnabledFromMetadata({ sendMessageToEnabled: true })).toBe(true);
    expect(resolveSendMessageToEnabledFromMetadata({ send_message_to_enabled: "true" })).toBe(
      true,
    );
    expect(resolveSendMessageToEnabledFromMetadata({ send_message_to_enabled: "0" })).toBe(false);
    expect(resolveSendMessageToEnabledFromMetadata({})).toBe(false);
  });

  it("resolves team manifest members from runtime metadata", () => {
    expect(
      resolveTeamManifestMembersFromMetadata({
        teamMemberManifest: [
          { memberName: "Professor", role: "coordinator", description: "Leads delegation" },
          { memberName: "Student", role: "implementer" },
        ],
      }),
    ).toEqual([
      { memberName: "Professor", role: "coordinator", description: "Leads delegation" },
      { memberName: "Student", role: "implementer", description: null },
    ]);
  });

  it("derives allowed recipients by excluding current member", () => {
    expect(
      resolveAllowedRecipientNamesFromManifest({
        currentMemberName: "Professor",
        members: [
          { memberName: "Professor", role: null, description: null },
          { memberName: "Student", role: null, description: null },
        ],
      }),
    ).toEqual(["Student"]);
  });

  it("renders team-manifest developer instructions for codex sessions", () => {
    const instructions = renderTeamManifestDeveloperInstructions({
      currentMemberName: "Professor",
      sendMessageToEnabled: true,
      members: [
        { memberName: "Professor", role: "coordinator", description: "Leads delegation" },
        { memberName: "Student", role: "implementer", description: "Executes tasks" },
      ],
    });
    expect(instructions).toContain("You are a member of an agent team.");
    expect(instructions).toContain("Student");
    expect(instructions).not.toContain("Professor: coordinator");
    expect(instructions).toContain("Use `send_message_to`");
    expect(instructions).toContain("plain text does not deliver messages");
    expect(instructions).toContain("Do not claim a teammate message was sent");
  });
});
