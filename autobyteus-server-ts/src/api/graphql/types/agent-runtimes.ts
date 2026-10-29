import { GraphQLError } from "graphql";
import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import {
  AgentRuntimeError, getAgentRuntimeStatusService,
} from "../../../runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type {
  AgentRuntimeAccountState, AgentRuntimeKind, AgentRuntimeOperation, AgentRuntimeStatus, AgentRuntimeUpdateState,
} from "../../../runtime-management/agent-runtimes/agent-runtime-types.js";
import { isExternalProviderRuntimeKind, runtimeKindFromString } from "../../../runtime-management/runtime-kind-enum.js";

export enum AgentRuntimeUpdateStateKind {
  CHECKING = "CHECKING", UP_TO_DATE = "UP_TO_DATE", UPDATE_AVAILABLE = "UPDATE_AVAILABLE",
  CHECK_FAILED = "CHECK_FAILED", NOT_CHECKED = "NOT_CHECKED",
}
export enum AgentRuntimeAccountStateKind {
  CHECKING = "CHECKING", SIGNED_IN = "SIGNED_IN", SIGNED_OUT = "SIGNED_OUT", UNKNOWN = "UNKNOWN", NOT_APPLICABLE = "NOT_APPLICABLE",
}
export enum AgentRuntimeSignInRouteKind { BROWSER = "BROWSER", COMMAND_LINE = "COMMAND_LINE" }
export enum AgentRuntimeOperationKind { UPDATE = "UPDATE", SIGN_IN = "SIGN_IN" }
export enum AgentRuntimeOperationState { RUNNING = "RUNNING", SUCCEEDED = "SUCCEEDED", FAILED = "FAILED", DID_NOT_FINISH = "DID_NOT_FINISH" }
registerEnumType(AgentRuntimeUpdateStateKind, { name: "AgentRuntimeUpdateState" });
registerEnumType(AgentRuntimeAccountStateKind, { name: "AgentRuntimeAccountState" });
registerEnumType(AgentRuntimeSignInRouteKind, { name: "AgentRuntimeSignInRoute" });
registerEnumType(AgentRuntimeOperationKind, { name: "AgentRuntimeOperationKind" });
registerEnumType(AgentRuntimeOperationState, { name: "AgentRuntimeOperationState" });

@ObjectType()
export class AgentRuntimeUpdates {
  @Field(() => AgentRuntimeUpdateStateKind) state!: AgentRuntimeUpdateStateKind;
  @Field(() => String, { nullable: true }) latestVersion!: string | null;
}

@ObjectType()
export class AgentRuntimeAccount {
  @Field(() => AgentRuntimeAccountStateKind) state!: AgentRuntimeAccountStateKind;
}

/** A running or finished update or sign-in. `step`: the updater's latest output line; `error`: its failure output. */
@ObjectType()
export class AgentRuntimeOperationInfo {
  @Field(() => AgentRuntimeOperationKind) kind!: AgentRuntimeOperationKind;
  @Field(() => AgentRuntimeOperationState) state!: AgentRuntimeOperationState;
  @Field(() => String, { nullable: true }) command!: string | null;
  @Field(() => String, { nullable: true }) step!: string | null;
  @Field(() => String, { nullable: true }) fromVersion!: string | null;
  @Field(() => String, { nullable: true }) toVersion!: string | null;
  @Field(() => String, { nullable: true }) error!: string | null;
}

@ObjectType()
export class AgentRuntime {
  @Field(() => String) runtimeKind!: string;
  @Field(() => Boolean) installed!: boolean;
  @Field(() => String, { nullable: true }) installedVersion!: string | null;
  @Field(() => AgentRuntimeUpdates) updates!: AgentRuntimeUpdates;
  @Field(() => AgentRuntimeAccount) account!: AgentRuntimeAccount;
  @Field(() => AgentRuntimeSignInRouteKind) signInRoute!: AgentRuntimeSignInRouteKind;
  @Field(() => String) installInstructionsUrl!: string;
  @Field(() => Int) runningAgentCount!: number;
  @Field(() => AgentRuntimeOperationInfo, { nullable: true }) operation!: AgentRuntimeOperationInfo | null;
  @Field(() => Date, { nullable: true }) checkedAt!: Date | null;
}

