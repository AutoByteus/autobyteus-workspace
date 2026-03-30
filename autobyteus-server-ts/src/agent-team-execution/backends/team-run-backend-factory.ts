import { TeamRunConfig } from "../domain/team-run-config.js";
import type { RuntimeTeamRunContext, TeamRunContext } from "../domain/team-run-context.js";
import type { TeamRunBackend } from "./team-run-backend.js";

export interface TeamRunBackendFactory {
  createBackend(config: TeamRunConfig): Promise<TeamRunBackend>;
  restoreBackend(context: TeamRunContext<RuntimeTeamRunContext>): Promise<TeamRunBackend>;
}
