import { z } from "zod";
/**
 * The collaboration package of one standalone Agent run (root kind `agent`): its own agent. The runs it delegated are
 * its tree's rows (`RUN_TREE_SNAPSHOT`, autobyteus-461 SR-084).
 */
export declare const agentRunCollaborationTreeDtoSchema: z.ZodObject<{
    subjectKind: z.ZodLiteral<"agent">;
    createdAt: z.ZodString;
    agent: z.ZodObject<{
        address: z.ZodString;
        agentRunId: z.ZodString;
        agentDefinitionId: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
/** The run's view; its agent reports on its own Agent stream, its delegated runs on `/ws/run-status` (SR-083). */
export declare const agentRunCollaborationViewDtoSchema: z.ZodObject<{
    base_change_sequence: z.ZodNumber;
    live_sequence_id: z.ZodNullable<z.ZodString>;
    last_message_change_sequence: z.ZodNullable<z.ZodNumber>;
    is_active: z.ZodBoolean;
    execution_tree: z.ZodObject<{
        subjectKind: z.ZodLiteral<"agent">;
        createdAt: z.ZodString;
        agent: z.ZodObject<{
            address: z.ZodString;
            agentRunId: z.ZodString;
            agentDefinitionId: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>;
/**
 * One agent of a live message as its commit knew it (autobyteus-565): its run ID, its address in its own run when known,
 * and, for an agent on another node, the name the receiving node gives that node.
 */
export declare const messagePartyDtoSchema: z.ZodObject<{
    agentRunId: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
    nodeName: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
/**
 * The Agent root view's events: its messages and its tree's changes. Its agent presents on its own Agent stream, and each
 * run it delegated on its own (rule 2; a peer's run through `/ws/peer-run`, SR-086 G-D1). A message comes with its two
 * parties, so the view names a counterpart it does not know yet (another run, another node; autobyteus-565).
 */
export declare const agentRunCollaborationEventDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"communication">;
    message: z.ZodObject<{
        messageId: z.ZodString;
        senderAgentRunId: z.ZodString;
        receiverAgentRunId: z.ZodString;
        content: z.ZodString;
        messageType: z.ZodString;
        referenceFiles: z.ZodArray<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strict>;
    parties: z.ZodObject<{
        sender: z.ZodObject<{
            agentRunId: z.ZodString;
            address: z.ZodNullable<z.ZodString>;
            nodeName: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        receiver: z.ZodObject<{
            agentRunId: z.ZodString;
            address: z.ZodNullable<z.ZodString>;
            nodeName: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    added: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        parentKey: z.ZodNullable<z.ZodString>;
        depth: z.ZodNumber;
        kind: z.ZodEnum<{
            agent: "agent";
            team: "team";
            team_member: "team_member";
            org_agent: "org_agent";
            org_team: "org_team";
            peer_agent: "peer_agent";
            peer_team: "peer_team";
            peer_member: "peer_member";
        }>;
        name: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        openTarget: z.ZodNullable<z.ZodObject<{
            runKind: z.ZodEnum<{
                agent: "agent";
                agent_team: "agent_team";
                agent_org: "agent_org";
            }>;
            runId: z.ZodString;
            agentRunId: z.ZodString;
            nodeId: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        statusIds: z.ZodArray<z.ZodString>;
        launch: z.ZodOptional<z.ZodObject<{
            runtimeKind: z.ZodString;
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            autoExecuteTools: z.ZodNullable<z.ZodBoolean>;
            workspaceRootPath: z.ZodNullable<z.ZodString>;
            source: z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
                origin: z.ZodEnum<{
                    agent_default: "agent_default";
                    team_default: "team_default";
                    agent_history: "agent_history";
                    inherited: "inherited";
                    configured: "configured";
                    settings: "settings";
                }>;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtimeKind: z.ZodNullable<z.ZodString>;
                    llmModelIdentifier: z.ZodNullable<z.ZodString>;
                    reason: z.ZodEnum<{
                        incomplete: "incomplete";
                        runtime_unavailable: "runtime_unavailable";
                        signed_out: "signed_out";
                        model_unavailable: "model_unavailable";
                        blocked: "blocked";
                        model_settings_invalid: "model_settings_invalid";
                        router_not_active: "router_not_active";
                        router_failed: "router_failed";
                    }>;
                    detail: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>, z.ZodObject<{
                origin: z.ZodLiteral<"model_router">;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtimeKind: z.ZodNullable<z.ZodString>;
                    llmModelIdentifier: z.ZodNullable<z.ZodString>;
                    reason: z.ZodEnum<{
                        incomplete: "incomplete";
                        runtime_unavailable: "runtime_unavailable";
                        signed_out: "signed_out";
                        model_unavailable: "model_unavailable";
                        blocked: "blocked";
                        model_settings_invalid: "model_settings_invalid";
                        router_not_active: "router_not_active";
                        router_failed: "router_failed";
                    }>;
                    detail: z.ZodString;
                }, z.core.$strict>>;
                choiceReason: z.ZodString;
                taskKind: z.ZodString;
            }, z.core.$strict>]>>;
            ownSource: z.ZodBoolean;
        }, z.core.$strict>>;
        peer: z.ZodOptional<z.ZodObject<{
            nodeId: z.ZodString;
            nodeName: z.ZodString;
            title: z.ZodNullable<z.ZodString>;
            reachable: z.ZodNullable<z.ZodBoolean>;
        }, z.core.$strict>>;
        leaving: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strict>>;
    removed: z.ZodArray<z.ZodString>;
    updated: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        parentKey: z.ZodNullable<z.ZodString>;
        depth: z.ZodNumber;
        kind: z.ZodEnum<{
            agent: "agent";
            team: "team";
            team_member: "team_member";
            org_agent: "org_agent";
            org_team: "org_team";
            peer_agent: "peer_agent";
            peer_team: "peer_team";
            peer_member: "peer_member";
        }>;
        name: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        openTarget: z.ZodNullable<z.ZodObject<{
            runKind: z.ZodEnum<{
                agent: "agent";
                agent_team: "agent_team";
                agent_org: "agent_org";
            }>;
            runId: z.ZodString;
            agentRunId: z.ZodString;
            nodeId: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        statusIds: z.ZodArray<z.ZodString>;
        launch: z.ZodOptional<z.ZodObject<{
            runtimeKind: z.ZodString;
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            autoExecuteTools: z.ZodNullable<z.ZodBoolean>;
            workspaceRootPath: z.ZodNullable<z.ZodString>;
            source: z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
                origin: z.ZodEnum<{
                    agent_default: "agent_default";
                    team_default: "team_default";
                    agent_history: "agent_history";
                    inherited: "inherited";
                    configured: "configured";
                    settings: "settings";
                }>;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtimeKind: z.ZodNullable<z.ZodString>;
                    llmModelIdentifier: z.ZodNullable<z.ZodString>;
                    reason: z.ZodEnum<{
                        incomplete: "incomplete";
                        runtime_unavailable: "runtime_unavailable";
                        signed_out: "signed_out";
                        model_unavailable: "model_unavailable";
                        blocked: "blocked";
                        model_settings_invalid: "model_settings_invalid";
                        router_not_active: "router_not_active";
                        router_failed: "router_failed";
                    }>;
                    detail: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>, z.ZodObject<{
                origin: z.ZodLiteral<"model_router">;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtimeKind: z.ZodNullable<z.ZodString>;
                    llmModelIdentifier: z.ZodNullable<z.ZodString>;
                    reason: z.ZodEnum<{
                        incomplete: "incomplete";
                        runtime_unavailable: "runtime_unavailable";
                        signed_out: "signed_out";
                        model_unavailable: "model_unavailable";
                        blocked: "blocked";
                        model_settings_invalid: "model_settings_invalid";
                        router_not_active: "router_not_active";
                        router_failed: "router_failed";
                    }>;
                    detail: z.ZodString;
                }, z.core.$strict>>;
                choiceReason: z.ZodString;
                taskKind: z.ZodString;
            }, z.core.$strict>]>>;
            ownSource: z.ZodBoolean;
        }, z.core.$strict>>;
        peer: z.ZodOptional<z.ZodObject<{
            nodeId: z.ZodString;
            nodeName: z.ZodString;
            title: z.ZodNullable<z.ZodString>;
            reachable: z.ZodNullable<z.ZodBoolean>;
        }, z.core.$strict>>;
        leaving: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strict>>;
    kind: z.ZodLiteral<"run_tree_changed">;
}, z.core.$strict>], "kind">;
export type AgentRunCollaborationTreeDto = Readonly<z.infer<typeof agentRunCollaborationTreeDtoSchema>>;
export type AgentRunCollaborationViewDto = Readonly<z.infer<typeof agentRunCollaborationViewDtoSchema>>;
export type AgentRunCollaborationEventDto = Readonly<z.infer<typeof agentRunCollaborationEventDtoSchema>>;
export type MessagePartyDto = Readonly<z.infer<typeof messagePartyDtoSchema>>;
//# sourceMappingURL=agent-run-collaboration-dtos.d.ts.map