import { MemberCollaborationContext } from "./member-collaboration-context.js";
import {
  cloneTeamMemberExecutionIdentity,
  type TeamMemberExecutionIdentity,
} from "./team-member-execution-identity.js";

/** Team-only binding injected into persistent, restored, and task AgentRuns. */
export class MemberTeamContext {
  readonly identity: TeamMemberExecutionIdentity;
  readonly authoredTeamInstruction: string | null;
  readonly collaboration: MemberCollaborationContext;

  constructor(input: {
    identity: TeamMemberExecutionIdentity;
    authoredTeamInstruction?: string | null;
    collaboration: MemberCollaborationContext;
  }) {
    this.identity = cloneTeamMemberExecutionIdentity(input.identity);
    this.authoredTeamInstruction = input.authoredTeamInstruction ?? null;
    this.collaboration = new MemberCollaborationContext(input.collaboration);
    Object.freeze(this);
  }
}
