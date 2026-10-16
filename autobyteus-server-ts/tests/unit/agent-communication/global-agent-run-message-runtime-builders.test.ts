import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildDirectAgentRunInputMessage } from "../../../src/agent-communication/services/global-agent-run-message-runtime-builders.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberExecutionContext } from "../../fixtures/current-team-run-fixtures.js";

const deliver = (memberExecutionContext: ReturnType<typeof testMemberExecutionContext> | null) =>
  buildDirectAgentRunInputMessage({
    sender: buildAgentRunMessageSenderContext({
      senderRunId: "lead_9a",
      senderName: "lead",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberExecutionContext,
    }),
    targetAgentRunId: "target-run",
    content: "Status?",
  });

describe("direct (cross-root) delivery text (REQ-005)", () => {
  it("names a sender inside a root by its run ID only: no name, no address", () => {
    const message = deliver(testMemberExecutionContext({ memberAddress: "/eng/lead", agentRunId: "lead_9a" }));
    expect(message.content).toBe(
      "You received a message from the agent with sender run ID \"lead_9a\".\nmessage:\nStatus?",
    );
    expect(message.content).not.toContain("/eng/lead");
  });

  it("gives the run ID only for a sender outside any root", () => {
    expect(deliver(null).content).toBe("You received a message from the agent with sender run ID \"lead_9a\".\nmessage:\nStatus?");
  });
});
