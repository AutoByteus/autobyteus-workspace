import { describe, expect, it } from "vitest";
import { SelfEvolutionMetricsService } from "../../src/self-evolution/services/self-evolution-metrics-service.js";
import type { SelfEvolutionRunRecord } from "../../src/self-evolution/domain/models.js";

const baseRecord = (): SelfEvolutionRunRecord => ({
  evolutionRunId: "evo-1",
  status: "completed",
  requestedAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-01-01T00:01:00.000Z",
  triggerStrategy: "manual_only",
  evolverStrategy: "single_agent",
  target: { kind: "agent_run", runId: "run-1" },
  effectiveConfig: {
    enabled: true,
    triggerStrategy: "manual_only",
    evolverStrategy: "single_agent",
    evolverAgentDefinitionId: null,
    resolvedAt: "2026-01-01T00:00:00.000Z",
    sourceTrace: [],
  },
  sourceRunIds: ["run-1"],
  evolverAgentDefinitionId: "evolver",
  evolverRunId: "evolver-run",
  runtimeKind: "autobyteus",
  llmModelIdentifier: "model",
  workspaceRootPath: "/workspace",
  skillTargets: [
    {
      skillName: "skill-a",
      skillRootPath: "/skills/a",
      skillMdPath: "/skills/a/SKILL.md",
      isWritable: true,
      gitRootPath: "/skills",
      rollbackMode: "git",
    },
    {
      skillName: "skill-b",
      skillRootPath: "/skills/b",
      skillMdPath: "/skills/b/SKILL.md",
      isWritable: true,
      gitRootPath: null,
      rollbackMode: "unversioned",
    },
  ],
  evidenceSummaryHash: "hash",
  changeSummary: {
    detectionMode: "git",
    changedSkillPaths: ["/skills/a/SKILL.md"],
    offTargetChangePaths: [],
    gitRoots: ["/skills"],
    diffStat: "1 file changed",
    warnings: ["warning"],
    policyViolations: [],
  },
  updateMetrics: null,
  benefitMetrics: null,
  notificationSummary: { status: "sent_active_idle" },
  errors: [],
});

const laterRuns = [
  { runId: "run-1", agentDefinitionId: "agent-1", agentName: "Agent", workspaceRootPath: "/workspace", summary: "source", createdAt: "2026-01-01T00:00:00.000Z", archivedAt: null, terminatedAt: null },
  { runId: "run-2", agentDefinitionId: "agent-1", agentName: "Agent", workspaceRootPath: "/workspace", summary: "later", createdAt: "2026-01-01T00:02:00.000Z", archivedAt: null, terminatedAt: null },
];

describe("SelfEvolutionMetricsService", () => {
  it("keeps update-production metrics separate from benefit metrics", () => {
    const service = new SelfEvolutionMetricsService();
    const updateMetrics = service.buildUpdateMetrics(baseRecord());
    const benefitMetrics = service.buildInitialBenefitMetrics();

    expect(updateMetrics.evolverRunCompleted).toBe(true);
    expect(updateMetrics.changedSkillCount).toBe(1);
    expect(updateMetrics.gitBackedTargetCount).toBe(1);
    expect(updateMetrics.unversionedTargetCount).toBe(1);
    expect(updateMetrics.notificationStatus).toBe("sent_active_idle");
    expect(updateMetrics.offTargetChangeCount).toBe(0);
    expect(updateMetrics.policyViolationCount).toBe(0);
    expect(benefitMetrics.assessment).toBe("not_enough_data");
    expect(benefitMetrics.skillAdherence.status).toBe("not_collectible");
  });

  it("links later target runs only when configured skills overlap changed skill targets", async () => {
    const record = baseRecord();
    const written: SelfEvolutionRunRecord[] = [];
    const service = new SelfEvolutionMetricsService({
      runStore: {
        readRecord: async () => record,
        writeRecord: async (nextRecord: SelfEvolutionRunRecord) => { written.push(nextRecord); },
      } as never,
      agentRunMetadataService: {
        readMetadata: async () => ({ agentDefinitionId: "agent-1" }),
      } as never,
      agentRunHistoryCatalogService: {
        listCatalogRows: async () => laterRuns,
      } as never,
      agentDefinitionService: {
        getFreshAgentDefinitionById: async () => ({ id: "agent-1" }),
      } as never,
      skillTargetResolver: {
        resolveForAgentDefinition: async () => [
          { skillName: "skill-b", skillRootPath: "/skills/b", skillMdPath: "/skills/b/SKILL.md", isWritable: true, gitRootPath: null, rollbackMode: "unversioned" },
        ],
      } as never,
    });

    const reportWithoutOverlap = await service.getMetricsReport("evo-1");
    expect(reportWithoutOverlap.benefitMetrics.linkedPostEvolutionRunIds).toEqual([]);
    expect(reportWithoutOverlap.benefitMetrics.linkMethod).toBe("none");

    const overlapService = new SelfEvolutionMetricsService({
      runStore: {
        readRecord: async () => record,
        writeRecord: async (nextRecord: SelfEvolutionRunRecord) => { written.push(nextRecord); },
      } as never,
      agentRunMetadataService: {
        readMetadata: async () => ({ agentDefinitionId: "agent-1" }),
      } as never,
      agentRunHistoryCatalogService: {
        listCatalogRows: async () => laterRuns,
      } as never,
      agentDefinitionService: {
        getFreshAgentDefinitionById: async () => ({ id: "agent-1" }),
      } as never,
      skillTargetResolver: {
        resolveForAgentDefinition: async () => [
          { skillName: "skill-a", skillRootPath: "/skills/a", skillMdPath: "/skills/a/SKILL.md", isWritable: true, gitRootPath: "/skills", rollbackMode: "git" },
        ],
      } as never,
    });

    const reportWithOverlap = await overlapService.getMetricsReport("evo-1");
    expect(reportWithOverlap.benefitMetrics.linkedPostEvolutionRunIds).toEqual(["run-2"]);
    expect(reportWithOverlap.benefitMetrics.linkMethod).toBe("target_identity_and_skill_overlap");
    expect(written.length).toBeGreaterThan(0);
  });
});
