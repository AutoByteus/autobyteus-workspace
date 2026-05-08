import fs from "node:fs/promises";
import path from "node:path";
import {
  EMPTY_TEAM_COMMUNICATION_PROJECTION,
  type TeamCommunicationProjection,
} from "./team-communication-types.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const getTeamCommunicationProjectionPath = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), "team_communication_messages.json");

const emptyProjection = (): TeamCommunicationProjection => ({
  ...EMPTY_TEAM_COMMUNICATION_PROJECTION,
  messages: [],
});

const isMissingFileError = (error: unknown): boolean =>
  typeof error === "object"
  && error !== null
  && "code" in error
  && (error as { code?: unknown }).code === "ENOENT";

export class TeamCommunicationProjectionStore {
  async readProjection(teamMemoryDir: string): Promise<TeamCommunicationProjection> {
    const projectionPath = getTeamCommunicationProjectionPath(teamMemoryDir);
    try {
      const parsed = JSON.parse(await fs.readFile(projectionPath, "utf-8")) as TeamCommunicationProjection;
      return {
        version: 1,
        messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
      };
    } catch (error) {
      if (!isMissingFileError(error)) {
        logger.warn(
          `TeamCommunicationProjectionStore: failed reading projection '${projectionPath}': ${String(error)}`,
        );
      }
      return emptyProjection();
    }
  }

  async writeProjection(
    teamMemoryDir: string,
    projection: TeamCommunicationProjection,
  ): Promise<void> {
    const projectionPath = getTeamCommunicationProjectionPath(teamMemoryDir);
    const projectionDir = path.dirname(projectionPath);
    const tempProjectionPath = path.join(
      projectionDir,
      `.team_communication_messages.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
    );
    await fs.mkdir(projectionDir, { recursive: true });
    try {
      await fs.writeFile(
        tempProjectionPath,
        JSON.stringify({ version: 1, messages: projection.messages }, null, 2),
        "utf-8",
      );
      await fs.rename(tempProjectionPath, projectionPath);
    } catch (error) {
      await fs.rm(tempProjectionPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

let cachedStore: TeamCommunicationProjectionStore | null = null;

export const getTeamCommunicationProjectionStore = (): TeamCommunicationProjectionStore => {
  if (!cachedStore) {
    cachedStore = new TeamCommunicationProjectionStore();
  }
  return cachedStore;
};
