// Frozen copies of the `read` methods of today's `TeamRunExecutionTreeStore`,
// `AgentOrgRunExecutionTreeStore`, `StandaloneRootPackageStore#readTree`, `TeamCommunicationStore` and
// `AgentOrgCommunicationMessagesStore`
// (as of origin/personal@66429d6f31): one whole-file read, validated by the released tree parser of
// this folder or by the message-file schema (unchanged by task-agent-own-run); a missing file is
// `null`. Owned by released app-data migrations; current runtime must not import it.

import fs from "node:fs/promises";
import { getAgentOrgCommunicationMessagesPath } from "../../../../agent-org-execution/persistence/agent-org-communication-messages-store.js";
import type { AgentOrgCommunicationMessagesFile } from "../../../../agent-org-execution/persistence/agent-org-communication-messages.js";
import { validateAgentOrgCommunicationMessages } from "../../../../agent-org-execution/persistence/agent-org-communication-messages-schema.js";
import { getAgentOrgRunExecutionTreePath } from "../../../../run-history/store/agent-org-run-execution-tree-path.js";
import { getTeamRunExecutionTreePath } from "../../../../run-history/store/team-run-execution-tree-path.js";
import type { TeamCommunicationMessagesFile } from "../../../../services/team-communication/team-communication-messages-file.js";
import { validateTeamCommunicationMessagesPayload } from "../../../../services/team-communication/team-communication-messages-schema.js";
import { getTeamCommunicationMessagesPath } from "../../../../services/team-communication/team-communication-store.js";
import type { AgentOrgRunExecutionTreeFile } from "./agent-org-run-execution-tree.js";
import { validateAgentOrgRunExecutionTreePayload } from "./agent-org-run-execution-tree-schema.js";
import { getStandaloneRootTreePath } from "../../../../standalone-agent-run-root/persistence/standalone-root-tree-path.js";
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
    return readValidated(getTeamCommunicationMessagesPath(teamMemoryDir),
      (value) => validateTeamCommunicationMessagesPayload(value, rootTeamRunId));
  }
}

export class ReleasedAgentOrgCommunicationMessagesReader {
  read(orgDir: string, orgRunId: string): Promise<AgentOrgCommunicationMessagesFile | null> {
    return readValidated(getAgentOrgCommunicationMessagesPath(orgDir),
      (value) => validateAgentOrgCommunicationMessages(value, orgRunId));
  }
}
