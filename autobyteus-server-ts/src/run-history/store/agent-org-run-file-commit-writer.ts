import {
  AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";

/** Subject-owned facade over the established fail-stop atomic JSON writer mechanics. */
export class AgentOrgRunFileCommitWriter {
  constructor(private readonly writer = new AtomicRunPackageFileCommitWriter()) {}

  write(filePath: string, payload: unknown): Promise<RunPackageFileWriteResult> {
    return this.writer.write({ file: "execution_tree", filePath, payload });
  }
}

let cached: AgentOrgRunFileCommitWriter | null = null;

export const getAgentOrgRunFileCommitWriter = (): AgentOrgRunFileCommitWriter =>
  cached ??= new AgentOrgRunFileCommitWriter();
