import { Arg, Field, InputType, Int, Mutation, ObjectType, Resolver } from "type-graphql";
import { getStudioPeerChildStop } from "../studio-application-api-services.js";
import type { DelegatorRootKind } from "../../../agent-collaboration/execution/remote/peer-child-stop.js";
import type { DelegatedRunReference } from "../../../agent-collaboration/domain/peer-child-stop.js";

const ROOT_KINDS: readonly DelegatorRootKind[] = ["AGENT", "AGENT_TEAM", "AGENT_ORG"];

@InputType()
export class DelegatedExecutionTargetInput {
  @Field(() => String) rootKind!: string;
  @Field(() => String) rootRunId!: string;
  @Field(() => String, { nullable: true }) agentRunId?: string | null;
  @Field(() => String, { nullable: true }) teamRunId?: string | null;
}

@ObjectType()
export class StopDelegatedExecutionResult {
  @Field(() => Boolean) success!: boolean;
  @Field(() => String) outcome!: string;
  @Field(() => String) message!: string;
  @Field(() => Int) notStoppedUnattributed!: number;
}

const rootKindOf = (value: string): DelegatorRootKind => {
  if (!(ROOT_KINDS as readonly string[]).includes(value)) throw new Error(`rootKind must be one of ${ROOT_KINDS.join(", ")}.`);
  return value as DelegatorRootKind;
};

const referenceOf = (input: { agentRunId?: string | null; teamRunId?: string | null }): DelegatedRunReference => {
  const agentRunId = input.agentRunId?.trim() || null;
  const teamRunId = input.teamRunId?.trim() || null;
  if ((agentRunId === null) === (teamRunId === null)) throw new Error("Name exactly one of agentRunId or teamRunId.");
  return agentRunId ? { agentRunId } : { teamRunId: teamRunId! };
};

/**
 * The user's Stop of a run its delegator delegated to a peer node (autobyteus-278 DEC-804; autobyteus-461 SR-065). A run
 * delegated on this node is stopped as itself (`terminateAgentRun` / `terminateAgentTeamRun`, rule 2).
 */
@Resolver()
export class PeerChildStopResolver {
  private readonly service = getStudioPeerChildStop();

  @Mutation(() => StopDelegatedExecutionResult)
  async stopDelegatedExecution(
    @Arg("input", () => DelegatedExecutionTargetInput) input: DelegatedExecutionTargetInput,
  ): Promise<StopDelegatedExecutionResult> {
    try {
      return { ...await this.service.stop({ rootKind: rootKindOf(input.rootKind), rootRunId: input.rootRunId, target: referenceOf(input) }) };
    } catch (error) {
      return { success: false, outcome: "NOT_FOUND", message: error instanceof Error ? error.message : String(error), notStoppedUnattributed: 0 };
    }
  }
}
