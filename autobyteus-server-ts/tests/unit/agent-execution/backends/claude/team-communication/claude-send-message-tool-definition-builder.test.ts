import { describe, expect, it, vi } from "vitest";
import { buildClaudeSendMessageToolDefinition } from "../../../../../../src/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.js";
import { CLAUDE_SEND_MESSAGE_TOOL_NAME } from "../../../../../../src/agent-execution/backends/claude/claude-send-message-tool-name.js";

const getDescription = (schema: unknown): string => {
  const candidate = schema as { description?: unknown; _def?: { description?: unknown } };
  return String(candidate.description ?? candidate._def?.description ?? "");
};

describe("claude-send-message-tool-definition-builder", () => {
  it("builds send_message_to schema with self-contained content and explicit reference_files guidance", async () => {
    const createToolDefinition = vi.fn((definition: Record<string, unknown>) => definition);

    const definition = await buildClaudeSendMessageToolDefinition({
      runContext: {
        runtimeContext: {
          memberTeamContext: {
            teamRunId: "team-1",
            allowedRecipientNames: ["Reviewer"],
          },
        },
      } as any,
      sdkClient: { createToolDefinition } as any,
      handler: { handle: vi.fn() } as any,
    }) as Record<string, unknown>;

    expect(definition.name).toBe(CLAUDE_SEND_MESSAGE_TOOL_NAME);
    expect(definition.description).toEqual(expect.stringContaining("self-contained message"));
    const inputSchema = definition.inputSchema as Record<string, unknown>;
    expect(getDescription(inputSchema.content)).toContain("email body");
    expect(getDescription(inputSchema.reference_files)).toContain("in addition to self-contained content");
  });
});
