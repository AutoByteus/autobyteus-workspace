import { describe, expect, it } from "vitest";
import { createAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type { TokenUsageTeamRunV1EvidenceRow } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/token-usage-team-run-v1-migration-repository.js";
import type { TokenUsageTaskTeamRunIndex } from "../../../src/app-data-migrations/migrations/token-usage-task-team-run-index.js";
import {
  invalidateConflictingTokenEvidence,
  planTeamRunV1TokenRow,
} from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/token-usage-team-run-v1-row-planner.js";

const row = (
  id: number,
  overrides: Partial<TokenUsageTeamRunV1EvidenceRow> = {},
): TokenUsageTeamRunV1EvidenceRow => Object.freeze({
  id,
  usageEventId: `usage-${id}`,
  runId: `run-${id}`,
  rootTeamRunId: null,
  executionAddressJson: null,
  memberAgentRunId: null,
  memberRouteKey: null,
  taskAgentRunId: null,
  taskId: null,
  ...overrides,
});

const emptyIndex = (): TokenUsageTaskTeamRunIndex => Object.freeze({
  entries: new Map(),
  unusableTaskTeamRunIds: new Set<string>(),
  issues: [],
});

describe("planTeamRunV1TokenRow", () => {
  it("assigns one isolated disposition to standalone, current, direct, retained, retired, and bad rows", () => {
    const retained = Object.freeze({
      rootTeamRunId: "root-retained",
      taskTeamRunIds: ["task-team-retained"],
      teamAddress: createAgentTeamAddress(["research"]),
      sourceFilePath: "/tmp/tasks.json",
      taskId: "task-retained",
    });
    const index: TokenUsageTaskTeamRunIndex = Object.freeze({
      entries: new Map([["task-team-retained", retained]]),
      unusableTaskTeamRunIds: new Set<string>(),
      issues: [],
    });
    const rows = [
      row(1),
      row(2, { rootTeamRunId: "root-current" }),
      row(3, {
        rootTeamRunId: "root-direct",
        memberAgentRunId: "run-3",
        memberRouteKey: "writer",
        executionAddressJson: JSON.stringify({
          segments: [{ kind: "member", memberPath: ["writer"] }],
        }),
      }),
      row(4, {
        rootTeamRunId: "task-team-retained",
        memberAgentRunId: "run-4",
        memberRouteKey: "reviewer",
        executionAddressJson: JSON.stringify({
          segments: [
            { kind: "member", memberPath: ["research"] },
            { kind: "task_team", taskTeamRunId: "task-team-retained" },
            { kind: "member", memberPath: ["reviewer"] },
          ],
        }),
      }),
      row(5, {
        rootTeamRunId: "task-team-retired",
        memberAgentRunId: "run-5",
        memberRouteKey: "reviewer",
        executionAddressJson: JSON.stringify({
          segments: [
            { kind: "member", memberPath: ["research"] },
            { kind: "task_team", taskTeamRunId: "task-team-retired" },
            { kind: "member", memberPath: ["reviewer"] },
          ],
        }),
      }),
      row(6, {
        rootTeamRunId: "root-bad",
        memberAgentRunId: "run-6",
        executionAddressJson: "not-json",
      }),
    ];

    const dispositions = rows.map((entry) => planTeamRunV1TokenRow(entry, index));

    expect(dispositions.map(({ kind }) => kind)).toEqual([
      "STANDALONE",
      "CURRENT",
      "RESOLVED",
      "RESOLVED",
      "RESOLVED",
      "PRESERVED_WARNING",
    ]);
    expect(dispositions[2]).toMatchObject({
      finalRootTeamRunId: "root-direct",
      authority: "DIRECT_ROW",
      address: { memberAddress: "/writer" },
    });
    expect(dispositions[3]).toMatchObject({
      finalRootTeamRunId: "root-retained",
      authority: "RETAINED_TOPOLOGY",
      address: {
        taskTeamRunIds: ["task-team-retained"],
        memberAddress: "/research/reviewer",
      },
    });
    expect(dispositions[4]).toMatchObject({
      finalRootTeamRunId: "task-team-retired",
      authority: "RETIRED_ROW",
      address: { memberAddress: "/research/reviewer" },
    });
    expect(dispositions[5]!.detail.message).toContain("remains unchanged");
  });

  it("invalidates only an exact address group that names multiple AgentRuns", () => {
    const address = JSON.stringify({
      segments: [{ kind: "member", memberPath: ["writer"] }],
    });
    const dispositions = invalidateConflictingTokenEvidence([
      planTeamRunV1TokenRow(row(1, {
        rootTeamRunId: "root",
        runId: "run-a",
        memberAgentRunId: "run-a",
        memberRouteKey: "writer",
        executionAddressJson: address,
      }), emptyIndex()),
      planTeamRunV1TokenRow(row(2, {
        rootTeamRunId: "root",
        runId: "run-b",
        memberAgentRunId: "run-b",
        memberRouteKey: "writer",
        executionAddressJson: address,
      }), emptyIndex()),
      planTeamRunV1TokenRow(row(3), emptyIndex()),
    ]);

    expect(dispositions.map(({ kind }) => kind)).toEqual([
      "PRESERVED_WARNING",
      "PRESERVED_WARNING",
      "STANDALONE",
    ]);
  });
});
