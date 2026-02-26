import { Field, ObjectType, Query, Resolver } from "type-graphql";
import { getDiscoveryRuntime } from "../../../discovery/runtime/discovery-runtime.js";
import type { DiscoveryNodeStatus } from "../../../discovery/services/node-discovery-registry-service.js";

@ObjectType()
class DiscoveryNodeCapabilities {
  @Field(() => Boolean, { nullable: true })
  terminal?: boolean;

  @Field(() => Boolean, { nullable: true })
  fileExplorerStreaming?: boolean;
}

@ObjectType()
export class DiscoveredNodeProfile {
  @Field(() => String)
  nodeId!: string;

  @Field(() => String)
  nodeName!: string;

  @Field(() => String)
  baseUrl!: string;

  @Field(() => String, { nullable: true })
  advertisedBaseUrl!: string | null;

  @Field(() => String)
  status!: DiscoveryNodeStatus;

  @Field(() => String)
  lastSeenAtIso!: string;

  @Field(() => String, { nullable: true })
  trustMode!: string | null;

  @Field(() => DiscoveryNodeCapabilities, { nullable: true })
  capabilities!: DiscoveryNodeCapabilities | null;
}

@Resolver()
export class NodeDiscoveryResolver {
  @Query(() => [DiscoveredNodeProfile])
  discoveredNodeCatalog(): DiscoveredNodeProfile[] {
    const runtime = getDiscoveryRuntime();
    if (!runtime.roleConfig.discoveryEnabled) {
      return [];
    }

    return runtime.registryService
      .snapshotForGraphql()
      .filter((peer) => peer.nodeId !== runtime.selfIdentity.nodeId);
  }
}
