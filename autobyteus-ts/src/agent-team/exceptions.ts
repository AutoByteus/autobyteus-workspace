export class TeamNodeNotFoundException extends Error {
  nodeName: string;
  teamId: string;

  constructor(nodeName: string, teamId: string) {
    super(`Node '${nodeName}' not found in agent team '${teamId}'.`);
    this.nodeName = nodeName;
    this.teamId = teamId;
  }
}
