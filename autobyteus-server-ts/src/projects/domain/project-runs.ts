/** A top-level run started with a Project chosen (projects-left-navigation, REQ-004): an Agent run or a Team run. */
export type ProjectRunRoot = Readonly<{ kind: "agent" | "agent_team"; runId: string }>;

/** One run started under the Project, recorded once at its creation and never rewritten. */
export type ProjectRunEntry = Readonly<{ root: ProjectRunRoot; linkedAt: string }>;

/** `projects/<projectId>/project_runs.json`: the runs started under the Project, oldest first; entries are only appended. */
export type ProjectRunsFile = Readonly<{ projectId: string; runs: readonly ProjectRunEntry[] }>;

export const emptyProjectRunsFile = (projectId: string): ProjectRunsFile => ({ projectId, runs: [] });

export const projectRunRootKey = (root: ProjectRunRoot): string => `${root.kind}\u0000${root.runId}`;

/** The file with the run appended; the same file when the run is already in it (a repeated record is a no-op). */
export const appendProjectRun = (file: ProjectRunsFile, root: ProjectRunRoot, linkedAt: string): ProjectRunsFile =>
  file.runs.some((entry) => projectRunRootKey(entry.root) === projectRunRootKey(root))
    ? file
    : { projectId: file.projectId, runs: [...file.runs, { root: { kind: root.kind, runId: root.runId }, linkedAt }] };
