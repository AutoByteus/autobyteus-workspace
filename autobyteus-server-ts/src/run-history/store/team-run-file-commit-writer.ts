import fs from "node:fs/promises";
import path from "node:path";

export type TeamRunFileRole =
  | "execution_tree"
  | "task_records"
  | "communication_messages";

export type TeamRunPreRenameStage =
  | "prepare_directory"
  | "write_temp"
  | "sync_temp"
  | "close_temp"
  | "rename";

export type TeamRunDirectoryFinalizationStage =
  | "open_directory"
  | "sync_directory"
  | "close_directory";

export type TeamRunFileWriteResult =
  | Readonly<{
      outcome: "not_renamed";
      file: TeamRunFileRole;
      stage: TeamRunPreRenameStage;
      cause: Error;
    }>
  | Readonly<{
      outcome: "renamed_finalization_indeterminate";
      file: TeamRunFileRole;
      stage: TeamRunDirectoryFinalizationStage;
      cause: Error;
    }>
  | Readonly<{ outcome: "committed"; file: TeamRunFileRole }>;

type TeamRunFileOperations = Pick<
  typeof fs,
  "mkdir" | "open" | "rename" | "rm"
>;

const asError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

const tempPathFor = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

/**
 * Strict physical writer shared only by the three current TeamRun JSON
 * authorities. It reports whether rename occurred instead of converting a
 * post-rename directory-sync failure into an ordinary write failure.
 */
export class TeamRunFileCommitWriter {
  private readonly operations: TeamRunFileOperations;

  constructor(options: { operations?: TeamRunFileOperations } = {}) {
    this.operations = options.operations ?? fs;
  }

  async write(input: {
    file: TeamRunFileRole;
    filePath: string;
    payload: unknown;
  }): Promise<TeamRunFileWriteResult> {
    const filePath = path.resolve(input.filePath);
    const directory = path.dirname(filePath);
    const tempPath = tempPathFor(filePath);
    let stage: TeamRunPreRenameStage = "prepare_directory";
    let tempHandle: fs.FileHandle | null = null;

    try {
      await this.operations.mkdir(directory, { recursive: true });
      stage = "write_temp";
      tempHandle = await this.operations.open(tempPath, "wx");
      await tempHandle.writeFile(`${JSON.stringify(input.payload, null, 2)}\n`, "utf-8");
      stage = "sync_temp";
      await tempHandle.sync();
      stage = "close_temp";
      await tempHandle.close();
      tempHandle = null;
      stage = "rename";
      await this.operations.rename(tempPath, filePath);
    } catch (cause) {
      if (tempHandle) {
        await tempHandle.close().catch(() => undefined);
      }
      await this.operations.rm(tempPath, { force: true }).catch(() => undefined);
      return {
        outcome: "not_renamed",
        file: input.file,
        stage,
        cause: asError(cause),
      };
    }

    let directoryHandle: fs.FileHandle | null = null;
    let finalizationStage: TeamRunDirectoryFinalizationStage = "open_directory";
    try {
      directoryHandle = await this.operations.open(directory, "r");
      finalizationStage = "sync_directory";
      await directoryHandle.sync();
      finalizationStage = "close_directory";
      await directoryHandle.close();
      directoryHandle = null;
      return { outcome: "committed", file: input.file };
    } catch (cause) {
      if (directoryHandle) {
        await directoryHandle.close().catch(() => undefined);
      }
      return {
        outcome: "renamed_finalization_indeterminate",
        file: input.file,
        stage: finalizationStage,
        cause: asError(cause),
      };
    }
  }
}

let cachedTeamRunFileCommitWriter: TeamRunFileCommitWriter | null = null;

export const getTeamRunFileCommitWriter = (): TeamRunFileCommitWriter =>
  cachedTeamRunFileCommitWriter ??= new TeamRunFileCommitWriter();
