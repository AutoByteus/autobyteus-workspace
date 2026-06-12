import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";

export type AgentRunHistoryIdentity = {
  runId: string;
  runDirPath: string;
  metadataPath: string;
};

const hasUnsafeRunIdShape = (value: string): boolean => {
  if (!value) {
    return true;
  }
  if (path.isAbsolute(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    return true;
  }
  if (/[\\/]/.test(value)) {
    return true;
  }
  return value === "." || value === "..";
};

const isInsideRoot = (candidatePath: string, rootPath: string): boolean => {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  return (
    resolvedCandidate !== resolvedRoot &&
    resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
};

export class AgentRunHistoryIdentityResolver {
  private readonly layout: AgentMemoryLayout;

  constructor(memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  resolve(rawRunId: string, options: { rejectDraftIds?: boolean } = {}): AgentRunHistoryIdentity | null {
    const runId = rawRunId.trim();
    if (hasUnsafeRunIdShape(runId)) {
      return null;
    }
    if (options.rejectDraftIds === true && runId.startsWith("temp-")) {
      return null;
    }

    const agentsRoot = path.resolve(this.layout.getStandaloneRootDirPath());
    const runDirPath = path.resolve(agentsRoot, runId);
    const metadataPath = path.resolve(runDirPath, "run_metadata.json");
    if (!isInsideRoot(runDirPath, agentsRoot) || !isInsideRoot(metadataPath, agentsRoot)) {
      return null;
    }

    return {
      runId,
      runDirPath,
      metadataPath,
    };
  }
}
