import type { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
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
  close(): Promise<void>;
}>;

/**
 * Builds the subsystem. A run's used skills are resolved exactly as its runtime resolves them at
 * activation (its agent definition through the skill catalog, `ALL_INSTALLED` and application
 * bundles included), and re-resolved the same way when one of its skill folders changes.
 */
export const createSkillUpdateNotices = (input: Readonly<{
  agentDefinitionService: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  /** Defaults to the process skill service, looked up when a run's skills are first resolved. */
  skillService?: Pick<SkillService, "resolveConfiguredSkillsForAgent">;
  settleQuietMs?: number;
  settleCapMs?: number;
  createWatch?: SkillFolderWatchFactory;
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
    resolveUsedSkills: async (run) => {
      const definition = await input.agentDefinitionService.getAgentDefinitionById(run.config.agentDefinitionId);
      const skillService = input.skillService ?? SkillService.getInstance();
      return skillService.resolveConfiguredSkillsForAgent(definition)
        .map((skill) => ({ name: skill.name, rootPath: skill.rootPath }));
    },
  });
  const service = new SkillUpdateNoticeService({ tracker, watcher, snapshotter });
  let closing: Promise<void> | null = null;
  return Object.freeze({
    service,
    watcher,
    close: () => {
      closing ??= (async () => {
        await watcher.close();
        service.close();
      })();
      return closing;
    },
  });
};
