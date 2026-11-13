import type { AgentDefinitionChangeSignal } from "../agent-definition/services/agent-definition-change-signal.js";
import type { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import type { IntegrationRunAccess } from "../credential-proxy/integration-run-access.js";
import { SkillService } from "../skills/services/skill-service.js";
import { SkillFolderWatcher, type SkillFolderWatchFactory } from "./monitor/skill-folder-watcher.js";
import { SeenSkillVersionsStore } from "./providers/seen-skill-versions-store.js";
import { SkillFolderSnapshotter } from "./providers/skill-folder-snapshotter.js";
import { RunSkillTracker } from "./services/run-skill-tracker.js";
import { SkillUpdateNoticeService } from "./services/skill-update-notice-service.js";

/** The skill update notice subsystem of one `AgentRunManager`. */
export type SkillUpdateNotices = Readonly<{
  /** The input-preface port and the run lifecycle observer for the run manager. */
  service: SkillUpdateNoticeService;
  watcher: SkillFolderWatcher;
  tracker: RunSkillTracker;
  close(): Promise<void>;
}>;

/**
 * Builds the subsystem. A run's used skills are resolved exactly as its runtime resolves them at
 * activation (its agent definition through the skill catalog, `ALL_INSTALLED` and application
 * bundles included). On every agent definition change each tracked run's definition is read again
 * by ID: a skill added to it is set up on the run's runtime and announced, a removed one announced.
 * When one of its skill folders changes they are re-resolved with the run's current definition
 * through the current catalog.
 */
export const createSkillUpdateNotices = (input: Readonly<{
  agentDefinitionService: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  definitionChanges: Pick<AgentDefinitionChangeSignal, "subscribe">;
  /** Names the integrations an added skill grants that a run does not hold yet (`null`: this host has none). */
  integrationRunAccess: Pick<IntegrationRunAccess, "integrationsStartingOnRestart"> | null;
  /** Defaults to the process skill service, looked up when a run's skills are first resolved. */
  skillService?: Pick<SkillService, "resolveConfiguredSkillsForAgent">;
  settleQuietMs?: number;
  settleCapMs?: number;
  createWatch?: SkillFolderWatchFactory;
  seenVersionsRetryDelaysMs?: readonly number[];
}>): SkillUpdateNotices => {
  const snapshotter = new SkillFolderSnapshotter();
  const watcher = new SkillFolderWatcher({
    settleQuietMs: input.settleQuietMs,
    settleCapMs: input.settleCapMs,
    createWatch: input.createWatch,
  });
  const tracker = new RunSkillTracker({
    snapshotter,
    store: new SeenSkillVersionsStore(),
    seenVersionsRetryDelaysMs: input.seenVersionsRetryDelaysMs,
    resolution: Object.freeze({
      readDefinition: (run) => input.agentDefinitionService.getAgentDefinitionById(run.config.agentDefinitionId),
      resolveSkills: (definition) => (input.skillService ?? SkillService.getInstance())
        .resolveConfiguredSkillsForAgent(definition)
        .map((skill) => ({ name: skill.name, rootPath: skill.rootPath, description: skill.description })),
    }),
  });
  const service = new SkillUpdateNoticeService({
    tracker, watcher, snapshotter,
    agentDefinitionService: input.agentDefinitionService,
    integrationRunAccess: input.integrationRunAccess,
  });
  const unsubscribe = input.definitionChanges.subscribe(() => { void service.onDefinitionsChanged(); });
  let closing: Promise<void> | null = null;
  return Object.freeze({
    service,
    watcher,
    tracker,
    close: () => {
      closing ??= (async () => {
        // No new definition passes and no new folder changes, then the service (no new deliveries; it
        // waits for a pass in progress), then the tracker, which waits for tracking and seen-version
        // writes in progress.
        unsubscribe();
        await watcher.close();
        await service.close();
        await tracker.close();
      })();
      return closing;
    },
  });
};
