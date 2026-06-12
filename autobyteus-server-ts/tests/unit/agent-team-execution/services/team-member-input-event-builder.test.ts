import { describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { MixedAgentMemberContext } from "../../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { buildTeamMemberInputEventPayload } from "../../../../src/agent-team-execution/services/team-member-input-event-builder.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

describe("buildTeamMemberInputEventPayload", () => {
  const memberContext = new MixedAgentMemberContext({
    memberName: "solution_designer",
    memberPath: ["solution_designer"],
    memberRouteKey: "solution_designer",
    memberRunId: "member-run-1",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    platformAgentRunId: null,
  });

  it("preserves canonical ContextFile uri and lower-case file_type in member-input context refs", () => {
    const imageLocator = "/rest/team-runs/team-1/members/solution_designer/context-files/ctx_abc__image.png";
    const message = new AgentInputUserMessage(
      "please inspect this image",
      SenderType.USER,
      [new ContextFile(imageLocator, ContextFileType.IMAGE)],
      {
        message_id: "msg-1",
        dedupe_key: "dedupe-1",
      },
    );

    const payload = buildTeamMemberInputEventPayload({
      teamRunId: "team-1",
      memberContext,
      message,
      receivedAt: "2026-06-11T12:00:00.000Z",
    });

    expect(payload.contextFilePaths).toEqual([
      {
        path: imageLocator,
        type: "Image",
      },
    ]);
  });
});
