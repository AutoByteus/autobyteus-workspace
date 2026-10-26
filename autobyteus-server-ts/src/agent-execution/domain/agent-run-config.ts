import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { AgentRunToolConfinement } from "../../run-history/store/agent-run-metadata-types.js";

export class AgentRunConfig {
  readonly agentDefinitionId: string;
  readonly llmModelIdentifier: string;
  readonly autoExecuteTools: boolean;
  readonly workspaceId: string | null;
  readonly memoryDir: string | null;
  readonly llmConfig: Record<string, unknown> | null;
  readonly runtimeKind: RuntimeKind;
  readonly memberExecutionContext: MemberExecutionContext | null;
  readonly applicationExecutionContext: ApplicationExecutionContext | null;
  /** autobyteus-32: confine the run's file and shell tools to its workspace (Codex and Claude honour it). */
  readonly toolConfinement: AgentRunToolConfinement | null;

  constructor(input: {
    agentDefinitionId: string;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
    workspaceId?: string | null;
    memoryDir?: string | null;
    llmConfig?: Record<string, unknown> | null;
    runtimeKind: RuntimeKind;
    memberExecutionContext?: MemberExecutionContext | null;
    applicationExecutionContext?: ApplicationExecutionContext | null;
    toolConfinement?: AgentRunToolConfinement | null;
  }) {
    this.agentDefinitionId = input.agentDefinitionId;
    this.llmModelIdentifier = input.llmModelIdentifier;
    this.autoExecuteTools = input.autoExecuteTools;
    this.workspaceId = input.workspaceId ?? null;
    this.memoryDir = input.memoryDir ?? null;
    this.llmConfig = input.llmConfig ?? null;
    this.runtimeKind = input.runtimeKind;
    this.memberExecutionContext = input.memberExecutionContext ?? null;
    this.applicationExecutionContext = input.applicationExecutionContext ?? null;
    this.toolConfinement = input.toolConfinement ?? null;
  }
}
