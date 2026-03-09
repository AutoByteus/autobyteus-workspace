import { requireAdminToken } from "../middleware/require-admin-token.js";
export function registerRuntimeReliabilityRoutes(app, deps) {
    const adminGuard = requireAdminToken(deps.adminToken);
    app.get("/api/runtime-reliability/v1/status", { preHandler: adminGuard }, async (_request, reply) => {
        const [inboundDeadLetters, outboundDeadLetters, inboundUnbound] = await Promise.all([
            deps.inboundInboxService.listByStatus(["DEAD_LETTER"]),
            deps.outboundOutboxService.listByStatus(["DEAD_LETTER"]),
            deps.inboundInboxService.listByStatus(["COMPLETED_UNBOUND"]),
        ]);
        return reply.code(200).send({
            runtime: deps.reliabilityStatusService.getSnapshot(),
            queue: {
                inboundDeadLetterCount: inboundDeadLetters.length,
                inboundCompletedUnboundCount: inboundUnbound.length,
                outboundDeadLetterCount: outboundDeadLetters.length,
            },
        });
    });
    app.get("/api/runtime-reliability/v1/inbound/dead-letters", { preHandler: adminGuard }, async (_request, reply) => {
        const records = await deps.inboundInboxService.listByStatus(["DEAD_LETTER"]);
        return reply.code(200).send({
            items: records,
        });
    });
    app.get("/api/runtime-reliability/v1/outbound/dead-letters", { preHandler: adminGuard }, async (_request, reply) => {
        const records = await deps.outboundOutboxService.listByStatus(["DEAD_LETTER"]);
        return reply.code(200).send({
            items: records,
        });
    });
    app.post("/api/runtime-reliability/v1/inbound/dead-letters/:recordId/replay", { preHandler: adminGuard }, async (request, reply) => {
        const recordId = request.params.recordId;
        try {
            const updated = await deps.inboundInboxService.replayFromStatus(recordId, "DEAD_LETTER");
            return reply.code(202).send({
                accepted: true,
                queue: "inbound",
                fromStatus: "DEAD_LETTER",
                toStatus: updated.status,
                recordId: updated.id,
            });
        }
        catch (error) {
            return handleReplayError(reply, error);
        }
    });
    app.post("/api/runtime-reliability/v1/inbound/completed-unbound/:recordId/replay", { preHandler: adminGuard }, async (request, reply) => {
        const recordId = request.params.recordId;
        try {
            const updated = await deps.inboundInboxService.replayFromStatus(recordId, "COMPLETED_UNBOUND");
            return reply.code(202).send({
                accepted: true,
                queue: "inbound",
                fromStatus: "COMPLETED_UNBOUND",
                toStatus: updated.status,
                recordId: updated.id,
            });
        }
        catch (error) {
            return handleReplayError(reply, error);
        }
    });
    app.post("/api/runtime-reliability/v1/outbound/dead-letters/:recordId/replay", { preHandler: adminGuard }, async (request, reply) => {
        const recordId = request.params.recordId;
        try {
            const updated = await deps.outboundOutboxService.replayFromStatus(recordId, "DEAD_LETTER");
            return reply.code(202).send({
                accepted: true,
                queue: "outbound",
                fromStatus: "DEAD_LETTER",
                toStatus: updated.status,
                recordId: updated.id,
            });
        }
        catch (error) {
            return handleReplayError(reply, error);
        }
    });
}
const handleReplayError = (reply, error) => {
    if (error instanceof Error && error.message.includes("status mismatch")) {
        return reply.code(409).send({
            code: "REPLAY_STATUS_MISMATCH",
            detail: error.message,
        });
    }
    if (error instanceof Error && error.message.includes("not found")) {
        return reply.code(404).send({
            code: "RECORD_NOT_FOUND",
            detail: error.message,
        });
    }
    return reply.code(500).send({
        code: "RUNTIME_RELIABILITY_INTERNAL_ERROR",
        detail: "Unexpected runtime reliability error.",
    });
};
//# sourceMappingURL=runtime-reliability-route.js.map