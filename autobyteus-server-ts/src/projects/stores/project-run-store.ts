import fs from "node:fs/promises";
import { readJsonFile, updateJsonFile } from "../../persistence/file/store-utils.js";
import { appendProjectRun, emptyProjectRunsFile, type ProjectRunEntry, type ProjectRunRoot, type ProjectRunsFile } from "../domain/project-runs.js";
import { ProjectsLayout } from "./projects-layout.js";

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value === value.trim();

const parseEntry = (value: unknown): ProjectRunEntry | null => {
  if (!isRecord(value) || !isRecord(value.root) || !nonBlank(value.linkedAt)) return null;
  const { kind, runId } = value.root;
  if ((kind !== "agent" && kind !== "agent_team") || !nonBlank(runId)) return null;
  return { root: { kind, runId }, linkedAt: value.linkedAt };
};

/**
 * Reads tolerantly: a file that is not an object of this Project throws (the caller leaves the Project's started runs
 * out); an invalid entry is skipped with a warning naming the Project, the others are kept (DESIGN rule 7).
 */
export const parseProjectRunsFile = (value: unknown, projectId: string): ProjectRunsFile => {
  if (!isRecord(value) || value.projectId !== projectId || !Array.isArray(value.runs)) {
    throw new Error(`project_runs.json of Project '${projectId}' is not a runs file of this Project.`);
  }
  const runs: ProjectRunEntry[] = [];
  for (const candidate of value.runs) {
    const entry = parseEntry(candidate);
    if (entry) runs.push(entry);
    else console.warn("PROJECT_RUN_ENTRY_IGNORED", { projectId, entry: candidate });
  }
  return { projectId, runs };
};

/** The exact written shape: only current fields. */
const serialize = (file: ProjectRunsFile) => ({
  projectId: file.projectId,
  runs: file.runs.map((entry) => ({ root: { kind: entry.root.kind, runId: entry.root.runId }, linkedAt: entry.linkedAt })),
});

/**
 * `projects/<projectId>/project_runs.json` (projects-left-navigation, SR-009): enumeration, tolerant reads, and appends
 * under the file's lock with an atomic replace, as the Task run resource files. A missing file is an empty one.
 */
export class ProjectRunStore {
  constructor(readonly layout = new ProjectsLayout()) {}

  /** The Projects that have a runs file. */
  async list(): Promise<string[]> {
    let folders: string[];
    try { folders = (await fs.readdir(this.layout.root, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
    const found: string[] = [];
    for (const folder of folders) {
      const projectId = this.layout.idOfFolder(folder);
      if (projectId && await fs.access(this.layout.projectRunsFile(projectId)).then(() => true, () => false)) found.push(projectId);
    }
    return found;
  }

  /** Throws when the file can't be read as this Project's runs file. */
  async read(projectId: string): Promise<ProjectRunsFile> {
    const raw = await readJsonFile<unknown>(this.layout.projectRunsFile(projectId), null);
    return raw === null ? emptyProjectRunsFile(projectId) : parseProjectRunsFile(raw, projectId);
  }

  /** Appends the run under the file's lock; returns the committed file. */
  async append(projectId: string, root: ProjectRunRoot, linkedAt: string): Promise<ProjectRunsFile> {
    let next!: ProjectRunsFile;
    await updateJsonFile<unknown>(this.layout.projectRunsFile(projectId), null, (raw) => {
      const current = raw === null ? emptyProjectRunsFile(projectId) : parseProjectRunsFile(raw, projectId);
      next = appendProjectRun(current, root, linkedAt);
      return serialize(next);
    });
    return next;
  }
}
