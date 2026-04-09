import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { GitHubAgentPackageInstaller } from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";

const LIVE_GITHUB_SOURCE =
  process.env.AUTOBYTEUS_GITHUB_AGENT_PACKAGE_TEST_URL ??
  "https://github.com/AutoByteus/autobyteus-agents";
const runLiveIntegration =
  process.env.RUN_GITHUB_AGENT_PACKAGE_E2E === "1" ? it : it.skip;

const parseAdditionalRoots = (): string[] => {
  const raw = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS ?? "";
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
};

const listDirectoryNames = async (directoryPath: string): Promise<string[]> => {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
};

describe("GitHub agent package import integration (live)", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();

    delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    await AgentDefinitionService.getInstance().refreshCache();
    await AgentTeamDefinitionService.getInstance().refreshCache();
  });

  runLiveIntegration(
    "imports AutoByteus/autobyteus-agents into managed storage, exposes it through runtime discovery, and removes it cleanly",
    async () => {
      const appDataRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "github-agent-package-live-"),
      );
      cleanupPaths.add(appDataRoot);

      const rootSettingsStore = new AgentPackageRootSettingsStore(
        {
          getAppDataDir: () => appDataRoot,
          getAdditionalAgentPackageRoots: () => parseAdditionalRoots(),
          get: (key: string, defaultValue?: string) =>
            process.env[key] ?? defaultValue,
        },
        {
          updateSetting: (key: string, value: string) => {
            if (value) {
              process.env[key] = value;
            } else {
              delete process.env[key];
            }
            return [true, "updated"];
          },
        },
      );

      const registryStore = new AgentPackageRegistryStore({
        getAppDataDir: () => appDataRoot,
      });
      const installer = new GitHubAgentPackageInstaller({
        config: {
          getAppDataDir: () => appDataRoot,
          getDownloadDir: () => path.join(appDataRoot, "download"),
        },
      });

      const service = new AgentPackageService({
        rootSettingsStore,
        registryStore,
        installer,
        refreshAgentDefinitions: () =>
          AgentDefinitionService.getInstance().refreshCache(),
        refreshAgentTeams: () =>
          AgentTeamDefinitionService.getInstance().refreshCache(),
      });

      const importedPackages = await service.importAgentPackage({
        sourceKind: "GITHUB_REPOSITORY",
        source: LIVE_GITHUB_SOURCE,
      });

      const managedPackage = importedPackages.find(
        (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
      );

      expect(managedPackage).toBeDefined();
      expect(managedPackage?.path).toContain(
        path.join("agent-packages", "github", "autobyteus__autobyteus-agents"),
      );
      expect(
        managedPackage &&
          managedPackage.sharedAgentCount +
            managedPackage.teamLocalAgentCount +
            managedPackage.agentTeamCount,
      ).toBeGreaterThan(0);

      const importedAgentIds = await listDirectoryNames(
        path.join(managedPackage?.path ?? "", "agents"),
      );
      const importedTeamIds = await listDirectoryNames(
        path.join(managedPackage?.path ?? "", "agent-teams"),
      );

      const discoveredAgents = await AgentDefinitionService.getInstance().getAllAgentDefinitions();
      const discoveredTeams =
        await AgentTeamDefinitionService.getInstance().getAllDefinitions();

      expect(
        discoveredAgents.some((definition) => importedAgentIds.includes(definition.id)),
      ).toBe(importedAgentIds.length > 0);
      expect(
        discoveredTeams.some((definition) => importedTeamIds.includes(definition.id)),
      ).toBe(importedTeamIds.length > 0);

      await expect(
        service.importAgentPackage({
          sourceKind: "GITHUB_REPOSITORY",
          source: LIVE_GITHUB_SOURCE,
        }),
      ).rejects.toThrow(/already exists/i);

      await service.removeAgentPackage(managedPackage?.packageId ?? "");
      await expect(fs.access(managedPackage?.path ?? "")).rejects.toBeDefined();

      const discoveredAgentsAfterRemoval =
        await AgentDefinitionService.getInstance().getAllAgentDefinitions();
      const discoveredTeamsAfterRemoval =
        await AgentTeamDefinitionService.getInstance().getAllDefinitions();

      expect(
        discoveredAgentsAfterRemoval.some((definition) =>
          importedAgentIds.includes(definition.id),
        ),
      ).toBe(false);
      expect(
        discoveredTeamsAfterRemoval.some((definition) =>
          importedTeamIds.includes(definition.id),
        ),
      ).toBe(false);
    },
    180_000,
  );
});
