import { AtomicRunPackageFileCommitWriter } from "./atomic-run-package-file-commit-writer.js";

/** Subject-owned facade over the established fail-stop atomic JSON writer mechanics. */
export class AgentOrgRunFileCommitWriter {
  constructor(private readonly writer = new AtomicRunPackageFileCommitWriter()) {}
}

let cached: AgentOrgRunFileCommitWriter | null = null;

export const getAgentOrgRunFileCommitWriter = (): AgentOrgRunFileCommitWriter =>
  cached ??= new AgentOrgRunFileCommitWriter();
