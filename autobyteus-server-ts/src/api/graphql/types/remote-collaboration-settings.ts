import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { GraphQLJSON } from "graphql-scalars";
import { getProcessRemoteCollaboration } from "../../../remote-collaboration/remote-collaboration-services.js";
import { RemoteCollaborationSettingsError } from "../../../remote-collaboration/domain/remote-collaboration-settings-error.js";
import type { PeerNode } from "../../../remote-collaboration/domain/peer-node.js";
import type { PublishedAgentView } from "../../../remote-collaboration/settings/published-agent-service.js";
import { runtimeKindFromString } from "../../../runtime-management/runtime-kind-enum.js";
import type { PublishedAgentLaunchSettings } from "../../../remote-collaboration/domain/published-agent.js";

@ObjectType()
export class RemoteCollaborationCapabilityGql {
  @Field(() => Boolean) enabled!: boolean;
  @Field(() => String) settingKey!: string;
  @Field(() => String) source!: string;
}

@ObjectType()
export class PeerNodeGql {
  @Field(() => String) nodeId!: string;
  @Field(() => String) name!: string;
  @Field(() => String) baseUrl!: string;
  @Field(() => String) addedAt!: string;
}

@ObjectType()
export class PublishedAgentGql {
  @Field(() => String) agentDefinitionId!: string;
  @Field(() => String, { nullable: true }) definitionName!: string | null;
  @Field(() => String, { nullable: true }) address!: string | null;
  @Field(() => String) runtimeKind!: string;
  @Field(() => String) llmModelIdentifier!: string;
  @Field(() => GraphQLJSON, { nullable: true }) llmConfig!: Record<string, unknown> | null;
  @Field(() => String) workspaceRootPath!: string;
  @Field(() => Boolean) autoExecuteTools!: boolean;
  @Field(() => String) publishedAt!: string;
}

@InputType()
export class AddPeerNodeInput {
  @Field(() => String) baseUrl!: string;
  @Field(() => String) name!: string;
}

@InputType()
export class PublishedAgentInput {
  @Field(() => String) agentDefinitionId!: string;
  @Field(() => String) runtimeKind!: string;
  @Field(() => String) llmModelIdentifier!: string;
  @Field(() => GraphQLJSON, { nullable: true }) llmConfig?: Record<string, unknown> | null;
  @Field(() => String) workspaceRootPath!: string;
  @Field(() => Boolean) autoExecuteTools!: boolean;
}

const toPeer = (peer: PeerNode): PeerNodeGql => ({ ...peer });
const toPublished = (view: PublishedAgentView): PublishedAgentGql => ({
  ...view.agent,
  llmConfig: view.agent.llmConfig === null ? null : structuredClone(view.agent.llmConfig) as Record<string, unknown>,
  definitionName: view.definitionName,
  address: view.address,
});

/** A refused change is a GraphQL error with the settings code (the Nodes tab shows its message). */
const settingsError = (error: unknown): GraphQLError => error instanceof RemoteCollaborationSettingsError
  ? new GraphQLError(error.message, { extensions: { code: error.code } })
  : new GraphQLError(error instanceof Error ? error.message : String(error), { extensions: { code: "REMOTE_COLLABORATION_SETTINGS_FAILED" } });
const guarded = async <T>(operation: () => Promise<T>): Promise<T> => {
  try { return await operation(); } catch (error) { throw settingsError(error); }
};

const launchOf = (input: PublishedAgentInput): PublishedAgentLaunchSettings => {
  const runtimeKind = runtimeKindFromString(input.runtimeKind);
  if (!runtimeKind) throw new RemoteCollaborationSettingsError("LAUNCH_SETTINGS_INVALID", `Runtime '${input.runtimeKind}' is not supported.`);
  return {
    runtimeKind,
    llmModelIdentifier: input.llmModelIdentifier,
    llmConfig: input.llmConfig ?? null,
    workspaceRootPath: input.workspaceRootPath,
    autoExecuteTools: input.autoExecuteTools,
  };
};

/** The Nodes tab's API for remote collaboration (DEC-108): the switch, the peers and the published Agents. */
@Resolver()
export class RemoteCollaborationSettingsResolver {
  @Query(() => RemoteCollaborationCapabilityGql)
  remoteCollaborationCapability(): RemoteCollaborationCapabilityGql {
    return { ...getProcessRemoteCollaboration().capability.getState() };
  }

  @Mutation(() => RemoteCollaborationCapabilityGql)
  setRemoteCollaborationEnabled(@Arg("enabled", () => Boolean) enabled: boolean): RemoteCollaborationCapabilityGql {
    return { ...getProcessRemoteCollaboration().capability.setEnabled(enabled) };
  }

  @Query(() => [PeerNodeGql])
  peerNodes(): Promise<PeerNodeGql[]> {
    return guarded(async () => (await getProcessRemoteCollaboration().peers.list()).map(toPeer));
  }

  @Mutation(() => PeerNodeGql)
  addPeerNode(@Arg("input", () => AddPeerNodeInput) input: AddPeerNodeInput): Promise<PeerNodeGql> {
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.add(input)));
  }

  @Mutation(() => PeerNodeGql)
  renamePeerNode(@Arg("nodeId", () => String) nodeId: string, @Arg("name", () => String) name: string): Promise<PeerNodeGql> {
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.rename(nodeId, name)));
  }

  @Mutation(() => Boolean)
  removePeerNode(@Arg("nodeId", () => String) nodeId: string): Promise<boolean> {
    return guarded(async () => { await getProcessRemoteCollaboration().peers.remove(nodeId); return true; });
  }

  @Query(() => [PublishedAgentGql])
  publishedAgents(): Promise<PublishedAgentGql[]> {
    return guarded(async () => (await getProcessRemoteCollaboration().published.list()).map(toPublished));
  }

  @Mutation(() => [PublishedAgentGql])
  publishAgent(@Arg("input", () => PublishedAgentInput) input: PublishedAgentInput): Promise<PublishedAgentGql[]> {
    return guarded(async () => {
      const published = getProcessRemoteCollaboration().published;
      await published.publish(input.agentDefinitionId, launchOf(input));
      return (await published.list()).map(toPublished);
    });
  }

  @Mutation(() => [PublishedAgentGql])
  updatePublishedAgent(@Arg("input", () => PublishedAgentInput) input: PublishedAgentInput): Promise<PublishedAgentGql[]> {
    return guarded(async () => {
      const published = getProcessRemoteCollaboration().published;
      await published.update(input.agentDefinitionId, launchOf(input));
      return (await published.list()).map(toPublished);
    });
  }

  @Mutation(() => [PublishedAgentGql])
  unpublishAgent(@Arg("agentDefinitionId", () => String) agentDefinitionId: string): Promise<PublishedAgentGql[]> {
    return guarded(async () => {
      const published = getProcessRemoteCollaboration().published;
      await published.unpublish(agentDefinitionId);
      return (await published.list()).map(toPublished);
    });
  }
}
