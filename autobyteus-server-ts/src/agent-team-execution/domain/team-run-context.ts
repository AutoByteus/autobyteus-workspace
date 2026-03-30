import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AutoByteusTeamRunContext } from "../backends/autobyteus/autobyteus-team-run-context.js";
import type { ClaudeTeamRunContext } from "../backends/claude/claude-team-run-context.js";
import type { CodexTeamRunContext } from "../backends/codex/codex-team-run-context.js";
import type { TeamRunConfig } from "./team-run-config.js";

export interface TeamMemberRuntimeContext {
  readonly memberName: string;
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  getPlatformAgentRunId(): string | null;
}

type TeamMemberContextCarrier = {
  memberContexts: TeamMemberRuntimeContext[];
};

const hasMemberContexts = (value: unknown): value is TeamMemberContextCarrier =>
  value !== null &&
  value !== undefined &&
  typeof value === "object" &&
  "memberContexts" in value &&
  Array.isArray((value as { memberContexts?: unknown }).memberContexts);

export type RuntimeTeamRunContext =
  | AutoByteusTeamRunContext
  | ClaudeTeamRunContext
  | CodexTeamRunContext
  | null;

export type TeamRunContextInput<TRuntimeContext> = {
  runId: string;
  runtimeKind: RuntimeKind;
  coordinatorMemberName?: string | null;
  config: TeamRunConfig | null;
  runtimeContext: TRuntimeContext;
};

export class TeamRunContext<TRuntimeContext = RuntimeTeamRunContext> {
  readonly runId: string;
  readonly runtimeKind: RuntimeKind;
  readonly coordinatorMemberName: string | null;
  readonly config: TeamRunConfig | null;
  readonly runtimeContext: TRuntimeContext;

  constructor(input: TeamRunContextInput<TRuntimeContext>) {
    this.runId = input.runId;
    this.runtimeKind = input.runtimeKind;
    this.coordinatorMemberName = input.coordinatorMemberName ?? null;
    this.config = input.config;
    this.runtimeContext = input.runtimeContext;
  }
}

export const getRuntimeMemberContexts = (
  runtimeContext: RuntimeTeamRunContext | null | undefined,
): TeamMemberRuntimeContext[] =>
  hasMemberContexts(runtimeContext) ? [...runtimeContext.memberContexts] : [];

export const resolveRuntimeMemberContext = (
  teamContext: TeamRunContext<unknown> | null | undefined,
  memberRunId: string,
): TeamMemberRuntimeContext | null => {
  if (!teamContext) {
    return null;
  }
  return (
    getRuntimeMemberContexts(teamContext.runtimeContext as RuntimeTeamRunContext).find(
      (memberContext) => memberContext.memberRunId === memberRunId,
    ) ?? null
  );
};
