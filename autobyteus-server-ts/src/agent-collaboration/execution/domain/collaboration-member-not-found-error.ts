/**
 * An agent run that is not a member of the collaboration root a read names (a team run, an org
 * run or a hub). The member-view services throw it; transports map it to "not found".
 */
export class CollaborationMemberNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollaborationMemberNotFoundError";
  }
}
