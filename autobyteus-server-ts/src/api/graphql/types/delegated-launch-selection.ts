import { GraphQLJSON } from "graphql-scalars";
import { Arg, Field, InputType, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { getStudioDelegatedLaunchSelectionService } from "../studio-application-api-services.js";
import { RunModelConfigFieldErrorObject, RunModelOptionsObject } from "./run-model-config.js";
import type {
  DelegatedLaunchRootKind,
  StoppedRootConfiguredPatches,
} from "../../../run-history/services/delegated-launch-selection-service.js";
import type { DelegatedRunReference } from "../../../agent-collaboration/domain/delegated-launch-selection.js";

const ROOT_KINDS: readonly DelegatedLaunchRootKind[] = ["AGENT", "AGENT_TEAM", "AGENT_ORG"];

@InputType()
export class DelegatedExecutionTargetInput {
  @Field(() => String) rootKind!: string;
  @Field(() => String) rootRunId!: string;
  @Field(() => String, { nullable: true }) agentRunId?: string | null;
  @Field(() => String, { nullable: true }) teamRunId?: string | null;
}

@InputType()
export class DelegatedLaunchSelectionValueInput {
  @Field(() => String) llmModelIdentifier!: string;
  @Field(() => GraphQLJSON, { nullable: true }) llmConfig!: Record<string, unknown> | null;
}

@InputType()
export class DelegatedLaunchChangeInput {
  @Field(() => String, { nullable: true }) agentRunId?: string | null;
  @Field(() => String, { nullable: true }) teamRunId?: string | null;
  @Field(() => DelegatedLaunchSelectionValueInput) selection!: DelegatedLaunchSelectionValueInput;
}

/** A stopped root's own setting saved in the same Save (AR-004); for an Agent root, its host (scope '/'). */
@InputType()
export class DelegatedConfiguredPatchInput {
  @Field(() => String) scopeKind!: string;
  @Field(() => String) scopeAddress!: string;
  @Field(() => String) llmModelIdentifier!: string;
  @Field(() => GraphQLJSON, { nullable: true }) llmConfig!: Record<string, unknown> | null;
}

@InputType()
export class UpdateDelegatedLaunchSelectionsInput {
  @Field(() => String) rootKind!: string;
  @Field(() => String) rootRunId!: string;
  @Field(() => [DelegatedLaunchChangeInput]) changes!: DelegatedLaunchChangeInput[];
  @Field(() => [DelegatedConfiguredPatchInput], { nullable: true }) configuredPatches?: DelegatedConfiguredPatchInput[] | null;
}

@ObjectType()
export class StopDelegatedExecutionResult {
  @Field(() => Boolean) success!: boolean;
  @Field(() => String) outcome!: string;
  @Field(() => String) message!: string;
  @Field(() => Int) notStoppedUnattributed!: number;
}

@ObjectType()
export class UpdateDelegatedLaunchSelectionsResult {
  @Field(() => Boolean) success!: boolean;
  @Field(() => String) outcome!: string;
  @Field(() => String) message!: string;
  @Field(() => [RunModelConfigFieldErrorObject]) fieldErrors!: RunModelConfigFieldErrorObject[];
}

@ObjectType()
export class DelegatedLaunchModelOptionsObject extends RunModelOptionsObject {
  @Field(() => String) scope!: string;
  @Field(() => String, { nullable: true }) agentRunId!: string | null;
  @Field(() => String, { nullable: true }) teamRunId!: string | null;
}

const rootKindOf = (value: string): DelegatedLaunchRootKind => {
  if (!(ROOT_KINDS as readonly string[]).includes(value)) throw new Error(`rootKind must be one of ${ROOT_KINDS.join(", ")}.`);
  return value as DelegatedLaunchRootKind;
};

const referenceOf = (input: { agentRunId?: string | null; teamRunId?: string | null }): DelegatedRunReference => {
  const agentRunId = input.agentRunId?.trim() || null;
  const teamRunId = input.teamRunId?.trim() || null;
  if ((agentRunId === null) === (teamRunId === null)) throw new Error("Name exactly one of agentRunId or teamRunId.");
  return agentRunId ? { agentRunId } : { teamRunId: teamRunId! };
};

const configuredOf = (rootKind: DelegatedLaunchRootKind, patches: readonly DelegatedConfiguredPatchInput[] | null | undefined): StoppedRootConfiguredPatches | null => {
  if (!patches?.length) return null;
  if (patches.some((patch) => !Object.hasOwn(patch, "llmConfig"))) throw new Error("Every configured patch must contain llmConfig and it may be null.");
  if (rootKind === "AGENT") {
    if (patches.length !== 1 || patches[0]!.scopeAddress !== "/") throw new Error("An Agent run has one own setting, at scope '/'.");
    return { kind: "agent", selection: { llmModelIdentifier: patches[0]!.llmModelIdentifier, llmConfig: patches[0]!.llmConfig } };
  }
  return rootKind === "AGENT_TEAM"
    ? { kind: "team", patches: patches.map((patch) => ({ ...patch, scopeKind: patch.scopeKind as "CONFIGURED_TEAM" | "CONFIGURED_AGENT" })) }
    : { kind: "org", patches: patches.map((patch) => ({ ...patch, scopeKind: patch.scopeKind as "CONFIGURED_ORG" | "CONFIGURED_TEAM" | "CONFIGURED_AGENT" })) } as StoppedRootConfiguredPatches;
};

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * DS-001 / DS-002: the user Stop of a delegated copy and the user model choice of
 * stopped ones, for Agent, Team and AgentOrg runs; plus their model options.
 */
@Resolver()
export class DelegatedLaunchSelectionResolver {
  private readonly service = getStudioDelegatedLaunchSelectionService();

  @Mutation(() => StopDelegatedExecutionResult)
  async stopDelegatedExecution(
    @Arg("input", () => DelegatedExecutionTargetInput) input: DelegatedExecutionTargetInput,
  ): Promise<StopDelegatedExecutionResult> {
    try {
      return { ...await this.service.stop({ rootKind: rootKindOf(input.rootKind), rootRunId: input.rootRunId, target: referenceOf(input) }) };
    } catch (error) {
      return { success: false, outcome: "NOT_FOUND", message: message(error), notStoppedUnattributed: 0 };
    }
  }

  @Mutation(() => UpdateDelegatedLaunchSelectionsResult)
  async updateDelegatedLaunchSelections(
    @Arg("input", () => UpdateDelegatedLaunchSelectionsInput) input: UpdateDelegatedLaunchSelectionsInput,
  ): Promise<UpdateDelegatedLaunchSelectionsResult> {
    try {
      const rootKind = rootKindOf(input.rootKind);
      if (input.changes.some((change) => !Object.hasOwn(change.selection, "llmConfig"))) {
        throw new Error("Every selection must contain llmConfig and it may be null.");
      }
      const result = await this.service.update({
        rootKind,
        rootRunId: input.rootRunId,
        changes: input.changes.map((change) => ({ ...referenceOf(change), selection: change.selection })),
        configured: configuredOf(rootKind, input.configuredPatches),
      });
      return { ...result, fieldErrors: [...result.fieldErrors] };
    } catch (error) {
      return { success: false, outcome: "VALIDATION_FAILED", message: message(error), fieldErrors: [] };
    }
  }

  @Query(() => [DelegatedLaunchModelOptionsObject])
  async delegatedLaunchModelOptions(
    @Arg("rootKind", () => String) rootKind: string,
    @Arg("rootRunId", () => String) rootRunId: string,
  ): Promise<DelegatedLaunchModelOptionsObject[]> {
    return [...await this.service.modelOptions(rootKindOf(rootKind), rootRunId)] as DelegatedLaunchModelOptionsObject[];
  }
}
