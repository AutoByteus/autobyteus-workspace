import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentRunMemoryLayout } from "../../agent-memory/store/agent-run-memory-layout.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { buildTeamMemberRunId } from "../../run-history/utils/team-member-run-id.js";
import type {
  ContextFileDraftOwnerDescriptor,
  ContextFileFinalOwnerDescriptor,
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
  private readonly agentRunMemoryLayout: AgentRunMemoryLayout;
  private readonly teamMemberMemoryLayout: TeamMemberMemoryLayout;

  constructor() {
    const appConfig = appConfigProvider.config;
    this.draftRootDir = path.join(appConfig.getAppDataDir(), "draft_context_files");
    const memoryDir = appConfig.getMemoryDir();
    this.agentRunMemoryLayout = new AgentRunMemoryLayout(memoryDir);
    this.teamMemberMemoryLayout = new TeamMemberMemoryLayout(memoryDir);
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
      owner.draftTeamRunId,
      "members",
      owner.memberRouteKey,
      "context_files",
    );
  }

  getFinalOwnerDirPath(owner: ContextFileFinalOwnerDescriptor): string {
    if (owner.kind === "agent_final") {
      return resolveSafeChildPath(
        this.agentRunMemoryLayout.getRunDirPath(owner.runId),
        "context_files",
      );
    }

    const memberRunId = buildTeamMemberRunId(owner.teamRunId, owner.memberRouteKey);
    return resolveSafeChildPath(
      this.teamMemberMemoryLayout.getMemberDirPath(owner.teamRunId, memberRunId),
      "context_files",
    );
  }

  getDraftFilePath(owner: ContextFileDraftOwnerDescriptor, storedFilename: string): string {
    return resolveSafeChildPath(this.getDraftOwnerDirPath(owner), assertStoredFilename(storedFilename));
  }

  getFinalFilePath(owner: ContextFileFinalOwnerDescriptor, storedFilename: string): string {
    return resolveSafeChildPath(this.getFinalOwnerDirPath(owner), assertStoredFilename(storedFilename));
  }

  async ensureDraftOwnerDir(owner: ContextFileDraftOwnerDescriptor): Promise<void> {
    await fs.mkdir(this.getDraftOwnerDirPath(owner), { recursive: true });
  }

  async ensureFinalOwnerDir(owner: ContextFileFinalOwnerDescriptor): Promise<void> {
    await fs.mkdir(this.getFinalOwnerDirPath(owner), { recursive: true });
  }
}
