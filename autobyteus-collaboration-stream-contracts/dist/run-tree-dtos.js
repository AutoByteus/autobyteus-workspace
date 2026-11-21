import { z } from "zod";
import { jsonValueSchema, nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";
import { collaborationLaunchConfigurationSourceDtoSchema } from "./launch-source-dtos.js";
/**
 * A run's tree, built once on the server (autobyteus-461 SR-082, SR-084): its own parts, then the runs it delegated at
 * every depth, each under the agent or member that delegated it, with its peer rows. Every client shows these rows and
 * opens a row through its `openTarget`; none derives anything about a run. Statuses are each run's own
 * (`/ws/run-status`); a row names the agent run IDs whose statuses it shows.
 */
export const runTreeRowKindSchema = z.enum(["agent", "team", "team_member", "org_agent", "org_team", "peer_agent", "peer_team", "peer_member"]);
/** Where a row opens: the run and the agent to focus (a team's coordinator for a team row); a peer's run on its node. */
export const runTreeOpenTargetDtoSchema = z.object({
    runKind: z.enum(["agent", "agent_team", "agent_org"]),
    runId: nonEmptyStringSchema,
    agentRunId: nonEmptyStringSchema,
    nodeId: nonEmptyStringSchema.optional(),
}).strict();
/** A row's launch as its run has it now, and where it came from (Settings; a peer row's from its node's answer). */
export const runTreeLaunchDtoSchema = z.object({
    runtimeKind: nonEmptyStringSchema,
    llmModelIdentifier: nonEmptyStringSchema,
    llmConfig: z.record(z.string(), jsonValueSchema).nullable(),
    autoExecuteTools: z.boolean().nullable(),
    workspaceRootPath: z.string().nullable(),
    source: collaborationLaunchConfigurationSourceDtoSchema.nullable(),
    /** The source is the row's own; else (a team member) its team's applies. */
    ownSource: z.boolean(),
}).strict();
/** One row. `key` is built from identities only (kind and run ID, plus the agent run ID for a member row), never position. */
export const runTreeRowDtoSchema = z.object({
    key: nonEmptyStringSchema,
    parentKey: nonEmptyStringSchema.nullable(),
    depth: z.number().int().nonnegative(),
    kind: runTreeRowKindSchema,
    name: z.string(),
    address: z.string().nullable(),
    /** `null` is a row error (a team whose coordinator is not a member): shown, never opened. */
    openTarget: runTreeOpenTargetDtoSchema.nullable(),
    statusIds: z.array(nonEmptyStringSchema),
    launch: runTreeLaunchDtoSchema.optional(),
    /** A peer's run: its node, and what the node answered (`null` while not answered). */
    peer: z.object({
        nodeId: nonEmptyStringSchema,
        nodeName: z.string(),
        title: z.string().nullable(),
        reachable: z.boolean().nullable(),
    }).strict().optional(),
    /** A team member removed from its team, still finishing its turn while the team run is live: shown "Leaving", still opens. */
    leaving: z.literal(true).optional(),
}).strict();
/** What changed since the rows a view had: rows that came (in the tree's order), keys of rows that left, rows that changed. */
export const runTreeChangeDtoSchema = z.object({
    added: z.array(runTreeRowDtoSchema),
    removed: z.array(nonEmptyStringSchema),
    updated: z.array(runTreeRowDtoSchema),
}).strict();
/** In an agent or org view's events: the tree changed, numbered in the view's one sequence (an empty change still counts). */
export const runTreeChangedEventDtoSchema = runTreeChangeDtoSchema.extend({ kind: z.literal("run_tree_changed") }).strict();
/** The `runTree(kind, runId)` answer: a listed run's tree, read when it is expanded and again on `RUN_TREE_CHANGED`. */
export const runTreeDtoSchema = z.object({
    kind: z.enum(["agent", "agent_team", "agent_org"]),
    runId: nonEmptyStringSchema,
    rows: z.array(runTreeRowDtoSchema),
}).strict();
export const applyRunTreeChange = (rows, change) => {
    const removed = new Set(change.removed);
    const updated = new Map(change.updated.map((row) => [row.key, row]));
    const kept = rows.filter((row) => !removed.has(row.key)).map((row) => updated.get(row.key) ?? row);
    const keys = new Set(kept.map((row) => row.key));
    return displayOrder([...kept, ...change.added.filter((row) => !keys.has(row.key))]);
};
const displayOrder = (rows) => {
    const keys = new Set(rows.map((row) => row.key));
    const children = new Map();
    for (const row of rows) {
        const parent = row.parentKey !== null && keys.has(row.parentKey) ? row.parentKey : null;
        children.set(parent, [...children.get(parent) ?? [], row]);
    }
    const ordered = [];
    const visit = (parentKey) => {
        for (const row of children.get(parentKey) ?? []) {
            ordered.push(row);
            visit(row.key);
        }
    };
    visit(null);
    return ordered;
};
//# sourceMappingURL=run-tree-dtos.js.map