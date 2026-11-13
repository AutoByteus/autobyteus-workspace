import type { AgentDefinition } from "../../../agent-definition/domain/models.js";
import type { ConfiguredAgentSkillBinding } from "../../../skills/domain/configured-agent-skill-binding.js";
import type { SkillService } from "../../../skills/services/skill-service.js";
import { workspaceCollisionPolicyForScope, type WorkspaceCollisionPolicy } from "./workspace-skill-collision-policy.js";
import type {
  MaterializedWorkspaceSkill,
  WorkspaceSkillMaterializer,
  WorkspaceSkillReconciliationRequest,
} from "./workspace-skill-materializer.js";

/**
 * Which request each binding becomes in a workspace (a question its runtime answers). The default exposes every
 * resolved skill; Codex also asks its app server which skills it already discovers (`CodexWorkspaceSkillRequestPlanner`).
 */
export type WorkspaceSkillRequestPlanner = (input: Readonly<{
  workingDirectory: string;
  bindings: readonly ConfiguredAgentSkillBinding[];
  assertAccepting: () => void;
}>) => Promise<WorkspaceSkillReconciliationRequest[]>;

/** Every resolved skill is linked into the workspace; an unresolved name is reconciled (a broken link is removed). */
export const planExposedWorkspaceSkillRequests: WorkspaceSkillRequestPlanner = async ({ bindings }) =>
  exposedWorkspaceSkillRequests(bindings);

export const exposedWorkspaceSkillRequests = (
  bindings: readonly ConfiguredAgentSkillBinding[],
): WorkspaceSkillReconciliationRequest[] => bindings.map((binding) => binding.kind === "resolved"
  ? { kind: "expose-resolved", skill: binding.skill }
  : { kind: "reconcile-unresolved", name: binding.name });

const RELEASED_ERROR = "The run's workspace skills were released.";

const defaultLogger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * The single holder of one run's workspace skill links (Claude, Codex, Grok, DeepSeek), from preparation to release
 * (design DS-003).
 *
 * - `acquire`: the preparation's links; its requests become the run's applied names.
 * - `addFrom`: a skill added to the run's definition mid-run is linked, one name at a time; adds run one after
 *   another. A name that fails is logged and stays unapplied (the next add for this run tries it again); it never
 *   fails the run, and nothing is ever removed mid-run.
 * - `release`: the only release of the run's links. It sets `closed` first, then waits for the add in flight (which
 *   stops at its next check, and the materializer rolls that link back), then releases every held link. A failed
 *   release can be retried; `closed` stays set.
 *
 * Every acquisition's guard reads `closed`, set synchronously by `release()`, never the backend's "active" state: on
 * Claude and Codex a run stays "active" until its cleanup has finished, after its links were released.
 */
export class RunWorkspaceSkills {
  private readonly held: MaterializedWorkspaceSkill[] = [];
  private readonly applied = new Set<string>();
  private linkedCount = 0;
  private workingDirectory: string | null = null;
  private closed = false;
  /** The adds in order: each starts after the one before it has settled. */
  private adding: Promise<void> = Promise.resolve();
  private releasing: Promise<void> | null = null;
  private readonly logger: Readonly<{ warn: (...args: unknown[]) => void }>;

  constructor(private readonly deps: Readonly<{
    runId: string;
    materializer: Pick<WorkspaceSkillMaterializer, "materializeConfiguredWorkspaceSkills" | "cleanupMaterializedWorkspaceSkills">;
    skillService: Pick<SkillService, "resolveConfiguredSkillBindingsForAgent" | "resolveSkillScope">;
    planRequests: WorkspaceSkillRequestPlanner;
    logger?: Readonly<{ warn: (...args: unknown[]) => void }>;
  }>) {
    this.logger = deps.logger ?? defaultLogger;
  }

