import fs from "node:fs/promises";
import path from "node:path";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import {
  AGENT_ORG_COMMUNICATION_MESSAGES_V1_FILE_NAME,
  type AgentOrgCommunicationMessagesFileV1,
} from "./agent-org-communication-messages-v1.js";
import { validateAgentOrgCommunicationMessagesV1 } from "./agent-org-communication-messages-v1-schema.js";

export const getAgentOrgCommunicationMessagesV1Path = (orgDir: string): string =>
  path.join(path.resolve(orgDir), AGENT_ORG_COMMUNICATION_MESSAGES_V1_FILE_NAME);
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

export class AgentOrgCommunicationMessagesV1Store {
  constructor(private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}
  async read(orgDir: string, orgRunId: string): Promise<AgentOrgCommunicationMessagesFileV1 | null> {
    try {
      return validateAgentOrgCommunicationMessagesV1(
        JSON.parse(await fs.readFile(getAgentOrgCommunicationMessagesV1Path(orgDir), "utf8")),
        orgRunId,
      );
    } catch (error) { if (missing(error)) return null; throw error; }
  }
  write(orgDir: string, messages: AgentOrgCommunicationMessagesFileV1): Promise<RunPackageFileWriteResult<"org_communication_messages">> {
    const normalized = validateAgentOrgCommunicationMessagesV1(messages, messages.orgRunId);
    return this.writer.write({
      file: "org_communication_messages",
      filePath: getAgentOrgCommunicationMessagesV1Path(orgDir),
      payload: normalized,
    });
  }
}
