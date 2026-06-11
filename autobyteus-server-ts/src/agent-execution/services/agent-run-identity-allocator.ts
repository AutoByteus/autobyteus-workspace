import fs from "node:fs/promises";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentRunMemoryLayout } from "../../agent-memory/store/agent-run-memory-layout.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataService, getAgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { TeamRunMetadataService, getTeamRunMetadataService } from "../../run-history/services/team-run-metadata-service.js";
import type { TeamRunMemberMetadata } from "../../run-history/store/team-run-metadata-types.js";
import { AgentRunManager } from "./agent-run-manager.js";
import {
  createUuidIdentityToken,
  generateAgentRunIdForDefinitionName,
  normalizeStoredAgentRunId,
} from "../identity/agent-run-id.js";

const MAX_ALLOCATION_ATTEMPTS = 64;

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

type AgentRunIdentityAllocatorOptions = {
  agentDefinitionService?: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  agentRunManager?: Pick<AgentRunManager, "hasActiveRun">;
  agentRunMetadataService?: Pick<AgentRunMetadataService, "readMetadata">;
  teamRunMetadataService?: Pick<TeamRunMetadataService, "listTeamRunIds" | "readMetadata">;
  memoryDir?: string;
  createToken?: () => string;
};

export class AgentRunIdentityAllocator {
  private static instance: AgentRunIdentityAllocator | null = null;

  static getInstance(options: AgentRunIdentityAllocatorOptions = {}): AgentRunIdentityAllocator {
    if (!AgentRunIdentityAllocator.instance) {
      AgentRunIdentityAllocator.instance = new AgentRunIdentityAllocator(options);
    }
    return AgentRunIdentityAllocator.instance;
  }

  private readonly agentDefinitionService: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  private readonly agentRunManager: Pick<AgentRunManager, "hasActiveRun">;
  private readonly agentRunMetadataService: Pick<AgentRunMetadataService, "readMetadata">;
  private readonly teamRunMetadataService: Pick<TeamRunMetadataService, "listTeamRunIds" | "readMetadata">;
  private readonly agentMemoryLayout: AgentRunMemoryLayout;
  private readonly agentMemoryLayoutV2: AgentMemoryLayout;
  private readonly createToken: () => string;
  private readonly reservations = new Set<string>();

  constructor(options: AgentRunIdentityAllocatorOptions = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.agentRunManager = options.agentRunManager ?? AgentRunManager.getInstance();
    this.agentRunMetadataService = options.agentRunMetadataService ?? getAgentRunMetadataService();
    this.teamRunMetadataService = options.teamRunMetadataService ?? getTeamRunMetadataService();
    this.agentMemoryLayout = new AgentRunMemoryLayout(memoryDir);
    this.agentMemoryLayoutV2 = new AgentMemoryLayout(memoryDir);
    this.createToken = options.createToken ?? createUuidIdentityToken;
  }

  async allocateForAgentDefinition(agentDefinitionId: string): Promise<string> {
    const normalizedDefinitionId = normalizeRequiredString(agentDefinitionId, "agentDefinitionId");
    const definition = await this.agentDefinitionService.getAgentDefinitionById(normalizedDefinitionId);
    if (!definition) {
      throw new Error(
        `AgentDefinition '${normalizedDefinitionId}' cannot be loaded for agent run identity allocation.`,
      );
    }

    for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
      const candidate = normalizeStoredAgentRunId(
        generateAgentRunIdForDefinitionName(definition.name, this.createToken()),
      );
      if (this.reservations.has(candidate)) {
        continue;
      }
      this.reservations.add(candidate);
      try {
        if (await this.hasCollision(candidate)) {
          this.reservations.delete(candidate);
          continue;
        }
        return candidate;
      } catch (error) {
        this.reservations.delete(candidate);
        throw error;
      }
    }

    throw new Error(
      `Unable to allocate a unique agent run id for AgentDefinition '${normalizedDefinitionId}'.`,
    );
  }

  private async hasCollision(runId: string): Promise<boolean> {
    if (this.agentRunManager.hasActiveRun(runId)) {
      return true;
    }
    if (await this.agentRunMetadataService.readMetadata(runId)) {
      return true;
    }
    if (await this.pathExists(this.agentMemoryLayout.getRunDirPath(runId))) {
      return true;
    }
    return this.hasTeamRunCollision(runId);
  }

  private async hasTeamRunCollision(runId: string): Promise<boolean> {
    const teamRunIds = await this.teamRunMetadataService.listTeamRunIds();
    for (const teamRunId of teamRunIds) {
      if (teamRunId === runId) {
        return true;
      }
      if (await this.pathExists(this.agentMemoryLayoutV2.getTeamAgentRunDirPath({
        rootTeamRunId: teamRunId,
        teamRunPath: [],
      }, runId))) {
        return true;
      }
      const metadata = await this.teamRunMetadataService.readMetadata(teamRunId);
      if (metadata && this.memberTreeContainsRunId(metadata.memberTree, runId)) {
        return true;
      }
    }
    return false;
  }

  private memberTreeContainsRunId(
    members: readonly TeamRunMemberMetadata[],
    runId: string,
  ): boolean {
    for (const member of members) {
      if (member.memberRunId === runId) {
        return true;
      }
      if (member.memberKind === "agent_team") {
        if (member.teamRunId === runId) {
          return true;
        }
        if (this.memberTreeContainsRunId(member.memberTree, runId)) {
          return true;
        }
      }
    }
    return false;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
