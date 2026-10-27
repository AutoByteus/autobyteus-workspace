import type { DecisionLaunchSource, RoutingDecisionRecord } from "../domain/model-routing-types.js";
import type { RoutingDecisionLog } from "../stores/routing-decision-log.js";

/** The Overview's period: the last 7 or 30 days, or every record. */
export type RoutingStatisticsPeriod = 7 | 30 | "all";

export type RuntimeCount = Readonly<{ runtimeKind: string; count: number }>;
export type ModelCount = Readonly<{ runtimeKind: string; llmModelIdentifier: string; count: number }>;

/** Agents of one task kind (the router's label, grouped ignoring letter case), or of "not routed". */
export type RoutingStatisticsGroup = Readonly<{ count: number; runtimes: readonly RuntimeCount[]; models: readonly ModelCount[] }>;

/** The Overview (design § SR-014 D4): counts of agents, never Tasks; this node's records only. */
export type RoutingStatisticsView = Readonly<{
  period: RoutingStatisticsPeriod;
  totalAgents: number;
  sources: Readonly<Record<DecisionLaunchSource, number>>;
  /** Agents the router decided, per task kind, most agents first. */
  taskKinds: readonly (RoutingStatisticsGroup & Readonly<{ taskKind: string }>)[];
  /** Agents no router decided (defaults and inherited launches). */
  notRouted: RoutingStatisticsGroup;
  /** Agents that ran on the delegating run's launch because the router could not choose. */
  routerFailures: number;
}>;

/** A task-kind label with how many agents carry it. */
export type TaskKindUse = Readonly<{ taskKind: string; count: number }>;

const DAY_MS = 86_400_000;

const byCountThenName = <T extends { count: number }>(name: (item: T) => string) => (left: T, right: T): number =>
  right.count - left.count || name(left).localeCompare(name(right));

const groupOf = (records: readonly RoutingDecisionRecord[]): RoutingStatisticsGroup => {
  const runtimes = new Map<string, number>();
  const models = new Map<string, ModelCount>();
  for (const record of records) {
    runtimes.set(record.runtimeKind, (runtimes.get(record.runtimeKind) ?? 0) + 1);
    const key = `${record.runtimeKind}\u0000${record.llmModelIdentifier}`;
    const model = models.get(key);
    models.set(key, { runtimeKind: record.runtimeKind, llmModelIdentifier: record.llmModelIdentifier, count: (model?.count ?? 0) + 1 });
  }
  return Object.freeze({
    count: records.length,
    runtimes: Object.freeze([...runtimes].map(([runtimeKind, count]) => ({ runtimeKind, count })).sort(byCountThenName((item) => item.runtimeKind))),
    models: Object.freeze([...models.values()].sort(byCountThenName((item) => `${item.runtimeKind}/${item.llmModelIdentifier}`))),
  });
};

/**
 * Task kinds grouped ignoring letter case (REQ-011), each shown with its most used spelling (the newest on a tie),
 * most agents first.
 */
const byTaskKind = (records: readonly RoutingDecisionRecord[]): Map<string, { label: string; records: RoutingDecisionRecord[] }> => {
  const groups = new Map<string, { spellings: Map<string, number>; records: RoutingDecisionRecord[] }>();
  for (const record of records) {
    if (!record.taskKind) continue;
    const key = record.taskKind.trim().toLowerCase();
    const group = groups.get(key) ?? { spellings: new Map<string, number>(), records: [] as RoutingDecisionRecord[] };
    group.spellings.set(record.taskKind.trim(), (group.spellings.get(record.taskKind.trim()) ?? 0) + 1);
    group.records.push(record);
    groups.set(key, group);
  }
  return new Map([...groups].map(([key, group]) => {
    const label = [...group.spellings].reduce((best, entry) => entry[1] >= best[1] ? entry : best)[0];
    return [key, { label, records: group.records }];
  }));
};

/** The Overview and the task-kind labels in use, derived from the decision log (the one owner of the records). */
export class RoutingStatistics {
  constructor(private readonly log: Pick<RoutingDecisionLog, "readAll">, private readonly now: () => number = Date.now) {}

  async forPeriod(period: RoutingStatisticsPeriod): Promise<RoutingStatisticsView> {
    const since = period === "all" ? null : this.now() - period * DAY_MS;
    const records = (await this.log.readAll()).filter((record) => since === null || Date.parse(record.recordedAt) >= since);
    const sources: Record<DecisionLaunchSource, number> = { model_router: 0, agent_default: 0, team_default: 0, inherited: 0 };
    for (const record of records) sources[record.source] += 1;
    const routed = records.filter((record) => record.source === "model_router");
    return Object.freeze({
      period,
      totalAgents: records.length,
      sources: Object.freeze(sources),
      taskKinds: Object.freeze([...byTaskKind(routed).values()]
        .map(({ label, records: kind }) => Object.freeze({ taskKind: label, ...groupOf(kind) }))
        .sort(byCountThenName((item) => item.taskKind))),
      notRouted: groupOf(records.filter((record) => record.source !== "model_router")),
      routerFailures: records.filter((record) => record.routerFailure !== null).length,
    });
  }

  /** Every task-kind label used on this node, most used first: the routing request lists them for reuse (REQ-011). */
  async taskKindsInUse(): Promise<readonly TaskKindUse[]> {
    return Object.freeze([...byTaskKind(await this.log.readAll()).values()]
      .map(({ label, records }) => Object.freeze({ taskKind: label, count: records.length }))
      .sort(byCountThenName((item) => item.taskKind)));
  }
}
