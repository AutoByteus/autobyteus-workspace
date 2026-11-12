import { z } from "zod";
/**
 * A run a run delegated to on this node, by what does not change while it runs (autobyteus-461 SR-055, SR-056): its
 * address, its run and agents, its delegator and when it started. The view's child row is this identity plus the
 * child's launch details, read fresh; the listed-runs poll carries the identity alone.
 */
export declare const childRunIdentityDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    agentRunId: z.ZodString;
    agentDefinitionId: z.ZodNullable<z.ZodString>;
    address: z.ZodString;
    delegatorAgentRunId: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodString;
    kind: z.ZodLiteral<"agent">;
}, z.core.$strict>, z.ZodObject<{
    teamRunId: z.ZodString;
    members: z.ZodArray<z.ZodObject<{
        address: z.ZodString;
        agentRunId: z.ZodString;
        agentDefinitionId: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    address: z.ZodString;
    delegatorAgentRunId: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodString;
    kind: z.ZodLiteral<"agent_team">;
}, z.core.$strict>], "kind">;
/** One agent of a child with its status, from the child's own run when it runs, else `offline`. */
export declare const childRunAgentStatusDtoSchema: z.ZodObject<{
    agentRunId: z.ZodString;
    memberAddress: z.ZodString;
    status: z.ZodString;
}, z.core.$strict>;
/** A listed run, by its kind and run ID. */
export declare const listedRunRefDtoSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        agent: "agent";
        agent_team: "agent_team";
        agent_org: "agent_org";
    }>;
    runId: z.ZodString;
}, z.core.$strict>;
/**
 * `runCollaborationStatuses(runs)` (autobyteus-461 SR-055): for each listed run, whether it is active and the runs it
 * delegated to on this node that its view shows (one hop, each with its agents' statuses). Never restores a run.
 */
export declare const runCollaborationStatusesDtoSchema: z.ZodArray<z.ZodObject<{
    kind: z.ZodEnum<{
        agent: "agent";
        agent_team: "agent_team";
        agent_org: "agent_org";
    }>;
    runId: z.ZodString;
    isActive: z.ZodBoolean;
    children: z.ZodArray<z.ZodObject<{
        row: z.ZodDiscriminatedUnion<[z.ZodObject<{
            agentRunId: z.ZodString;
            agentDefinitionId: z.ZodNullable<z.ZodString>;
            address: z.ZodString;
            delegatorAgentRunId: z.ZodOptional<z.ZodString>;
            startedAt: z.ZodString;
            kind: z.ZodLiteral<"agent">;
        }, z.core.$strict>, z.ZodObject<{
            teamRunId: z.ZodString;
            members: z.ZodArray<z.ZodObject<{
                address: z.ZodString;
                agentRunId: z.ZodString;
                agentDefinitionId: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            address: z.ZodString;
            delegatorAgentRunId: z.ZodOptional<z.ZodString>;
            startedAt: z.ZodString;
            kind: z.ZodLiteral<"agent_team">;
        }, z.core.$strict>], "kind">;
        statuses: z.ZodArray<z.ZodObject<{
            agentRunId: z.ZodString;
            memberAddress: z.ZodString;
            status: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>>;
/** At most this many runs per read. */
export declare const RUN_COLLABORATION_STATUSES_MAX_RUNS = 100;
export type ChildRunIdentityDto = z.infer<typeof childRunIdentityDtoSchema>;
export type ChildRunAgentStatusDto = z.infer<typeof childRunAgentStatusDtoSchema>;
export type ListedRunRefDto = z.infer<typeof listedRunRefDtoSchema>;
export type RunCollaborationStatusesDto = z.infer<typeof runCollaborationStatusesDtoSchema>;
//# sourceMappingURL=run-collaboration-statuses-dtos.d.ts.map