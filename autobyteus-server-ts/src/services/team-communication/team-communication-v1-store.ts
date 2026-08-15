import fs from "node:fs/promises";
import path from "node:path";
import {
  getTeamRunFileCommitWriter,
  type TeamRunFileCommitWriter,
  type TeamRunFileWriteResult,
} from "../../run-history/store/team-run-file-commit-writer.js";
import { validateTeamCommunicationMessagesV1Payload } from "./team-communication-v1-schema.js";
import type { TeamCommunicationMessagesFileV1 } from "./team-communication-v1-types.js";

export const TEAM_COMMUNICATION_MESSAGES_V1_FILE_NAME = "team_communication_messages.json";

export const getTeamCommunicationMessagesV1Path = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), TEAM_COMMUNICATION_MESSAGES_V1_FILE_NAME);

const isMissingFile = (error: unknown): boolean =>
  !!error && typeof error === "object" && "code" in error &&
  (error as { code?: unknown }).code === "ENOENT";

export class TeamCommunicationV1Store {
  constructor(
    private readonly writer: TeamRunFileCommitWriter = getTeamRunFileCommitWriter(),
  ) {}

  async read(
    teamMemoryDir: string,
    rootTeamRunId: string,
  ): Promise<TeamCommunicationMessagesFileV1 | null> {
    try {
      const payload = JSON.parse(
        await fs.readFile(getTeamCommunicationMessagesV1Path(teamMemoryDir), "utf-8"),
      ) as unknown;
      return validateTeamCommunicationMessagesV1Payload(payload, rootTeamRunId);
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async write(
    teamMemoryDir: string,
    messages: TeamCommunicationMessagesFileV1,
  ): Promise<TeamRunFileWriteResult> {
    const normalized = validateTeamCommunicationMessagesV1Payload(
      messages,
      messages.rootTeamRunId,
    );
    return this.writer.write({
      file: "communication_messages",
      filePath: getTeamCommunicationMessagesV1Path(teamMemoryDir),
      payload: normalized,
    });
  }
}
