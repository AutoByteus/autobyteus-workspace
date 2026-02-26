import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { TeamCommandIngressError } from "../ingress/team-command-ingress-service.js";
import type { TeamRunLocator, TeamRunLocatorRecord } from "../ingress/team-run-locator.js";
import { serializeTeamDefinitionSnapshot } from "./bootstrap-payload-normalization.js";
import type { RunScopedMemberBindingInput } from "../runtime-binding/run-scoped-member-binding.js";

const resolveLocatorRecord = (input: {
  teamRunId: string;
  teamRunLocator: TeamRunLocator | null;
  errorCode: "TEAM_RUN_NOT_BOUND" | "TEAM_BOOTSTRAP_CONFIG_UNAVAILABLE";
  missingLocatorMessage: string;
  missingRecordMessage: string;
}): TeamRunLocatorRecord => {
  if (!input.teamRunLocator) {
    throw new TeamCommandIngressError(input.errorCode, input.missingLocatorMessage);
  }
  const locatorRecord = input.teamRunLocator.resolveByTeamRunId(input.teamRunId);
  if (!locatorRecord) {
    throw new TeamCommandIngressError(input.errorCode, input.missingRecordMessage);
  }
  return locatorRecord;
};

export const resolveHostRuntimeTeamByRunId = (input: {
  teamRunId: string;
  teamRunLocator: TeamRunLocator | null;
  resolveTeamById: (teamId: string) => unknown;
}): unknown => {
  const locatorRecord = resolveLocatorRecord({
    teamRunId: input.teamRunId,
    teamRunLocator: input.teamRunLocator,
    errorCode: "TEAM_RUN_NOT_BOUND",
    missingLocatorMessage: `Run '${input.teamRunId}' is not bound on this host.`,
    missingRecordMessage: `Run '${input.teamRunId}' is not bound on this host.`,
  });
  return input.resolveTeamById(locatorRecord.teamId);
};

export const resolveHostTeamIdByRunId = (input: {
  teamRunId: string;
  teamRunLocator: TeamRunLocator | null;
}): string => {
  const locatorRecord = resolveLocatorRecord({
    teamRunId: input.teamRunId,
    teamRunLocator: input.teamRunLocator,
    errorCode: "TEAM_BOOTSTRAP_CONFIG_UNAVAILABLE",
    missingLocatorMessage: `No run locator is available for bootstrap run '${input.teamRunId}'.`,
    missingRecordMessage: `No active run locator record exists for bootstrap run '${input.teamRunId}'.`,
  });
  return locatorRecord.teamId;
};

export const resolveBootstrapBindingSnapshot = (input: {
  teamRunId: string;
  teamDefinitionId: string;
  teamRunLocator: TeamRunLocator | null;
  teamRunManager: {
    getTeamMemberConfigs: (teamId: string) => RunScopedMemberBindingInput[];
  };
}): RunScopedMemberBindingInput[] => {
  const locatorRecord = resolveLocatorRecord({
    teamRunId: input.teamRunId,
    teamRunLocator: input.teamRunLocator,
    errorCode: "TEAM_BOOTSTRAP_CONFIG_UNAVAILABLE",
    missingLocatorMessage: `No run locator is available for bootstrap run '${input.teamRunId}'.`,
    missingRecordMessage: `No active run locator record exists for bootstrap run '${input.teamRunId}'.`,
  });
  const memberBindings = input.teamRunManager.getTeamMemberConfigs(locatorRecord.teamId);
  if (memberBindings.length === 0) {
    throw new TeamCommandIngressError(
      "TEAM_BOOTSTRAP_CONFIG_UNAVAILABLE",
      `No member config snapshot is available for team '${locatorRecord.teamId}' (definition '${input.teamDefinitionId}').`,
    );
  }
  return memberBindings;
};

export const resolveBootstrapTeamDefinitionSnapshot = async (input: {
  teamDefinitionId: string;
  teamDefinitionService: AgentTeamDefinitionService;
}): Promise<Record<string, unknown>> => {
  const definition = await input.teamDefinitionService.getDefinitionById(input.teamDefinitionId);
  if (!definition) {
    throw new TeamCommandIngressError(
      "TEAM_BOOTSTRAP_DEFINITION_UNAVAILABLE",
      `No team definition snapshot is available for '${input.teamDefinitionId}'.`,
    );
  }
  return serializeTeamDefinitionSnapshot(definition);
};
