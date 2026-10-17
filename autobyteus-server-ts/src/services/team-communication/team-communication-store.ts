import fs from "node:fs/promises";
import path from "node:path";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import { validateTeamCommunicationMessagesPayload } from "./team-communication-messages-schema.js";
import type { TeamCommunicationMessagesFile } from "./team-communication-messages-file.js";

export const TEAM_COMMUNICATION_MESSAGES_FILE_NAME = "team_communication_messages.json";

export const getTeamCommunicationMessagesPath = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), TEAM_COMMUNICATION_MESSAGES_FILE_NAME);

const isMissingFile = (error: unknown): boolean =>
  !!error && typeof error === "object" && "code" in error &&
  (error as { code?: unknown }).code === "ENOENT";

export class TeamCommunicationStore {
  constructor(
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {}

  async read(
    teamMemoryDir: string,
    rootTeamRunId: string,
  ): Promise<TeamCommunicationMessagesFile | null> {
    try {
      const payload = JSON.parse(
        await fs.readFile(getTeamCommunicationMessagesPath(teamMemoryDir), "utf-8"),
      ) as unknown;
      return validateTeamCommunicationMessagesPayload(payload, rootTeamRunId);
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async write(
    teamMemoryDir: string,
    messages: TeamCommunicationMessagesFile,
  ): Promise<RunPackageFileWriteResult<"communication_messages">> {
    const normalized = validateTeamCommunicationMessagesPayload(
      messages,
      messages.rootTeamRunId,
    );
    return this.writer.write({
      file: "communication_messages",
      filePath: getTeamCommunicationMessagesPath(teamMemoryDir),
      payload: normalized,
    });
  }
}
