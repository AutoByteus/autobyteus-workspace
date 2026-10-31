/**
 * The Project a run was started under, as the run is told it (REQ-006): its Project ID and current name. Built from the
 * run's stored `projectId` when the run is configured (start or restore); a deleted Project yields none.
 */
export type RunProjectContext = Readonly<{ projectId: string; name: string }>;

/**
 * The port through which run creation and run config builders read a Project by ID, without importing Projects
 * (bound by `compositions/project-run-links-composition.ts`). `null` when the Project does not exist.
 */
export interface RunProjectContextReader {
  contextOf(projectId: string): Promise<RunProjectContext | null>;
}

let configured: RunProjectContextReader | null = null;

/** Bound once per process by the composition; `close()` releases the binding. */
export const configureRunProjectContextReader = (reader: RunProjectContextReader): Readonly<{ close(): void }> => {
  configured = reader;
  return Object.freeze({ close: () => { if (configured === reader) configured = null; } });
};

/** The Project's context; `null` when the Project does not exist or no Projects are composed in this process. */
export const readRunProjectContext = async (projectId: string | null | undefined): Promise<RunProjectContext | null> => {
  const id = projectId?.trim();
  if (!id || !configured) return null;
  return configured.contextOf(id);
};

/** Run creation's check of a chosen Project: its trimmed ID, or `PROJECT_NOT_FOUND` before any record is written. */
export const requireRunProjectId = async (projectId: string | null | undefined): Promise<string | undefined> => {
  const id = projectId?.trim();
  if (!id) return undefined;
  if (!(await readRunProjectContext(id))) throw new Error(`PROJECT_NOT_FOUND: Project '${id}' was not found.`);
  return id;
};
