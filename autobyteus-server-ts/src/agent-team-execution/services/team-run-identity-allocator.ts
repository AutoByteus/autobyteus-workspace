import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";

/** Allocates identities only for definition-configured TeamRuns. */
export class TeamRunIdentityAllocator {
  allocateForTeamDefinitionName(teamDefinitionName: string): string {
    return generateTeamRunIdForDefinitionName(teamDefinitionName);
  }
}
