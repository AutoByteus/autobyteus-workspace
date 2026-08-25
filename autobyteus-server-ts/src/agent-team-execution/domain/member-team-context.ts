import { MemberCollaborationContext } from "./member-collaboration-context.js";
import {
  cloneTeamMemberExecutionIdentity,
  type TeamMemberExecutionIdentity,
} from "./team-member-execution-identity.js";
import {
  requireMemberTaskRootResolver,
  type MemberTaskRootResolver,
} from "../task-delegation/member-task-root-resolver.js";

/** Team-only binding injected into persistent, restored, and task AgentRuns. */
export class MemberTeamContext {
  readonly identity: TeamMemberExecutionIdentity;
  readonly authoredTeamInstruction: string | null;
  readonly collaboration: MemberCollaborationContext;
  readonly taskRootResolver: MemberTaskRootResolver;

  constructor(input: {
    identity: TeamMemberExecutionIdentity;
    authoredTeamInstruction?: string | null;
    collaboration: MemberCollaborationContext;
    taskRootResolver: MemberTaskRootResolver;
  }) {
    this.identity = cloneTeamMemberExecutionIdentity(input.identity);
    this.authoredTeamInstruction = input.authoredTeamInstruction ?? null;
    this.collaboration = new MemberCollaborationContext(input.collaboration);
    this.taskRootResolver = requireMemberTaskRootResolver(input.taskRootResolver);
    Object.freeze(this);
  }
}
