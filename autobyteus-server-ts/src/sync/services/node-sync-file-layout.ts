import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";

export type SyncAgentDefinition = {
  agentId: string;
  files: {
    agentMd: string;
    agentConfigJson: string;
  };
};

export type SyncLocalAgentDefinition = {
  agentId: string;
  files: {
    agentMd: string;
    agentConfigJson: string;
  };
};

export type SyncAgentTeamDefinition = {
  teamId: string;
  files: {
    teamMd: string;
    teamConfigJson: string;
  };
  localAgents: SyncLocalAgentDefinition[];
};

const getDataDir = (): string => appConfigProvider.config.getAppDataDir();
const getAgentDir = (agentId: string): string => path.join(getDataDir(), "agents", agentId);
const getTeamDir = (teamId: string): string => path.join(getDataDir(), "agent-teams", teamId);
const getTeamLocalAgentDir = (teamId: string, agentId: string): string =>
  path.join(getTeamDir(teamId), "agents", agentId);

const getAgentMdPath = (agentId: string): string => appConfigProvider.config.getAgentMdPath(agentId);
const getAgentConfigPath = (agentId: string): string =>
  appConfigProvider.config.getAgentConfigPath(agentId);
const getTeamMdPath = (teamId: string): string => appConfigProvider.config.getTeamMdPath(teamId);
const getTeamConfigPath = (teamId: string): string => appConfigProvider.config.getTeamConfigPath(teamId);
const getTeamLocalAgentMdPath = (teamId: string, agentId: string): string =>
  appConfigProvider.config.getTeamLocalAgentMdPath(teamId, agentId);
const getTeamLocalAgentConfigPath = (teamId: string, agentId: string): string =>
  appConfigProvider.config.getTeamLocalAgentConfigPath(teamId, agentId);

async function readTextFile(filePath: string, fallback: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return fallback;
  }
}

async function readLocalAgentPayloads(teamId: string): Promise<SyncLocalAgentDefinition[]> {
  const localAgentsDir = path.join(getTeamDir(teamId), "agents");
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(localAgentsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const payloads: SyncLocalAgentDefinition[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    payloads.push({
      agentId: entry.name,
      files: {
        agentMd: await readTextFile(path.join(localAgentsDir, entry.name, "agent.md"), ""),
        agentConfigJson: await readTextFile(
          path.join(localAgentsDir, entry.name, "agent-config.json"),
          "{}\n",
        ),
      },
    });
  }

  return payloads;
}

export async function readAgentDefinitionPayload(agentId: string): Promise<SyncAgentDefinition> {
  return {
    agentId,
    files: {
      agentMd: await readTextFile(getAgentMdPath(agentId), ""),
      agentConfigJson: await readTextFile(getAgentConfigPath(agentId), "{}\n"),
    },
  };
}

export async function readAgentTeamDefinitionPayload(
  teamId: string,
): Promise<SyncAgentTeamDefinition> {
  return {
    teamId,
    files: {
      teamMd: await readTextFile(getTeamMdPath(teamId), ""),
      teamConfigJson: await readTextFile(getTeamConfigPath(teamId), "{}\n"),
    },
    localAgents: await readLocalAgentPayloads(teamId),
  };
}

export async function writeAgentDefinitionPayload(payload: SyncAgentDefinition): Promise<void> {
  const agentDir = getAgentDir(payload.agentId);
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(getAgentMdPath(payload.agentId), payload.files.agentMd ?? "", "utf-8");
  await fs.writeFile(
    getAgentConfigPath(payload.agentId),
    payload.files.agentConfigJson ?? "{}\n",
    "utf-8",
  );
}

export async function writeAgentTeamDefinitionPayload(
  payload: SyncAgentTeamDefinition,
): Promise<void> {
  const teamDir = getTeamDir(payload.teamId);
  await fs.mkdir(teamDir, { recursive: true });
  await fs.writeFile(getTeamMdPath(payload.teamId), payload.files.teamMd ?? "", "utf-8");
  await fs.writeFile(
    getTeamConfigPath(payload.teamId),
    payload.files.teamConfigJson ?? "{}\n",
    "utf-8",
  );

  await fs.rm(path.join(teamDir, "agents"), { recursive: true, force: true });
  for (const localAgent of payload.localAgents ?? []) {
    const localAgentDir = getTeamLocalAgentDir(payload.teamId, localAgent.agentId);
    await fs.mkdir(localAgentDir, { recursive: true });
    await fs.writeFile(
      getTeamLocalAgentMdPath(payload.teamId, localAgent.agentId),
      localAgent.files.agentMd ?? "",
      "utf-8",
    );
    await fs.writeFile(
      getTeamLocalAgentConfigPath(payload.teamId, localAgent.agentId),
      localAgent.files.agentConfigJson ?? "{}\n",
      "utf-8",
    );
  }
}
