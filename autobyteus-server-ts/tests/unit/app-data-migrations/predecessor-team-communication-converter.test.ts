import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { TeamRunExecutionTreeSnapshot } from "../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { convertPredecessorTeamCommunication } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-communication-converter.js";

const fixturePath = path.resolve(
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-001-persistent-only/team_run_execution_tree.json",
);
const rootTeamRunId = "team-run-root";

const common = {
  messageId: "message-1",
  content: "Please review the design.",
  messageType: "agent_message",
  referenceFiles: [],
  createdAt: "2026-08-16T12:00:00.000Z",
};

describe("convertPredecessorTeamCommunication", () => {
  let tree: TeamRunExecutionTreeSnapshot;

  beforeAll(async () => {
    tree = validateTeamRunExecutionTreePayload(
      JSON.parse(await fs.readFile(fixturePath, "utf8")) as unknown,
      rootTeamRunId,
    );
  });

  it("converts address-bearing and older run-ID projections to equal V1 semantics", () => {
    const addressProjection = convertPredecessorTeamCommunication({
      rootTeamRunId,
      tree,
      evidence: new Map(),
      communicationFile: {
        teamRunId: rootTeamRunId,
        messages: [{
          ...common,
          senderAddress: {
            segments: [{ kind: "member", memberPath: ["product_manager"] }],
          },
          receiverAddress: {
            segments: [{ kind: "member", memberPath: ["architecture", "architect"] }],
          },
        }],
      },
    });
    const olderProjection = convertPredecessorTeamCommunication({
      rootTeamRunId,
      tree,
      evidence: new Map(),
      communicationFile: {
        version: 1,
        messages: [{
          ...common,
          senderRunId: "agent-run-product-manager",
          receiverRunId: "agent-run-architect",
          senderMemberRouteKey: "product_manager",
          receiverMemberPath: ["architecture", "architect"],
        }],
      },
    });

    expect(addressProjection).toEqual(olderProjection);
    expect(addressProjection.messages[0]).toMatchObject({
      senderAgentRunId: "agent-run-product-manager",
      receiverAgentRunId: "agent-run-architect",
      content: common.content,
    });
  });

  it("rejects a projection wrapper or corroborating path that contradicts the owning root", () => {
    expect(() => convertPredecessorTeamCommunication({
      rootTeamRunId,
      tree,
      evidence: new Map(),
      communicationFile: { teamRunId: "other-root", messages: [] },
    })).toThrow("does not match");

    expect(() => convertPredecessorTeamCommunication({
      rootTeamRunId,
      tree,
      evidence: new Map(),
      communicationFile: {
        version: 1,
        messages: [{
          ...common,
          senderRunId: "agent-run-product-manager",
          receiverRunId: "agent-run-architect",
          senderMemberRouteKey: "qa/tester",
        }],
      },
    })).toThrow("corroboration contradicts");
  });
});
