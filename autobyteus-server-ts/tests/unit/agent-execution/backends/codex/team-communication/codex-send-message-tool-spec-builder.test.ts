import { describe, expect, it } from "vitest";
import {
  SEND_MESSAGE_TO_TOOL_NAME,
  buildSendMessageToToolSpec,
} from "../../../../../../src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.js";

describe("codex-send-message-tool-spec-builder", () => {
  it("builds a Codex dynamic tool spec with inputSchema", () => {
    const spec = buildSendMessageToToolSpec({
      allowedRecipientNames: ["Reviewer", "Planner"],
    }) as {
      name: string;
      inputSchema?: {
        type?: string;
        properties?: Record<string, unknown>;
        required?: string[];
        additionalProperties?: boolean;
      };
      input_schema?: unknown;
    };

    expect(spec.name).toBe(SEND_MESSAGE_TO_TOOL_NAME);
    expect(spec.input_schema).toBeUndefined();
    expect(spec.inputSchema).toEqual(
      expect.objectContaining({
        type: "object",
        required: ["recipient_name", "content"],
        additionalProperties: false,
      }),
    );
    expect(spec.inputSchema?.properties).toEqual(
      expect.objectContaining({
        recipient_name: expect.objectContaining({
          type: "string",
          enum: ["Reviewer", "Planner"],
        }),
        content: expect.objectContaining({
          type: "string",
        }),
        message_type: expect.objectContaining({
          type: "string",
        }),
      }),
    );
  });
});
