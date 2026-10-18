import { z } from "zod";
/**
 * The collaboration package of one standalone Agent run (root kind `agent`): its host
 * Agent and its delegated copies (task executions).
 */
export declare const agentRunCollaborationTreeDtoSchema: z.ZodObject<{
    subjectKind: z.ZodLiteral<"agent">;
    createdAt: z.ZodString;
    host: z.ZodObject<{
        address: z.ZodString;
        agentRunId: z.ZodString;
        agentDefinitionId: z.ZodString;
    }, z.core.$strict>;
    taskExecutions: z.ZodArray<z.ZodType<Readonly<{
        address: string;
        agentRunId: string;
        platformAgentRunId: string | null;
        delegatorAgentRunId?: string;
        startedAt: string;
        source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
    }> | Readonly<{
        address: string;
        teamRunId: string;
        members: readonly Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>[];
        taskExecutions: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly</*elided*/ any>)[];
        delegatorAgentRunId?: string;
        startedAt: string;
        source?: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        address: string;
        agentRunId: string;
        platformAgentRunId: string | null;
        delegatorAgentRunId?: string;
        startedAt: string;
        source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
    }> | Readonly<{
        address: string;
        teamRunId: string;
        members: readonly Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>[];
        taskExecutions: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly</*elided*/ any>)[];
        delegatorAgentRunId?: string;
        startedAt: string;
        source?: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
    }>, unknown>>>;
}, z.core.$strict>;
export declare const agentRunCollaborationCommunicationMessagesDtoSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    subjectKind: z.ZodLiteral<"agent">;
    hostRunId: z.ZodString;
    messages: z.ZodArray<z.ZodObject<{
        messageId: z.ZodString;
        senderAgentRunId: z.ZodString;
        receiverAgentRunId: z.ZodString;
        content: z.ZodString;
        messageType: z.ZodString;
        referenceFiles: z.ZodArray<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** Statuses cover the Agent root's children; the host reports on its own Agent stream. */
export declare const agentRunCollaborationViewDtoSchema: z.ZodObject<{
    base_change_sequence: z.ZodNumber;
    is_active: z.ZodBoolean;
    execution_tree: z.ZodObject<{
        subjectKind: z.ZodLiteral<"agent">;
        createdAt: z.ZodString;
        host: z.ZodObject<{
            address: z.ZodString;
            agentRunId: z.ZodString;
            agentDefinitionId: z.ZodString;
        }, z.core.$strict>;
        taskExecutions: z.ZodArray<z.ZodType<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
            source?: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
            userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
            source?: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
            userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>, unknown>>>;
    }, z.core.$strict>;
    closed_task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
    }, z.core.$strict>]>>;
    communication_messages: z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        subjectKind: z.ZodLiteral<"agent">;
        hostRunId: z.ZodString;
        messages: z.ZodArray<z.ZodObject<{
            messageId: z.ZodString;
            senderAgentRunId: z.ZodString;
            receiverAgentRunId: z.ZodString;
            content: z.ZodString;
            messageType: z.ZodString;
            referenceFiles: z.ZodArray<z.ZodString>;
            createdAt: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    agent_statuses: z.ZodArray<z.ZodObject<{
        member_address: z.ZodString;
        agent_run_id: z.ZodString;
        status: z.ZodEnum<{
            error: "error";
            offline: "offline";
            initializing: "initializing";
            idle: "idle";
            running: "running";
        }>;
        trigger: z.ZodNullable<z.ZodString>;
        tool_name: z.ZodNullable<z.ZodString>;
        error_message: z.ZodNullable<z.ZodString>;
        error_details: z.ZodNullable<z.ZodString>;
        recoverableBlock: z.ZodNullable<z.ZodObject<{
            operationId: z.ZodString;
            failureEpoch: z.ZodNumber;
            position: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"held_turn">;
                turnId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"next_turn">;
                failedTurnId: z.ZodString;
            }, z.core.$strict>], "kind">;
            state: z.ZodEnum<{
                awaiting_user: "awaiting_user";
                authorized: "authorized";
                recovering: "recovering";
            }>;
            code: z.ZodString;
            message: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    agent_input_states: z.ZodArray<z.ZodObject<{
        agent_run_id: z.ZodString;
        state: z.ZodObject<{
            run_instance_id: z.ZodString;
            revision: z.ZodNumber;
            entries: z.ZodArray<z.ZodObject<{
                sequence: z.ZodNumber;
                message_id: z.ZodNullable<z.ZodString>;
                dedupe_key: z.ZodNullable<z.ZodString>;
                turn_id: z.ZodNullable<z.ZodString>;
                state: z.ZodEnum<{
                    queued: "queued";
                    held: "held";
                    forwarded: "forwarded";
                }>;
                content: z.ZodString;
                sender_type: z.ZodEnum<{
                    user: "user";
                    agent: "agent";
                    system: "system";
                }>;
                file_attachments: z.ZodArray<z.ZodObject<{
                    uri: z.ZodString;
                    file_type: z.ZodString;
                    file_name: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
            recoverableBlock: z.ZodNullable<z.ZodObject<{
                operationId: z.ZodString;
                failureEpoch: z.ZodNumber;
                position: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"held_turn">;
                    turnId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    kind: z.ZodLiteral<"next_turn">;
                    failedTurnId: z.ZodString;
                }, z.core.$strict>], "kind">;
                state: z.ZodEnum<{
                    awaiting_user: "awaiting_user";
                    authorized: "authorized";
                    recovering: "recovering";
                }>;
                code: z.ZodString;
                message: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const agentRunCollaborationEventDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"agent_presentation">;
    member_address: z.ZodString;
    agent_run_id: z.ZodString;
    message: z.ZodType<import("@autobyteus/agent-presentation-contracts").AgentPresentationMessage, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").AgentPresentationMessage, unknown>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"agent_presentation_batch">;
    items: z.ZodArray<z.ZodObject<{
        member_address: z.ZodString;
        agent_run_id: z.ZodString;
        message: z.ZodObject<{
            type: z.ZodLiteral<"SEGMENT_CONTENT">;
            payload: z.ZodObject<{
                segment_id: z.ZodString;
                turn_id: z.ZodString;
                segment_type: z.ZodEnum<{
                    text: "text";
                    tool_call: "tool_call";
                    write_file: "write_file";
                    edit_file: "edit_file";
                    run_bash: "run_bash";
                    reasoning: "reasoning";
                    media: "media";
                }>;
                delta: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"task_execution_started">;
    host_kind: z.ZodEnum<{
        team: "team";
        root: "root";
    }>;
    host_run_id: z.ZodString;
    execution: z.ZodType<Readonly<{
        address: string;
        agentRunId: string;
        platformAgentRunId: string | null;
        delegatorAgentRunId?: string;
        startedAt: string;
        source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
    }> | Readonly<{
        address: string;
        teamRunId: string;
        members: readonly Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>[];
        taskExecutions: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly</*elided*/ any>)[];
        delegatorAgentRunId?: string;
        startedAt: string;
        source?: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        address: string;
        agentRunId: string;
        platformAgentRunId: string | null;
        delegatorAgentRunId?: string;
        startedAt: string;
        source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
    }> | Readonly<{
        address: string;
        teamRunId: string;
        members: readonly Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>[];
        taskExecutions: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source?: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly</*elided*/ any>)[];
        delegatorAgentRunId?: string;
        startedAt: string;
        source?: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
    }>, unknown>>;
}, z.core.$strict>, z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"task_executions_closed">;
    task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"task_executions_reopened">;
    task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"delegated_launch_selections_changed">;
    selections: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
        selection: z.ZodObject<{
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            selectedAt: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
        selection: z.ZodObject<{
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            selectedAt: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>]>>;
}, z.core.$strict>], "kind">;
export type AgentRunCollaborationTreeDto = Readonly<z.infer<typeof agentRunCollaborationTreeDtoSchema>>;
export type AgentRunCollaborationViewDto = Readonly<z.infer<typeof agentRunCollaborationViewDtoSchema>>;
export type AgentRunCollaborationEventDto = Readonly<z.infer<typeof agentRunCollaborationEventDtoSchema>>;
//# sourceMappingURL=agent-run-collaboration-dtos.d.ts.map