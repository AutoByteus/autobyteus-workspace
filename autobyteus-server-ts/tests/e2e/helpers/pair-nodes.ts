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
  const granted = await input.granter.gql(
    "mutation($nameForAsker: String) { createPairingGrant(relation: \"own\", nameForAsker: $nameForAsker) { grant } }",
    { nameForAsker: input.askerName },
  );
  const paired = await input.asker.gql(
    "mutation($address: String!, $grant: String, $name: String) { pairWithNode(address: $address, grant: $grant, name: $name) { state peer { nodeId name address paired relation } } }",
    { address: input.granter.address, grant: granted.createPairingGrant.grant, name: input.granterName },
  );
  if (paired.pairWithNode.state !== "paired") throw new Error(`The nodes did not pair: ${JSON.stringify(paired)}`);
  return paired.pairWithNode.peer;
};
