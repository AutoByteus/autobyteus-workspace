// Frozen copies of the `read` methods of today's `TeamRunExecutionTreeStore`,
// `AgentOrgRunExecutionTreeStore`, `StandaloneRootPackageStore#readTree`, `TeamCommunicationStore` and
// `AgentOrgCommunicationMessagesStore`
// (as of origin/personal@66429d6f31): one whole-file read, validated by the released tree parser of
// this folder or by the message-file schema (unchanged by task-agent-own-run); a missing file is
// `null`. Owned by released app-data migrations; current runtime must not import it.
//
// Same-ID repair R-A (append-only message logs): a migration that runs after
// `20261018_append_only_message_logs_v1` on a pending install may find a run's log already converted.
// The message readers return the JSON file's messages when it exists, else the append-only log's
// (frozen reader), in the same envelope; `null` when neither exists.

import fs from "node:fs/promises";
import path from "node:path";
import { getAgentOrgRunExecutionTreePath } from "../../server/run-history/store/agent-org-run-execution-tree-path.js";
import { getTeamRunExecutionTreePath } from "../../server/run-history/store/team-run-execution-tree-path.js";
import {
  getAgentOrgCommunicationMessagesPath,
  getStandaloneRootMessagesPath,
  getTeamCommunicationMessagesPath,
  validateAgentOrgCommunicationMessages,
  validateStandaloneRootMessages,
  validateTeamCommunicationMessagesPayload,
  type AgentOrgCommunicationMessagesFile,
  type CollaborationCommunicationMessage,
  type StandaloneRootMessagesFile,
  type TeamCommunicationMessagesFile,
} from "../released-message-logs-before-append-only.js";
import {
  readReleasedAppendOnlyMessageLog,
  type ReleasedAppendOnlyMessageLogBaseName,
} from "../released-message-log-files-from-append-only.js";
import type { AgentOrgRunExecutionTreeFile } from "./agent-org-run-execution-tree.js";
import { validateAgentOrgRunExecutionTreePayload } from "./agent-org-run-execution-tree-schema.js";
import { getStandaloneRootTreePath } from "../../server/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import type { StandaloneRootTreeFile } from "./standalone-root-tree.js";
import { validateStandaloneRootTreePayload } from "./standalone-root-tree-schema.js";
import type { TeamRunExecutionTreeFile } from "./team-run-execution-tree.js";
import { validateTeamRunExecutionTreePayload } from "./team-run-execution-tree-schema.js";

const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const readValidated = async <T>(filePath: string, validate: (value: unknown) => T): Promise<T | null> => {
  try {
    return validate(JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown);
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
};

/** The JSON log when it exists, else the append-only log of the same folder (R-A). */
const readMessageLog = async <T>(
  jsonPath: string,
  validate: (value: unknown) => T,
  baseName: ReleasedAppendOnlyMessageLogBaseName,
  envelope: (messages: readonly CollaborationCommunicationMessage[]) => T,
): Promise<T | null> => {
  let text: string;
  try { text = await fs.readFile(jsonPath, "utf-8"); }
  catch (error) {
    if (!missing(error)) throw error;
    const messages = await readReleasedAppendOnlyMessageLog(path.dirname(jsonPath), baseName);
    return messages ? envelope(messages) : null;
  }
  return validate(JSON.parse(text) as unknown);
};

export class ReleasedTeamRunExecutionTreeReader {
  read(teamMemoryDir: string, rootTeamRunId: string): Promise<TeamRunExecutionTreeFile | null> {
    return readValidated(getTeamRunExecutionTreePath(teamMemoryDir),
      (value) => validateTeamRunExecutionTreePayload(value, rootTeamRunId));
  }
}

export class ReleasedAgentOrgRunExecutionTreeReader {
  read(orgMemoryDir: string, orgRunId: string): Promise<AgentOrgRunExecutionTreeFile | null> {
    return readValidated(getAgentOrgRunExecutionTreePath(orgMemoryDir),
      (value) => validateAgentOrgRunExecutionTreePayload(value, orgRunId));
  }
}

export class ReleasedStandaloneRootTreeReader {
  readTree(collaborationDir: string, hostRunId: string): Promise<StandaloneRootTreeFile | null> {
    return readValidated(getStandaloneRootTreePath(collaborationDir),
      (value) => validateStandaloneRootTreePayload(value, hostRunId));
  }
}

export class ReleasedTeamCommunicationMessagesReader {
  read(teamMemoryDir: string, rootTeamRunId: string): Promise<TeamCommunicationMessagesFile | null> {
    return readMessageLog(getTeamCommunicationMessagesPath(teamMemoryDir),
      (value) => validateTeamCommunicationMessagesPayload(value, rootTeamRunId), "team_communication_messages",
      (messages) => Object.freeze({ schemaVersion: 1, rootTeamRunId, messages }));
  }
}

export class ReleasedAgentOrgCommunicationMessagesReader {
  read(orgDir: string, orgRunId: string): Promise<AgentOrgCommunicationMessagesFile | null> {
    return readMessageLog(getAgentOrgCommunicationMessagesPath(orgDir),
      (value) => validateAgentOrgCommunicationMessages(value, orgRunId), "agent_org_communication_messages",
      (messages) => Object.freeze({ schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages }));
  }
}

/** A standalone agent run's own log in `agents/<id>/collaboration/` (R-D: one reader per family). */
export class ReleasedStandaloneRootMessagesReader {
  read(collaborationDir: string, hostRunId: string): Promise<StandaloneRootMessagesFile | null> {
    return readMessageLog(getStandaloneRootMessagesPath(collaborationDir),
      (value) => validateStandaloneRootMessages(value, hostRunId), "communication_messages",
      (messages) => Object.freeze({ schemaVersion: 1, subjectKind: "agent", hostRunId, messages }));
  }
}
