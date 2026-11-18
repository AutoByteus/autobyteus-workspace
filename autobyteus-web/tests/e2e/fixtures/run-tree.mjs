// A probe's read of a run's delegated runs (autobyteus-461 SR-084): the rows the server builds for the run's tree
// (`runTree(kind, runId)`), the same rows every view and the run list show. A run's view carries its own parts only, so a
// probe that looked for delegated runs in a view reads them here.
//
//   const tree = await readRunTree(gql, 'agent', runId)            // { kind, runId, rows: [...] }
//   const nodes = delegatedNodes(tree)                               // [{ address, agentRunId? , teamRunId?, members?, nodeId? }]
//   const legacy = asTaskExecutions(tree)                            // { taskExecutions: nodes } for probes that walk a tree
//
// `kind` is the run's kind as the server names it: 'agent', 'agent_team' or 'agent_org' ('team'/'org' are accepted).

const KIND = { agent: 'agent', team: 'agent_team', agent_team: 'agent_team', org: 'agent_org', agent_org: 'agent_org' };

export const readRunTree = async (gql, kind, runId) =>
  (await gql('query($k:String!,$r:String!){runTree(kind:$k,runId:$r)}', { k: KIND[kind] ?? kind, r: runId })).runTree;

const DELEGATED_KINDS = new Set(['agent', 'team', 'peer_agent', 'peer_team']);

/**
 * The tree's delegated runs (a delegated row is under the agent that delegated it; a run's own parts have no parent),
 * each with its members when it is a team.
 */
export const delegatedNodes = (tree) => {
  const rows = tree?.rows ?? [];
  return rows.filter((row) => DELEGATED_KINDS.has(row.kind) && row.parentKey !== null).map((row) => {
    const team = row.kind === 'team' || row.kind === 'peer_team';
    const members = team ? rows.filter((m) => m.parentKey === row.key && (m.kind === 'team_member' || m.kind === 'peer_member'))
      .map((m) => ({ address: m.address, agentRunId: m.openTarget?.agentRunId ?? m.statusIds?.[0] ?? null })) : undefined;
    return {
      key: row.key, kind: row.kind, address: row.address, name: row.name, depth: row.depth,
      ...(team ? { teamRunId: row.openTarget?.runId ?? row.statusIds?.[0] ?? null, coordinatorAgentRunId: row.openTarget?.agentRunId ?? null, members }
        : { agentRunId: row.openTarget?.agentRunId ?? row.statusIds?.[0] ?? null }),
      ...(row.peer ? { nodeId: row.peer.nodeId, nodeName: row.peer.nodeName } : {}),
      launch: row.launch ?? null, parentKey: row.parentKey,
      // The agent that delegated it: the run of the row it hangs under.
      delegatorAgentRunId: rows.find((parent) => parent.key === row.parentKey)?.openTarget?.agentRunId ?? null,
    };
  });
};

/** The delegated runs in the shape a probe that walked a view's `taskExecutions` expects. */
export const asTaskExecutions = (tree) => ({ taskExecutions: delegatedNodes(tree) });
