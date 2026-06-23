import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { AgentMemoryExplorerService } from "../../agent-memory/services/agent-memory-explorer-service.js";
import { TeamMemoryExplorerService } from "../../agent-memory/services/team-memory-explorer-service.js";

export const createImportedAgentMemoryExplorerService = (importRootDir: string): AgentMemoryExplorerService =>
  new AgentMemoryExplorerService(new MemoryFileStore(importRootDir, { warnOnMissingFiles: false }), importRootDir);

export const createImportedTeamMemoryExplorerService = (importRootDir: string): TeamMemoryExplorerService =>
  new TeamMemoryExplorerService(importRootDir);
