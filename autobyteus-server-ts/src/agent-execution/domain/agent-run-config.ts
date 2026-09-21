import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";

export class AgentRunConfig {
  readonly agentDefinitionId: string;
  readonly llmModelIdentifier: string;
  readonly autoExecuteTools: boolean;
  readonly workspaceId: string | null;
  readonly memoryDir: string | null;
  readonly llmConfig: Record<string, unknown> | null;
  readonly skillAccessMode: SkillAccessMode;
  readonly runtimeKind: RuntimeKind;
  readonly memberExecutionContext: MemberExecutionContext | null;
  readonly applicationExecutionContext: ApplicationExecutionContext | null;

  constructor(input: {
    agentDefinitionId: string;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
    workspaceId?: string | null;
    memoryDir?: string | null;
    llmConfig?: Record<string, unknown> | null;
    skillAccessMode: SkillAccessMode;
    runtimeKind: RuntimeKind;
    memberExecutionContext?: MemberExecutionContext | null;
    applicationExecutionContext?: ApplicationExecutionContext | null;
  }) {
    this.agentDefinitionId = input.agentDefinitionId;
    this.llmModelIdentifier = input.llmModelIdentifier;
    this.autoExecuteTools = input.autoExecuteTools;
    this.workspaceId = input.workspaceId ?? null;
    this.memoryDir = input.memoryDir ?? null;
    this.llmConfig = input.llmConfig ?? null;
    this.skillAccessMode = input.skillAccessMode;
    this.runtimeKind = input.runtimeKind;
    this.memberExecutionContext = input.memberExecutionContext ?? null;
    this.applicationExecutionContext = input.applicationExecutionContext ?? null;
  }
}
