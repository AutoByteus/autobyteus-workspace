import type { RunVersion } from "../envelope/envelope-builder.js";
import {
  cloneRunScopedMemberBinding,
  toRunScopedMemberBinding,
  type RunScopedMemberBinding,
  type RunScopedMemberBindingInput,
} from "./run-scoped-member-binding.js";

export type RunScopedTeamBinding = {
  teamRunId: string;
  teamId: string;
  runVersion: RunVersion;
  teamDefinitionId: string;
  runtimeTeamId: string;
  memberBindings: RunScopedMemberBinding[];
  boundAtIso: string;
};

type BindRunInput = {
  teamRunId: string;
  teamId: string;
  runVersion: RunVersion;
  teamDefinitionId: string;
  runtimeTeamId: string;
  memberBindings: RunScopedMemberBindingInput[];
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const cloneBinding = (binding: RunScopedTeamBinding): RunScopedTeamBinding => ({
  teamRunId: binding.teamRunId,
  teamId: binding.teamId,
  runVersion: binding.runVersion,
  teamDefinitionId: binding.teamDefinitionId,
  runtimeTeamId: binding.runtimeTeamId,
  memberBindings: binding.memberBindings.map((item) => cloneRunScopedMemberBinding(item)),
  boundAtIso: binding.boundAtIso,
});

export class TeamRunNotBoundError extends Error {
  readonly teamRunId: string;

  constructor(teamRunId: string) {
    super(`No run-scoped team binding exists for teamRunId '${teamRunId}'.`);
    this.name = "TeamRunNotBoundError";
    this.teamRunId = teamRunId;
  }
}

export class RunScopedTeamBindingRegistry {
  private readonly bindingByTeamRunId = new Map<string, RunScopedTeamBinding>();

  bindRun(input: BindRunInput): RunScopedTeamBinding {
    const teamRunId = normalizeRequiredString(input.teamRunId, "teamRunId");
    const teamId = normalizeRequiredString(input.teamId, "teamId");
    const teamDefinitionId = normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId");
    const runtimeTeamId = normalizeRequiredString(input.runtimeTeamId, "runtimeTeamId");

    const binding: RunScopedTeamBinding = {
      teamRunId,
      teamId,
      runVersion: input.runVersion,
      teamDefinitionId,
      runtimeTeamId,
      memberBindings: input.memberBindings.map((item) => toRunScopedMemberBinding(item)),
      boundAtIso: new Date().toISOString(),
    };

    this.bindingByTeamRunId.set(teamRunId, binding);
    return cloneBinding(binding);
  }

  resolveRun(teamRunId: string): RunScopedTeamBinding {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const binding = this.bindingByTeamRunId.get(normalizedTeamRunId);
    if (!binding) {
      throw new TeamRunNotBoundError(normalizedTeamRunId);
    }
    return cloneBinding(binding);
  }

  tryResolveRun(teamRunId: string): RunScopedTeamBinding | null {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const binding = this.bindingByTeamRunId.get(normalizedTeamRunId);
    if (!binding) {
      return null;
    }
    return cloneBinding(binding);
  }

  unbindRun(teamRunId: string): boolean {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    return this.bindingByTeamRunId.delete(normalizedTeamRunId);
  }

  clear(): void {
    this.bindingByTeamRunId.clear();
  }

  listBindings(): RunScopedTeamBinding[] {
    return Array.from(this.bindingByTeamRunId.values()).map((binding) => cloneBinding(binding));
  }

  listBindingsByTeamId(teamId: string): RunScopedTeamBinding[] {
    const normalizedTeamId = normalizeRequiredString(teamId, "teamId");
    return this.listBindings().filter((binding) => binding.teamId === normalizedTeamId);
  }
}
