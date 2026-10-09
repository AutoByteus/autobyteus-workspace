import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { idOfSegmentFolder, segment } from "./projects-layout.js";

/**
 * The single path owner for `<appData>/ad-hoc-tasks/`: `<taskId>/{task.json, agent_run_resources.json}`.
 * It sits outside the Projects root, so no Projects scan or migration gate ever sees an ad-hoc Task.
 */
export class AdHocTasksLayout {
  constructor(readonly root = path.join(appConfigProvider.config.getAppDataDir(), "ad-hoc-tasks")) {}

  taskDir(taskId: string): string { return path.join(this.root, segment(taskId)); }
  taskFile(taskId: string): string { return path.join(this.taskDir(taskId), "task.json"); }
  taskExecutionResourcesFile(taskId: string): string { return path.join(this.taskDir(taskId), "agent_run_resources.json"); }
  /** The id a folder name stands for, when it is a valid encoded segment. */
  idOfFolder(name: string): string | null { return idOfSegmentFolder(name); }
}