  /**
   * The preparation's acquisition in the run's workspace. Its requests (Codex: including the skills Codex discovers
   * itself) are the run's applied names, so an add for a definition the run was prepared with does nothing.
   */
  async acquire(input: Readonly<{
    workingDirectory: string;
    requests: WorkspaceSkillReconciliationRequest[];
    workspaceCollisionPolicy: WorkspaceCollisionPolicy;
    assertPreparing: () => void;
  }>): Promise<void> {
    this.assertOpen();
    this.workingDirectory = input.workingDirectory;
    const result = await this.deps.materializer.materializeConfiguredWorkspaceSkills({
      runId: this.deps.runId,
      workingDirectory: input.workingDirectory,
      requests: input.requests,
      workspaceCollisionPolicy: input.workspaceCollisionPolicy,
      onAcquired: (descriptor) => { this.held.push(descriptor); },
      assertAccepting: () => { input.assertPreparing(); this.assertOpen(); },
    });
    this.linkedCount += result.materializedSkills.length;
    for (const request of result.effectiveRequests) {
      if (request.kind !== "reconcile-unresolved") this.applied.add(request.skill.name);
    }
  }

  /**
   * Links the definition's resolved skills that are not applied yet, one name per acquisition, after any add before
   * it. Resolves when done; a failure is logged per name and never rejects.
   */
  addFrom(definition: AgentDefinition): Promise<void> {
    const next = this.adding.then(() => this.addNow(definition));
    this.adding = next;
    return next;
  }

  /** Whether the run holds at least one link (Claude allows its `Skill` tool from this, per CLI process generation). */
  hasSkills(): boolean {
    return this.linkedCount > 0;
  }

  /** Closes the run to new links, waits for the add in flight, then releases every held link. Idempotent. */
  release(): Promise<void> {
    this.closed = true;
    if (this.releasing) return this.releasing;
    const attempt = (async () => {
      await this.adding;
      await this.deps.materializer.cleanupMaterializedWorkspaceSkills([...this.held]);
    })();
    this.releasing = attempt;
    // Kept once done (idempotent); dropped after a failure, so the next call tries again.
    attempt.catch(() => { if (this.releasing === attempt) this.releasing = null; });
    return attempt;
  }

  private async addNow(definition: AgentDefinition): Promise<void> {
    const workingDirectory = this.workingDirectory;
    if (this.closed || workingDirectory === null) return;
    try {
      const bindings = this.deps.skillService.resolveConfiguredSkillBindingsForAgent(definition)
        .filter((binding) => binding.kind === "resolved" && !this.applied.has(binding.skill.name));
      if (bindings.length === 0) return;
      const workspaceCollisionPolicy = workspaceCollisionPolicyForScope(this.deps.skillService.resolveSkillScope(definition));
      const requests = await this.deps.planRequests({ workingDirectory, bindings, assertAccepting: () => this.assertOpen() });
      for (const request of requests) {
        if (this.closed) return;
        if (request.kind === "reconcile-unresolved") continue;
        await this.addOne(workingDirectory, request, workspaceCollisionPolicy);
      }
    } catch (error) {
      if (!this.closed) this.logger.warn(`RUN_WORKSPACE_SKILLS_ADD_FAILED: run=${this.deps.runId}: ${String(error)}`);
    }
  }

  /** One name: its own acquisition, so a collision on one name never rolls back another (AR-002). */
  private async addOne(
    workingDirectory: string,
    request: Exclude<WorkspaceSkillReconciliationRequest, { kind: "reconcile-unresolved" }>,
    workspaceCollisionPolicy: WorkspaceCollisionPolicy,
  ): Promise<void> {
    try {
      const result = await this.deps.materializer.materializeConfiguredWorkspaceSkills({
        runId: this.deps.runId,
        workingDirectory,
        requests: [request],
        workspaceCollisionPolicy,
        onAcquired: (descriptor) => { this.held.push(descriptor); },
        assertAccepting: () => this.assertOpen(),
      });
      this.linkedCount += result.materializedSkills.length;
      this.applied.add(request.skill.name);
    } catch (error) {
      // Released meanwhile: the materializer rolled this link back.
      if (this.closed) return;
      this.logger.warn(`RUN_WORKSPACE_SKILL_ADD_FAILED: run=${this.deps.runId}, skill=${request.skill.name}: ${String(error)}`);
    }
  }

  private assertOpen(): void {
    if (this.closed) throw new Error(RELEASED_ERROR);
  }
}
