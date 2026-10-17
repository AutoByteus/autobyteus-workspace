import fs from "node:fs/promises";
import path from "node:path";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import {
  AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME,
  type AgentOrgCommunicationMessagesFile,
} from "./agent-org-communication-messages.js";
import { validateAgentOrgCommunicationMessages } from "./agent-org-communication-messages-schema.js";

export const getAgentOrgCommunicationMessagesPath = (orgDir: string): string =>
  path.join(path.resolve(orgDir), AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME);
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

export class AgentOrgCommunicationMessagesStore {
  constructor(private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}
  async read(orgDir: string, orgRunId: string): Promise<AgentOrgCommunicationMessagesFile | null> {
    try {
      return validateAgentOrgCommunicationMessages(
        JSON.parse(await fs.readFile(getAgentOrgCommunicationMessagesPath(orgDir), "utf8")),
        orgRunId,
      );
    } catch (error) { if (missing(error)) return null; throw error; }
  }
  write(orgDir: string, messages: AgentOrgCommunicationMessagesFile): Promise<RunPackageFileWriteResult<"org_communication_messages">> {
    const normalized = validateAgentOrgCommunicationMessages(messages, messages.orgRunId);
    return this.writer.write({
      file: "org_communication_messages",
      filePath: getAgentOrgCommunicationMessagesPath(orgDir),
      payload: normalized,
    });
  }
}
