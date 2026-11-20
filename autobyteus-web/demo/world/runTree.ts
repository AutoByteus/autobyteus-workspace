/**
 * A run's tree (`runTree(kind, runId)`, autobyteus-279), built by the node's own rules
 * (`autobyteus-server-ts/src/agent-collaboration/delegation/run-tree-view.ts`): the run's own parts, then the runs it
 * delegated at every depth, each under the agent or member that delegated it; keys from identities only; rows in
 * depth-first order. Validated by the contract's schema.
 */
import { runTreeDtoSchema, type RunTreeDto, type RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts';
import { runLaunchOf, type DemoAgent, type DemoLaunch, type DemoRun } from './DemoWorld';
import { addressOf } from './projections';

type Draft = Omit<RunTreeRowDto, 'depth'>;
type Launch = NonNullable<RunTreeRowDto['launch']>;

export const runKindOf = (run: DemoRun): RunTreeDto['kind'] => (run.kind === 'agent' ? 'agent' : run.kind === 'team' ? 'agent_team' : 'agent_org');

const rowKey = (kind: RunTreeRowDto['kind'], runId: string, agentRunId?: string): string => (agentRunId === undefined ? `${kind}:${runId}` : `${kind}:${runId}:${agentRunId}`);

/** The node's one name rule: an address's last segment, `_` and `-` read as spaces. */
const slotNameOf = (address: string | null): string | null =>
  ((address ?? '').split('/').filter(Boolean).at(-1) ?? '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || null;
const rowNameOf = (address: string | null, fallback: string): string => slotNameOf(address) || address || fallback;

/** The address a delegated run was started at: the catalog address of its agent's or Team's definition. */
export const delegatedAddressOf = (run: DemoRun): string => `/${run.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;

const launchOf = (launch: DemoLaunch, ownSource: boolean): Launch => ({
  runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig as Launch['llmConfig'],
  autoExecuteTools: launch.autoExecuteTools, workspaceRootPath: launch.workspaceRootPath, source: null, ownSource,
});

const memberRow = (teamRunId: string, parentKey: string, member: DemoAgent, inOrg: string | null): Draft => ({
  key: rowKey('team_member', teamRunId, member.agentRunId), parentKey, kind: 'team_member',
  name: rowNameOf(addressOf(member), member.agentRunId), address: addressOf(member),
  openTarget: inOrg ? { runKind: 'agent_org', runId: inOrg, agentRunId: member.agentRunId } : { runKind: 'agent_team', runId: teamRunId, agentRunId: member.agentRunId },
  statusIds: [member.agentRunId],
});

/** The run's own parts; anchors where each of its agents' delegations hang. Returns the key delegated rows fall back to. */
const ownParts = (run: DemoRun, drafts: Draft[], anchors: Map<DemoAgent, string>): string => {
  if (run.kind === 'agent') {
    const key = rowKey('agent', run.runId);
    drafts.push({ key, parentKey: null, kind: 'agent', name: rowNameOf(null, run.runId), address: null,
      openTarget: { runKind: 'agent', runId: run.runId, agentRunId: run.runId }, statusIds: [run.runId] });
    anchors.set(run.coordinator, key);
    return key;
  }
  if (run.kind === 'team') {
    const key = rowKey('team', run.runId);
    drafts.push({ key, parentKey: null, kind: 'team', name: rowNameOf(null, run.runId), address: null,
      openTarget: { runKind: 'agent_team', runId: run.runId, agentRunId: run.coordinator.agentRunId }, statusIds: [run.runId] });
    for (const member of run.agents) {
      const draft = memberRow(run.runId, key, member, null);
      drafts.push(draft);
      anchors.set(member, draft.key);
    }
    return key;
  }
  // An Org's own agents (the demo's Org has no Org Team).
  let first: string | null = null;
  for (const agent of run.agents) {
    const key = rowKey('org_agent', run.runId, agent.agentRunId);
    drafts.push({ key, parentKey: null, kind: 'org_agent', name: rowNameOf(addressOf(agent), agent.agentRunId), address: addressOf(agent),
      openTarget: { runKind: 'agent_org', runId: run.runId, agentRunId: agent.agentRunId }, statusIds: [agent.agentRunId] });
    anchors.set(agent, key);
    first ??= key;
  }
  return first!;
};

/** A delegated run's rows (its own row first, then its members), anchoring where its own delegations hang. */
const delegatedRows = (run: DemoRun, anchors: Map<DemoAgent, string>): Draft[] => {
  const address = delegatedAddressOf(run);
  if (run.kind === 'agent') {
    const key = rowKey('agent', run.runId);
    anchors.set(run.coordinator, key);
    return [{ key, parentKey: null, kind: 'agent', name: slotNameOf(address) ?? run.runId, address,
      openTarget: { runKind: 'agent', runId: run.runId, agentRunId: run.runId }, statusIds: [run.runId], launch: launchOf(run.coordinator.launch, true) }];
  }
  const key = rowKey('team', run.runId);
  const rows: Draft[] = [{ key, parentKey: null, kind: 'team', name: slotNameOf(address) ?? run.runId, address,
    openTarget: { runKind: 'agent_team', runId: run.runId, agentRunId: run.coordinator.agentRunId }, statusIds: [run.runId], launch: launchOf(runLaunchOf(run), true) }];
  for (const member of run.agents) {
    const draft = { ...memberRow(run.runId, key, member, null), launch: launchOf(member.launch, false) };
    rows.push(draft);
    anchors.set(member, draft.key);
  }
  return rows;
};

/** The runs a run's agents delegated, at every depth, in the order they were started. */
const subtreeOf = (run: DemoRun): DemoRun[] => run.agents.flatMap((agent) => agent.delegated.flatMap((child) => [child, ...subtreeOf(child)]));

const depthFirst = (drafts: Draft[]): RunTreeRowDto[] => {
  const keys = new Set(drafts.map((draft) => draft.key));
  const children = new Map<string | null, Draft[]>();
  for (const draft of drafts) {
    const parent = draft.parentKey !== null && keys.has(draft.parentKey) ? draft.parentKey : null;
    children.set(parent, [...(children.get(parent) ?? []), parent === draft.parentKey ? draft : { ...draft, parentKey: null }]);
  }
  const rows: RunTreeRowDto[] = [];
  const visit = (parentKey: string | null, depth: number) => {
    for (const draft of children.get(parentKey) ?? []) { rows.push({ ...draft, depth }); visit(draft.key, depth + 1); }
  };
  visit(null, 0);
  return rows;
};

export const runTreeOf = (run: DemoRun): RunTreeDto => {
  const drafts: Draft[] = [];
  const anchors = new Map<DemoAgent, string>();
  const fallbackParent = ownParts(run, drafts, anchors);
  for (const child of subtreeOf(run)) {
    const rows = delegatedRows(child, anchors);
    const parentKey = (child.delegator && anchors.get(child.delegator)) ?? fallbackParent;
    rows.forEach((draft, index) => drafts.push(index === 0 ? { ...draft, parentKey } : draft));
  }
  return runTreeDtoSchema.parse({ kind: runKindOf(run), runId: run.runId, rows: depthFirst(drafts) });
};
