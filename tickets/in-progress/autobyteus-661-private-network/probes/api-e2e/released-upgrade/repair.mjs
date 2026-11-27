// "Pair again" in one click from the window bound to `here` (connector `pair` step): the target makes a grant for here,
// here pairs at the window's address of the target, then the target's own addresses. Then signed requests both ways.
import fs from 'node:fs'
const secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'))
const gql = async (name, query, variables = {}) => {
  const { url, credential } = secrets[name]
  return (await fetch(`${url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${credential}` }, body: JSON.stringify({ query, variables }) })).json()
}
const nodeId = async (name) => (await (await fetch(`${secrets[name].url}/rest/remote-access/status`)).json()).nodeId
const result = {}
for (const [here, target] of [['a', 'b'], ['a', 'c']]) {
  const [hereId, targetId] = [await nodeId(here), await nodeId(target)]
  const before = { [here]: (await gql(here, '{ peerNodes { nodeId name paired } }')).data.peerNodes.find((p) => p.nodeId === targetId), [target]: (await gql(target, '{ peerNodes { nodeId name paired } }')).data.peerNodes.find((p) => p.nodeId === hereId) }
  const grant = (await gql(target, 'mutation($n:String!){ createPairingGrant(relation:"own",forNodeId:$n,nameForAsker:"ignored-when-row-exists"){ grant addresses } }', { n: hereId })).data.createPairingGrant
  const paired = await gql(here, 'mutation($address:String!,$addresses:[String!],$grant:String,$nodeId:String){ pairWithNode(address:$address,addresses:$addresses,grant:$grant,nodeId:$nodeId){ state peer{ nodeId name address relation paired } } }',
    { address: secrets[target].url, addresses: grant.addresses, grant: grant.grant, nodeId: targetId })
  const after = { [here]: (await gql(here, '{ peerNodes { nodeId name address relation paired } }')).data.peerNodes.find((p) => p.nodeId === targetId), [target]: (await gql(target, '{ peerNodes { nodeId name address relation paired } }')).data.peerNodes.find((p) => p.nodeId === hereId) }
  const signed = {
    [`${here}->${target}`]: (await gql(here, 'query($n:String!){ peerNodeAvailability(nodeId:$n){ available refusalCode } peerNodeOffer(nodeId:$n){ refusalCode } }', { n: targetId })).data,
    [`${target}->${here}`]: (await gql(target, 'query($n:String!){ peerNodeAvailability(nodeId:$n){ available refusalCode } peerNodeOffer(nodeId:$n){ refusalCode } }', { n: hereId })).data,
  }
  result[`${here}+${target}`] = { windowAddressOfTarget: secrets[target].url, targetAddresses: grant.addresses, before, pair: paired.errors ?? paired.data.pairWithNode, after, signed }
}
console.log(JSON.stringify(result, null, 1))
