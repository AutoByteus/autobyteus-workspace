/**
 * The demo's sample world (autobyteus-279, REQ-004): the one owner of the demo's state. Every answer the demo node gives
 * is derived from it; it is created fresh on each start of the demo and nothing is persisted.
 *
 * Runs are trees as on the node: a run (an agent run, a Team run, an Org run) holds its agents; an agent holds the runs it
 * delegated. Top-level runs are the run list's rows; delegated runs are rows of their root's run tree.
 */
import { foldTeamAggregateStatus } from '@autobyteus/collaboration-stream-contracts';
import { DemoRuntime, type DemoAgentFrame, type DemoMemberInput } from '../runtime';
import { DEMO_RUN_SPECS, SHOWCASE_RUN_KEY, type DemoMemberSpec, type DemoRunSpec, type DemoStatus } from './content/runs';

export type { DemoStatus } from './content/runs';
export type DemoRunKind = 'agent' | 'team' | 'org';

/** An agent's launch, as the node keeps it (runtime, model, settings; the workspace it works in). */
export type DemoLaunch = {
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  workspaceRootPath: string;
};

export type DemoAgent = {
  agentRunId: string;
  /** The agent's key in the content (its run's key; `<run key>/<member name>` for a member), stable across starts. */
  key: string;
  agentName: string;
  definitionId: string;
  /** Its member name in a Team or Org run (`/name` is its address); null for an agent run's own agent. */
  memberName: string | null;
  status: DemoStatus;
  launch: DemoLaunch;
  createdAt: string;
  lastActivityAt: string;
  /** The run that holds this agent. */
  run: DemoRun;
  /** The runs this agent delegated, in the order it started them. */
  delegated: DemoRun[];
};

export type DemoRun = {
  kind: DemoRunKind;
  runId: string;
  /** The run's definition name (the agent's, the Team's or the Org's). */
  name: string;
  definitionId: string;
  summary: string;
  createdAt: string;
  lastActivityAt: string;
  agents: DemoAgent[];
  /** The agent a row opens: an agent run's own agent, a Team's or Org's coordinator (its first member). */
  coordinator: DemoAgent;
  /** The agent that delegated this run; null for a top-level run. */
  delegator: DemoAgent | null;
  /** The key of the run in the content (stable across starts); `new-<n>` for a run started in the demo. */
  key: string;
  /** A run the user started in the demo (New run): it has no sample work, only what the demo's runtime adds. */
  startedInDemo: boolean;
  /** A Team's or Org's own default launch (its `/` scope in Settings); null for an agent run, whose launch is its agent's. */
  defaultLaunch: DemoLaunch | null;
  /** When the run was terminated (the history's `terminatedAt`); null while it has not been. */
  terminatedAt: string | null;
};

export type DemoDefinitionKind = 'agent' | 'team' | 'org';
export type DemoDefinition = { kind: DemoDefinitionKind; id: string; name: string; members: string[] };

export type DemoWorldChange =
  | { type: 'agent_status'; agent: DemoAgent }
  /** A run started (a message to a stopped run) or was terminated: its views switch mode, as the node's do. */
  | { type: 'run_lifecycle'; run: DemoRun; live: boolean }
  | { type: 'agent_frame'; agent: DemoAgent; frame: DemoAgentFrame }
  | { type: 'member_input'; agent: DemoAgent; input: DemoMemberInput };

/** A run's launch as Settings and its tree show it: an agent run's agent's, a Team's or Org's own default. */
export const runLaunchOf = (run: DemoRun): DemoLaunch => run.defaultLaunch ?? run.coordinator.launch;

export const DEMO_WORKSPACE_ROOT = '/demo/demo-workspace';
export const DEMO_WORKSPACE_NAME = 'demo-workspace';
/** The sample model every runtime offers in the demo (the demo makes no model request). */
export const DEMO_DEFAULT_LAUNCH: Omit<DemoLaunch, 'workspaceRootPath'> = {
  runtimeKind: 'autobyteus', llmModelIdentifier: 'demo/sample-model', llmConfig: null, autoExecuteTools: true,
};

const snake = (name: string): string => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const slug = (name: string): string => snake(name).replace(/_/g, '-');

/** A stable 8-hex suffix from a content key, so a run has the same id on every start (the product's `<name>_<hex>`). */
const hex = (key: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
};

export class DemoWorld {
  readonly topLevelRuns: DemoRun[] = [];
  private readonly runsById = new Map<string, DemoRun>();
  private readonly agentsById = new Map<string, DemoAgent>();
  private readonly definitionsById = new Map<string, DemoDefinition>();
  private readonly listeners = new Set<(change: DemoWorldChange) => void>();
  private startedRuns = 0;
  /** What the demo's agents do when the phone sends them a message or stops them (`demo/runtime.ts`). */
  readonly runtime: DemoRuntime;

  constructor(readonly startedAt: Date) {
    for (const spec of DEMO_RUN_SPECS) this.topLevelRuns.push(this.buildRun(spec, null));
    this.runtime = new DemoRuntime(this);
  }

  /** An ISO time `minutes` before the demo started (the ages a run list shows: "2m", "6h", "3d"). */
  minutesAgo(minutes: number): string {
    return new Date(this.startedAt.getTime() - minutes * 60_000).toISOString();
  }

  run(runId: string): DemoRun | null { return this.runsById.get(runId) ?? null; }
  agent(agentRunId: string): DemoAgent | null { return this.agentsById.get(agentRunId) ?? null; }
  definition(id: string): DemoDefinition | null { return this.definitionsById.get(id) ?? null; }
  definitions(kind: DemoDefinitionKind): DemoDefinition[] { return [...this.definitionsById.values()].filter((definition) => definition.kind === kind); }
  allRuns(): DemoRun[] { return [...this.runsById.values()]; }

