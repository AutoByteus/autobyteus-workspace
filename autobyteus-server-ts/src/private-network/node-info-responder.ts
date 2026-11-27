import type { PrivateNetworkCaller } from "./private-network-listener.js";
import type { NodeVisibility } from "./node-visibility.js";

/** What `POST /rest/remote/info` answers when this node is visible: who it is, nothing else (contract §2). */
export type NodeInfo = Readonly<{ nodeId: string; name: string }>;

/**
 * `POST /rest/remote/info` (autobyteus-661 contract §2, §4; design `NodeInfoResponder`): the question a node asks every
 * machine of its private network to find the AutoByteus nodes there. This node answers only while it is visible on
 * the network the question came over: a private-network connection (it carries a caller) while "Visible on my private
 * network" is on, any other connection while "Visible on my local network" is on. Otherwise it answers as if no
 * AutoByteus were there (`null`: the route's caller sends the server's own "not found").
 */
export class NodeInfoResponder {
  constructor(private readonly dependencies: Readonly<{
    visibility: Pick<NodeVisibility, "state">;
    ownNodeId(): Promise<string>;
    ownName(): Promise<string>;
  }>) {}

  async answer(caller: PrivateNetworkCaller | null): Promise<NodeInfo | null> {
    const visible = this.dependencies.visibility.state();
    if (!(caller ? visible.privateNetwork : visible.localNetwork)) return null;
    return Object.freeze({ nodeId: await this.dependencies.ownNodeId(), name: await this.dependencies.ownName() });
  }
}
