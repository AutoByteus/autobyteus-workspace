import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { RunProjectContext } from "./run-project-context.js";

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
  /** The Project the run (or its root Team run) was started under, told to the run in its instructions (REQ-006). */
  readonly project: RunProjectContext | null;

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
    project?: RunProjectContext | null;
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
    this.project = input.project ?? null;
  }

  /** The same run configuration with another memory directory. */
  withMemoryDir(memoryDir: string): AgentRunConfig {
    return new AgentRunConfig({ ...this, memoryDir });
  }
}