  /** The showcase run (every kind of content in one conversation). */
  get showcaseRun(): DemoRun { return this.allRuns().find((run) => run.key === SHOWCASE_RUN_KEY)!; }

  /** The top-level run whose tree holds `run`. */
  rootOf(run: DemoRun): DemoRun {
    let current = run;
    while (current.delegator) current = current.delegator.run;
    return current;
  }

  /** A run's own status, by the one team status rule over its own agents (its delegated runs have their own). */
  statusOf(run: DemoRun): DemoStatus {
    if (run.kind === 'agent') return run.coordinator.status;
    return foldTeamAggregateStatus(run.agents.map((agent) => agent.status), 'live') as DemoStatus;
  }

  setStatus(agent: DemoAgent, status: DemoStatus): void {
    if (agent.status === status) return;
    agent.status = status;
    agent.lastActivityAt = new Date().toISOString();
    agent.run.lastActivityAt = agent.lastActivityAt;
    this.emit({ type: 'agent_status', agent });
  }

  onChange(listener: (change: DemoWorldChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(change: DemoWorldChange): void {
    for (const listener of [...this.listeners]) {
      try { listener(change); } catch (error) { console.error('[demo] a world listener failed', error); }
    }
  }

  /**
   * A run the user starts (New run; the node's `prepareAgentRun`): a new top-level agent run of an agent definition,
   * offline (prepared) until its first message arrives.
   */
  startAgentRun(definition: DemoDefinition, launch: DemoLaunch, summary: string): DemoRun {
    if (definition.kind !== 'agent') throw new Error(`Agent definition '${definition.id}' was not found.`);
    this.startedRuns += 1;
    const key = `new-${this.startedRuns}`;
    const now = new Date().toISOString();
    const run = {
      kind: 'agent', runId: `${snake(definition.name)}_${hex(`${key}@${this.startedAt.toISOString()}`)}`, name: definition.name,
      definitionId: definition.id, summary, createdAt: now, lastActivityAt: now, agents: [], delegator: null, key, startedInDemo: true,
      defaultLaunch: null, terminatedAt: null,
    } as unknown as DemoRun;
    const agent: DemoAgent = {
      agentRunId: run.runId, key, agentName: definition.name, definitionId: definition.id, memberName: null, status: 'offline',
      launch: { ...launch }, createdAt: now, lastActivityAt: now, run, delegated: [],
    };
    run.agents.push(agent);
    run.coordinator = agent;
    this.runsById.set(run.runId, run);
    this.agentsById.set(agent.agentRunId, agent);
    this.topLevelRuns.push(run);
    return run;
  }

  private define(kind: DemoDefinitionKind, name: string, members: string[] = []): string {
    const id = `demo-${kind}-${slug(name)}`;
    if (!this.definitionsById.has(id)) this.definitionsById.set(id, { kind, id, name, members });
    return id;
  }

  private buildAgent(run: DemoRun, agentName: string, memberName: string | null, status: DemoStatus, minutes: number, key: string): DemoAgent {
    const agent: DemoAgent = {
      agentRunId: run.kind === 'agent' ? run.runId : `${snake(agentName)}_${hex(key)}`,
      key, agentName, definitionId: this.define('agent', agentName), memberName, status,
      launch: { ...DEMO_DEFAULT_LAUNCH, workspaceRootPath: DEMO_WORKSPACE_ROOT },
      createdAt: this.minutesAgo(minutes + 30), lastActivityAt: this.minutesAgo(minutes), run, delegated: [],
    };
    this.agentsById.set(agent.agentRunId, agent);
    return agent;
  }

  private buildRun(spec: DemoRunSpec, delegator: DemoAgent | null): DemoRun {
    const name = spec.kind === 'agent' ? spec.agent : spec.kind === 'team' ? spec.team : spec.org;
    const memberSpecs: DemoMemberSpec[] = spec.kind === 'agent' ? [] : spec.members;
    const run = {
      kind: spec.kind, runId: `${snake(name)}_${hex(spec.key)}`, name,
      definitionId: this.define(spec.kind, name, memberSpecs.map((member) => member.name)),
      summary: spec.summary, createdAt: this.minutesAgo(spec.minutes + 30), lastActivityAt: this.minutesAgo(spec.minutes),
      agents: [], delegator, key: spec.key, startedInDemo: false,
      defaultLaunch: spec.kind === 'agent' ? null : { ...DEMO_DEFAULT_LAUNCH, workspaceRootPath: DEMO_WORKSPACE_ROOT }, terminatedAt: null,
    } as unknown as DemoRun;
    this.runsById.set(run.runId, run);
    if (spec.kind === 'agent') {
      run.agents.push(this.buildAgent(run, spec.agent, null, spec.status, spec.minutes, spec.key));
    } else {
      for (const member of spec.members) {
        run.agents.push(this.buildAgent(run, member.agent, member.name, member.status, member.minutes ?? spec.minutes, `${spec.key}/${member.name}`));
      }
    }
    run.coordinator = run.agents[0]!;
    const delegatedOf = (agent: DemoAgent, specs: DemoRunSpec[] | undefined) => {
      for (const child of specs ?? []) agent.delegated.push(this.buildRun(child, agent));
    };
    if (spec.kind === 'agent') delegatedOf(run.coordinator, spec.delegated);
    else spec.members.forEach((member, index) => delegatedOf(run.agents[index]!, member.delegated));
    return run;
  }
}

export const createDemoWorld = (now: Date): DemoWorld => new DemoWorld(now);
