import fs from "node:fs/promises";
import path from "node:path";

export type RunPackageFileRole = string;

export type RunPackagePreRenameStage =
  | "prepare_directory"
  | "write_temp"
  | "sync_temp"
  | "close_temp"
  | "rename";

export type RunPackageDirectoryFinalizationStage =
  | "open_directory"
  | "sync_directory"
  | "close_directory";

export type RunPackageFileWriteResult<TFile extends RunPackageFileRole = RunPackageFileRole> =
  | Readonly<{
      outcome: "not_renamed";
      file: TFile;
      stage: RunPackagePreRenameStage;
      cause: Error;
    }>
  | Readonly<{
      outcome: "renamed_finalization_indeterminate";
      file: TFile;
      stage: RunPackageDirectoryFinalizationStage;
      cause: Error;
    }>
  | Readonly<{ outcome: "committed"; file: TFile }>;

type RunPackageFileOperations = Pick<
  typeof fs,
  "mkdir" | "open" | "rename" | "rm"
>;

const asError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

const tempPathFor = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

/**
 * Subject-neutral physical writer for current root-package JSON authorities. It reports whether rename occurred instead of converting a
 * post-rename directory-sync failure into an ordinary write failure.
 */
export class AtomicRunPackageFileCommitWriter {
  private readonly operations: RunPackageFileOperations;

  constructor(options: { operations?: RunPackageFileOperations } = {}) {
    this.operations = options.operations ?? fs;
  }

  async write<TFile extends RunPackageFileRole>(input: {
    file: TFile;
    filePath: string;
    payload: unknown;
  }): Promise<RunPackageFileWriteResult<TFile>> {
    let text: string;
    try { text = `${JSON.stringify(input.payload, null, 2)}\n`; }
    catch (cause) { return { outcome: "not_renamed", file: input.file, stage: "write_temp", cause: asError(cause) }; }
    return this.writeSerializedText({ file: input.file, filePath: input.filePath, text });
  }

  /** Already serialized authority bytes (for example migration JSONL); same commit boundary. */
  async writeSerializedText<TFile extends RunPackageFileRole>(input: {
    file: TFile;
    filePath: string;
    text: string;
  }): Promise<RunPackageFileWriteResult<TFile>> {
    const filePath = path.resolve(input.filePath);
    const directory = path.dirname(filePath);
    const tempPath = tempPathFor(filePath);
    let stage: RunPackagePreRenameStage = "prepare_directory";
    let tempHandle: fs.FileHandle | null = null;

    try {
      await this.operations.mkdir(directory, { recursive: true });
      stage = "write_temp";
      tempHandle = await this.operations.open(tempPath, "wx");
      await tempHandle.writeFile(input.text, "utf-8");
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
    let finalizationStage: RunPackageDirectoryFinalizationStage = "open_directory";
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

let cachedAtomicRunPackageFileCommitWriter: AtomicRunPackageFileCommitWriter | null = null;

export const getAtomicRunPackageFileCommitWriter = (): AtomicRunPackageFileCommitWriter =>
  cachedAtomicRunPackageFileCommitWriter ??= new AtomicRunPackageFileCommitWriter();
