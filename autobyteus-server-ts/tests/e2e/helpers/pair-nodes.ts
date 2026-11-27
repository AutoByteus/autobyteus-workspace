/** One GraphQL call to a node as its owner: the `data` of the answer (it throws on errors). */
export type OwnerGraphqlCall = (query: string, variables?: Record<string, unknown>) => Promise<Record<string, any>>;

/** A node as the test's app controls it: its owner GraphQL and the address the app reaches it at. */
export type ControlledNode = Readonly<{ gql: OwnerGraphqlCall; address: string }>;

/**
 * Pairs two nodes the same app controls, in one click (autobyteus-661 contract §3 case 1): the granting node makes a
 * grant for an `own` node it names `askerName`; the asking node pairs with it at its address and names it
 * `granterName`; the granting node keeps the first of the asking node's addresses that answers as it (contract §2). Both then hold the other's public node key. Returns the
 * asking node's new peer row.
 */
export const pairNodes = async (input: Readonly<{
  granter: ControlledNode;
  asker: ControlledNode;
  /** The asking node's name for the granting node. */
  granterName: string;
  /** The granting node's name for the asking node. */
  askerName: string;
}>): Promise<Record<string, any>> => {
  // The grant is for the asking node only (CR-001): its node ID, from its public status route.
  const askerNodeId = ((await (await fetch(`${input.asker.address}/rest/remote-access/status`)).json()) as { nodeId: string }).nodeId;
  const granted = await input.granter.gql(
    "mutation($forNodeId: String!, $nameForAsker: String) { createPairingGrant(relation: \"own\", forNodeId: $forNodeId, nameForAsker: $nameForAsker) { grant addresses } }",
    { forNodeId: askerNodeId, nameForAsker: input.askerName },
  );
  const granterNodeId = ((await (await fetch(`${input.granter.address}/rest/remote-access/status`)).json()) as { nodeId: string }).nodeId;
  const paired = await input.asker.gql(
    "mutation($address: String!, $addresses: [String!], $grant: String, $nodeId: String, $name: String) { pairWithNode(address: $address, addresses: $addresses, grant: $grant, nodeId: $nodeId, name: $name) { state peer { nodeId name address paired relation } } }",
    { address: input.granter.address, addresses: granted.createPairingGrant.addresses, grant: granted.createPairingGrant.grant, nodeId: granterNodeId, name: input.granterName },
  );
  if (paired.pairWithNode.state !== "paired") throw new Error(`The nodes did not pair: ${JSON.stringify(paired)}`);
  return paired.pairWithNode.peer;
};
