import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { TeamBackendKind } from "./team-backend-kind.js";

export type TeamMemberRunConfig = {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  memoryDir?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  memberRunId?: string | null;
  runtimeKind: RuntimeKind;
  applicationExecutionContext?: ApplicationExecutionContext | null;
};

export class TeamRunConfig {
  readonly teamDefinitionId: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly memberConfigs: TeamMemberRunConfig[];

  constructor(input: {
    teamDefinitionId: string;
    teamBackendKind: TeamBackendKind;
    memberConfigs: TeamMemberRunConfig[];
  }) {
    this.teamDefinitionId = input.teamDefinitionId;
    this.teamBackendKind = input.teamBackendKind;
    this.memberConfigs = input.memberConfigs.map((config) => ({ ...config }));
  }
}
