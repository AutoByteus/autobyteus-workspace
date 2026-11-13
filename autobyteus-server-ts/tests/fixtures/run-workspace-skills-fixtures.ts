import {
  planExposedWorkspaceSkillRequests,
  RunWorkspaceSkills,
  type WorkspaceSkillRequestPlanner,
} from "../../src/agent-execution/backends/shared/run-workspace-skills.js";
import type { WorkspaceSkillMaterializer } from "../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import type { SkillService } from "../../src/skills/services/skill-service.js";

type TestMaterializer = Pick<WorkspaceSkillMaterializer, "materializeConfiguredWorkspaceSkills" | "cleanupMaterializedWorkspaceSkills">;

/** A materializer that links nothing and releases nothing: for runs whose skills a test does not exercise. */
export const createNoopWorkspaceSkillMaterializer = (): TestMaterializer => ({
  materializeConfiguredWorkspaceSkills: async () => ({ materializedSkills: [], effectiveRequests: [] }),
  cleanupMaterializedWorkspaceSkills: async () => undefined,
});

/** A run's workspace skill holder for tests; by default it holds nothing and resolves no skills. */
export const createTestRunWorkspaceSkills = (input: Readonly<{
  runId?: string;
  materializer?: TestMaterializer;
  skillService?: Pick<SkillService, "resolveConfiguredSkillBindingsForAgent" | "resolveSkillScope">;
  planRequests?: WorkspaceSkillRequestPlanner;
}> = {}): RunWorkspaceSkills => new RunWorkspaceSkills({
  runId: input.runId ?? "test-run",
  materializer: input.materializer ?? createNoopWorkspaceSkillMaterializer(),
  skillService: input.skillService ?? { resolveConfiguredSkillBindingsForAgent: () => [], resolveSkillScope: () => "CONFIGURED" },
  planRequests: input.planRequests ?? planExposedWorkspaceSkillRequests,
});

/** A preparation guard that always accepts, holding the run's links in the bootstrapper's own holder. */
export const testPreparationGuard = (
  bootstrapper: Readonly<{ createRunWorkspaceSkills(runId: string): RunWorkspaceSkills }>,
  runId = "run-1",
) => ({
  assertAccepting: () => undefined,
  workspaceSkills: bootstrapper.createRunWorkspaceSkills(runId),
  ownCodexClient: () => undefined,
});

/** An Antigravity run's capsule skills for a backend whose skills a test does not exercise (no capsule on disk). */
export const stubAgyCapsuleSkills = (runId = "agy-run") => ({
  capsule: {
    path: "/nonexistent/agy-project",
    manifest: { version: 1 as const, runId, agentName: "test-agent", workspacePath: "/nonexistent/workspace", agentMarkdownHash: "", skills: [] },
  },
  skillService: { resolveConfiguredSkillBindingsForAgent: () => [], resolveSkillScope: () => "CONFIGURED" as const },
});
