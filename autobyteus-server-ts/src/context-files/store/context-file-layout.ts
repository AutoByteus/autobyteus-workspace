import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type {
  ContextFileDraftOwnerDescriptor,
  ContextFileResolvedFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";
import { assertStoredFilename } from "../domain/context-file-owner-types.js";

const resolveSafeChildPath = (rootDir: string, ...segments: string[]): string => {
  const resolvedRoot = path.resolve(rootDir);
  const candidate = path.resolve(resolvedRoot, ...segments);
  if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Invalid context-file path.");
  }
  return candidate;
};

export class ContextFileLayout {
  private readonly draftRootDir: string;
  private readonly agentMemoryLayout: AgentMemoryLayout;

  constructor() {
    const appConfig = appConfigProvider.config;
    this.draftRootDir = path.join(appConfig.getAppDataDir(), "draft_context_files");
    const memoryDir = appConfig.getMemoryDir();
    this.agentMemoryLayout = new AgentMemoryLayout(memoryDir);
  }

  getDraftRootDirPath(): string {
    return this.draftRootDir;
  }

  getDraftOwnerDirPath(owner: ContextFileDraftOwnerDescriptor): string {
    if (owner.kind === "agent_draft") {
      return resolveSafeChildPath(this.draftRootDir, "agent-runs", owner.draftRunId, "context_files");
    }

    return resolveSafeChildPath(
      this.draftRootDir,
      "team-runs",
      owner.teamDraftId,
      "members",
      encodeURIComponent(owner.memberAddress),
      "context_files",
    );
  }

  getFinalOwnerDirPath(owner: ContextFileResolvedFinalOwnerDescriptor): string {
    if (owner.kind === "agent_final") {
      return resolveSafeChildPath(
        this.agentMemoryLayout.getStandaloneRunDirPath(owner.runId),
        "context_files",
      );
    }

    return resolveSafeChildPath(
      owner.memoryDir,
      "context_files",
    );
  }

  getDraftFilePath(owner: ContextFileDraftOwnerDescriptor, storedFilename: string): string {
    return resolveSafeChildPath(this.getDraftOwnerDirPath(owner), assertStoredFilename(storedFilename));
  }

  getFinalFilePath(owner: ContextFileResolvedFinalOwnerDescriptor, storedFilename: string): string {
    return resolveSafeChildPath(this.getFinalOwnerDirPath(owner), assertStoredFilename(storedFilename));
  }

  async ensureDraftOwnerDir(owner: ContextFileDraftOwnerDescriptor): Promise<void> {
    await fs.mkdir(this.getDraftOwnerDirPath(owner), { recursive: true });
  }

  async ensureFinalOwnerDir(owner: ContextFileResolvedFinalOwnerDescriptor): Promise<void> {
    await fs.mkdir(this.getFinalOwnerDirPath(owner), { recursive: true });
  }
}