const UPDATE_STATES: Readonly<Record<AgentRuntimeUpdateState, AgentRuntimeUpdateStateKind>> = {
  checking: AgentRuntimeUpdateStateKind.CHECKING, upToDate: AgentRuntimeUpdateStateKind.UP_TO_DATE,
  updateAvailable: AgentRuntimeUpdateStateKind.UPDATE_AVAILABLE, checkFailed: AgentRuntimeUpdateStateKind.CHECK_FAILED,
  notChecked: AgentRuntimeUpdateStateKind.NOT_CHECKED,
};
const ACCOUNT_STATES: Readonly<Record<AgentRuntimeAccountState, AgentRuntimeAccountStateKind>> = {
  checking: AgentRuntimeAccountStateKind.CHECKING, signedIn: AgentRuntimeAccountStateKind.SIGNED_IN,
  signedOut: AgentRuntimeAccountStateKind.SIGNED_OUT, unknown: AgentRuntimeAccountStateKind.UNKNOWN,
  notApplicable: AgentRuntimeAccountStateKind.NOT_APPLICABLE,
};
const OPERATION_STATES = {
  running: AgentRuntimeOperationState.RUNNING, succeeded: AgentRuntimeOperationState.SUCCEEDED,
  failed: AgentRuntimeOperationState.FAILED, didNotFinish: AgentRuntimeOperationState.DID_NOT_FINISH,
} as const;

const toOperation = (operation: AgentRuntimeOperation): AgentRuntimeOperationInfo => {
  if (operation.kind === "signIn") {
    return {
      kind: AgentRuntimeOperationKind.SIGN_IN, state: OPERATION_STATES[operation.state],
      command: null, step: null, fromVersion: null, toVersion: null, error: null,
    };
  }
  return {
    kind: AgentRuntimeOperationKind.UPDATE,
    state: OPERATION_STATES[operation.state],
    command: operation.command,
    step: operation.state === "running" ? operation.step : null,
    fromVersion: operation.fromVersion,
    toVersion: operation.state === "succeeded" ? operation.toVersion : null,
    error: operation.state === "failed" ? operation.error : null,
  };
};

const toAgentRuntime = (status: AgentRuntimeStatus): AgentRuntime => ({
  runtimeKind: status.runtimeKind,
  installed: status.installed,
  installedVersion: status.installedVersion,
  updates: { state: UPDATE_STATES[status.updateState], latestVersion: status.latestVersion },
  account: { state: ACCOUNT_STATES[status.accountState] },
  signInRoute: status.signInRoute === "browser" ? AgentRuntimeSignInRouteKind.BROWSER : AgentRuntimeSignInRouteKind.COMMAND_LINE,
  installInstructionsUrl: status.installInstructionsUrl,
  runningAgentCount: status.runningAgentCount,
  operation: status.operation ? toOperation(status.operation) : null,
  checkedAt: status.checkedAt,
});

const requireAgentRuntimeKind = (value: string): AgentRuntimeKind => {
  const kind = runtimeKindFromString(value);
  if (!kind || !isExternalProviderRuntimeKind(kind)) {
    throw new GraphQLError(`Unknown agent runtime '${value}'.`, { extensions: { code: "AGENT_RUNTIME_UNKNOWN" } });
  }
  return kind as AgentRuntimeKind;
};

/** Refusals of the status service become GraphQL errors with their code. */
const withRuntimeErrors = async <T>(action: () => T | Promise<T>): Promise<T> => {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AgentRuntimeError) throw new GraphQLError(error.message, { extensions: { code: error.code } });
    throw error;
  }
};

/** Settings → Agent Runtimes. The query reads the current state; the mutations start work. */
@Resolver()
export class AgentRuntimesResolver {
  @Query(() => [AgentRuntime])
  agentRuntimes(): AgentRuntime[] {
    return getAgentRuntimeStatusService().list().map(toAgentRuntime);
  }

  /** Whether this node's runtimes' own logins can open a browser on this node's desktop. Read-only. */
  @Query(() => Boolean)
  agentRuntimeSignInBrowserAvailable(): boolean {
    return getAgentRuntimeStatusService().signInBrowserAvailable();
  }

  /** Checks every runtime that is not checking or busy; settles once installed versions are known. */
  @Mutation(() => Boolean)
  async checkAgentRuntimes(): Promise<boolean> {
    await withRuntimeErrors(() => getAgentRuntimeStatusService().checkAll());
    return true;
  }

  @Mutation(() => Boolean)
  async updateAgentRuntime(@Arg("runtimeKind", () => String) runtimeKind: string): Promise<boolean> {
    await withRuntimeErrors(() => getAgentRuntimeStatusService().startUpdate(requireAgentRuntimeKind(runtimeKind)));
    return true;
  }

  @Mutation(() => Boolean)
  async startAgentRuntimeSignIn(@Arg("runtimeKind", () => String) runtimeKind: string): Promise<boolean> {
    await withRuntimeErrors(() => getAgentRuntimeStatusService().startSignIn(requireAgentRuntimeKind(runtimeKind)));
    return true;
  }

  @Mutation(() => Boolean)
  async cancelAgentRuntimeSignIn(@Arg("runtimeKind", () => String) runtimeKind: string): Promise<boolean> {
    await withRuntimeErrors(() => getAgentRuntimeStatusService().cancelSignIn(requireAgentRuntimeKind(runtimeKind)));
    return true;
  }
}
