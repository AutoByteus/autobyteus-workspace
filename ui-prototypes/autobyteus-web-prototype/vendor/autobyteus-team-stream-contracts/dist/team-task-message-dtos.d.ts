import { z } from "zod";
export declare const taskExecutionReferenceDtoSchema: z.ZodUnion<readonly [z.ZodObject<{
    agent_run_id: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    team_run_id: z.ZodString;
}, z.core.$strict>]>;
export declare const taskDelegationRecordDtoSchema: z.ZodObject<{
    task_id: z.ZodString;
    delegator_agent_run_id: z.ZodString;
    recipient_address: z.ZodString;
    task_execution: z.ZodUnion<readonly [z.ZodObject<{
        agent_run_id: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        team_run_id: z.ZodString;
    }, z.core.$strict>]>;
    description: z.ZodString;
    reference_files: z.ZodArray<z.ZodObject<{
        reference_id: z.ZodString;
        path: z.ZodString;
        type: z.ZodEnum<{
            file: "file";
            image: "image";
            audio: "audio";
            video: "video";
            pdf: "pdf";
            csv: "csv";
            excel: "excel";
            other: "other";
        }>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strict>>;
    status: z.ZodEnum<{
        interrupted: "interrupted";
        accepted: "accepted";
        active: "active";
        awaiting_review: "awaiting_review";
    }>;
    updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"submission">;
        submission_id: z.ZodString;
        message: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        created_at: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"review">;
        review_id: z.ZodString;
        reviewed_submission_id: z.ZodString;
        decision: z.ZodEnum<{
            accept: "accept";
            request_revision: "request_revision";
        }>;
        comment: z.ZodNullable<z.ZodString>;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        created_at: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"interruption">;
        interruption_id: z.ZodString;
        reason: z.ZodString;
        created_at: z.ZodString;
    }, z.core.$strict>], "kind">>;
    created_at: z.ZodString;
}, z.core.$strict>;
export declare const teamTaskDelegationPayloadSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    event_type: z.ZodLiteral<"TASK_AGENT_ACTIVATED">;
    change_sequence: z.ZodNumber;
    parent_team_run_id: z.ZodString;
    execution: z.ZodType<Readonly<{
        kind: "task_agent";
        address: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
        started_at: string;
        settled_at: string | null;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        kind: "task_agent";
        address: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
        started_at: string;
        settled_at: string | null;
    }>, unknown>>;
    task: z.ZodObject<{
        task_id: z.ZodString;
        delegator_agent_run_id: z.ZodString;
        recipient_address: z.ZodString;
        task_execution: z.ZodUnion<readonly [z.ZodObject<{
            agent_run_id: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            team_run_id: z.ZodString;
        }, z.core.$strict>]>;
        description: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        status: z.ZodEnum<{
            interrupted: "interrupted";
            accepted: "accepted";
            active: "active";
            awaiting_review: "awaiting_review";
        }>;
        updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"submission">;
            submission_id: z.ZodString;
            message: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"review">;
            review_id: z.ZodString;
            reviewed_submission_id: z.ZodString;
            decision: z.ZodEnum<{
                accept: "accept";
                request_revision: "request_revision";
            }>;
            comment: z.ZodNullable<z.ZodString>;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"interruption">;
            interruption_id: z.ZodString;
            reason: z.ZodString;
            created_at: z.ZodString;
        }, z.core.$strict>], "kind">>;
        created_at: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    event_type: z.ZodLiteral<"TASK_TEAM_ACTIVATED">;
    change_sequence: z.ZodNumber;
    parent_team_run_id: z.ZodString;
    execution: z.ZodType<Readonly<{
        kind: "task_team";
        address: string;
        team_run_id: string;
        members: readonly import("./team-execution-view-dtos.js").TaskTeamMemberExecutionDto[];
        task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
        started_at: string;
        settled_at: string | null;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        kind: "task_team";
        address: string;
        team_run_id: string;
        members: readonly import("./team-execution-view-dtos.js").TaskTeamMemberExecutionDto[];
        task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
        started_at: string;
        settled_at: string | null;
    }>, unknown>>;
    task: z.ZodObject<{
        task_id: z.ZodString;
        delegator_agent_run_id: z.ZodString;
        recipient_address: z.ZodString;
        task_execution: z.ZodUnion<readonly [z.ZodObject<{
            agent_run_id: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            team_run_id: z.ZodString;
        }, z.core.$strict>]>;
        description: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        status: z.ZodEnum<{
            interrupted: "interrupted";
            accepted: "accepted";
            active: "active";
            awaiting_review: "awaiting_review";
        }>;
        updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"submission">;
            submission_id: z.ZodString;
            message: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"review">;
            review_id: z.ZodString;
            reviewed_submission_id: z.ZodString;
            decision: z.ZodEnum<{
                accept: "accept";
                request_revision: "request_revision";
            }>;
            comment: z.ZodNullable<z.ZodString>;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"interruption">;
            interruption_id: z.ZodString;
            reason: z.ZodString;
            created_at: z.ZodString;
        }, z.core.$strict>], "kind">>;
        created_at: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    event_type: z.ZodLiteral<"TASK_EXECUTION_SETTLED">;
    change_sequence: z.ZodNumber;
    execution: z.ZodUnion<readonly [z.ZodObject<{
        agent_run_id: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        team_run_id: z.ZodString;
    }, z.core.$strict>]>;
    task: z.ZodObject<{
        task_id: z.ZodString;
        delegator_agent_run_id: z.ZodString;
        recipient_address: z.ZodString;
        task_execution: z.ZodUnion<readonly [z.ZodObject<{
            agent_run_id: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            team_run_id: z.ZodString;
        }, z.core.$strict>]>;
        description: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        status: z.ZodEnum<{
            interrupted: "interrupted";
            accepted: "accepted";
            active: "active";
            awaiting_review: "awaiting_review";
        }>;
        updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"submission">;
            submission_id: z.ZodString;
            message: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"review">;
            review_id: z.ZodString;
            reviewed_submission_id: z.ZodString;
            decision: z.ZodEnum<{
                accept: "accept";
                request_revision: "request_revision";
            }>;
            comment: z.ZodNullable<z.ZodString>;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"interruption">;
            interruption_id: z.ZodString;
            reason: z.ZodString;
            created_at: z.ZodString;
        }, z.core.$strict>], "kind">>;
        created_at: z.ZodString;
    }, z.core.$strict>;
    settled_at: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    event_type: z.ZodLiteral<"TASK_CHANGED">;
    change_sequence: z.ZodNumber;
    task: z.ZodObject<{
        task_id: z.ZodString;
        delegator_agent_run_id: z.ZodString;
        recipient_address: z.ZodString;
        task_execution: z.ZodUnion<readonly [z.ZodObject<{
            agent_run_id: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            team_run_id: z.ZodString;
        }, z.core.$strict>]>;
        description: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        status: z.ZodEnum<{
            interrupted: "interrupted";
            accepted: "accepted";
            active: "active";
            awaiting_review: "awaiting_review";
        }>;
        updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"submission">;
            submission_id: z.ZodString;
            message: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"review">;
            review_id: z.ZodString;
            reviewed_submission_id: z.ZodString;
            decision: z.ZodEnum<{
                accept: "accept";
                request_revision: "request_revision";
            }>;
            comment: z.ZodNullable<z.ZodString>;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"interruption">;
            interruption_id: z.ZodString;
            reason: z.ZodString;
            created_at: z.ZodString;
        }, z.core.$strict>], "kind">>;
        created_at: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "event_type">;
export type TaskExecutionReferenceDto = Readonly<z.infer<typeof taskExecutionReferenceDtoSchema>>;
export type TaskDelegationRecordDto = Readonly<z.infer<typeof taskDelegationRecordDtoSchema>>;
export type TeamTaskDelegationPayload = Readonly<z.infer<typeof teamTaskDelegationPayloadSchema>>;
//# sourceMappingURL=team-task-message-dtos.d.ts.map