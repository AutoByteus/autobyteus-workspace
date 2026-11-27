import { z } from "zod";
/**
 * A run's tree, built once on the server (autobyteus-461 SR-082, SR-084): its own parts, then the runs it delegated at
 * every depth, each under the agent or member that delegated it, with its peer rows. Every client shows these rows and
 * opens a row through its `openTarget`; none derives anything about a run. Statuses are each run's own
 * (`/ws/run-status`); a row names the agent run IDs whose statuses it shows.
 */
export declare const runTreeRowKindSchema: z.ZodEnum<{
    agent: "agent";
    team: "team";
    team_member: "team_member";
    org_agent: "org_agent";
    org_team: "org_team";
    peer_agent: "peer_agent";
    peer_team: "peer_team";
    peer_member: "peer_member";
}>;
export type RunTreeRowKind = z.infer<typeof runTreeRowKindSchema>;
/** Where a row opens: the run and the agent to focus (a team's coordinator for a team row); a peer's run on its node. */
export declare const runTreeOpenTargetDtoSchema: z.ZodObject<{
    runKind: z.ZodEnum<{
        agent: "agent";
        agent_team: "agent_team";
        agent_org: "agent_org";
    }>;
    runId: z.ZodString;
    agentRunId: z.ZodString;
    nodeId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type RunTreeOpenTargetDto = Readonly<z.infer<typeof runTreeOpenTargetDtoSchema>>;
/** A row's launch as its run has it now, and where it came from (Settings; a peer row's from its node's answer). */
export declare const runTreeLaunchDtoSchema: z.ZodObject<{
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
}, z.core.$strict>;
export type RunTreeLaunchDto = Readonly<z.infer<typeof runTreeLaunchDtoSchema>>;
/** One row. `key` is built from identities only (kind and run ID, plus the agent run ID for a member row), never position. */
export declare const runTreeRowDtoSchema: z.ZodObject<{
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
}, z.core.$strict>;
export type RunTreeRowDto = Readonly<z.infer<typeof runTreeRowDtoSchema>>;
/** What changed since the rows a view had: rows that came (in the tree's order), keys of rows that left, rows that changed. */
export declare const runTreeChangeDtoSchema: z.ZodObject<{
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
}, z.core.$strict>;
export type RunTreeChangeDto = Readonly<z.infer<typeof runTreeChangeDtoSchema>>;
/** In an agent or org view's events: the tree changed, numbered in the view's one sequence (an empty change still counts). */
export declare const runTreeChangedEventDtoSchema: z.ZodObject<{
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
}, z.core.$strict>;
/** The `runTree(kind, runId)` answer: a listed run's tree, read when it is expanded and again on `RUN_TREE_CHANGED`. */
export declare const runTreeDtoSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        agent: "agent";
        agent_team: "agent_team";
        agent_org: "agent_org";
    }>;
    runId: z.ZodString;
    rows: z.ZodArray<z.ZodObject<{
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
}, z.core.$strict>;
export type RunTreeDto = Readonly<z.infer<typeof runTreeDtoSchema>>;
/**
 * A view's tree after a change (each view client): the rows that left are dropped, the changed rows replaced where they
 * are, and the rows that came appended; then the rows in display order (each row's children after it, siblings in the
 * order they came) with their depth as sent.
 */
type TreeRow = Readonly<{
    key: string;
    parentKey: string | null;
}>;
export declare const applyRunTreeChange: <R extends TreeRow>(rows: readonly R[], change: Readonly<{
    added: readonly R[];
    removed: readonly string[];
    updated: readonly R[];
}>) => R[];
export {};
//# sourceMappingURL=run-tree-dtos.d.ts.map