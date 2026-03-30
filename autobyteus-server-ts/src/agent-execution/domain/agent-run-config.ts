import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { RuntimeTeamRunContext, TeamRunContext } from "../../agent-team-execution/domain/team-run-context.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export class AgentRunConfig {
  readonly agentDefinitionId: string;
  readonly llmModelIdentifier: string;
  readonly autoExecuteTools: boolean;
  readonly workspaceId: string | null;
  readonly memoryDir: string | null;
  readonly llmConfig: Record<string, unknown> | null;
  readonly skillAccessMode: SkillAccessMode;
  readonly runtimeKind: RuntimeKind;
  readonly teamContext: TeamRunContext<RuntimeTeamRunContext> | null;

  constructor(input: {
    agentDefinitionId: string;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
    workspaceId?: string | null;
    memoryDir?: string | null;
    llmConfig?: Record<string, unknown> | null;
    skillAccessMode: SkillAccessMode;
    runtimeKind: RuntimeKind;
    teamContext?: TeamRunContext<RuntimeTeamRunContext> | null;
  }) {
    this.agentDefinitionId = input.agentDefinitionId;
    this.llmModelIdentifier = input.llmModelIdentifier;
    this.autoExecuteTools = input.autoExecuteTools;
    this.workspaceId = input.workspaceId ?? null;
    this.memoryDir = input.memoryDir ?? null;
    this.llmConfig = input.llmConfig ?? null;
    this.skillAccessMode = input.skillAccessMode;
    this.runtimeKind = input.runtimeKind;
    this.teamContext = input.teamContext ?? null;
  }
}
