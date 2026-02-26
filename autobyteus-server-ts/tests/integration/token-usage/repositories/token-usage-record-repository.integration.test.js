import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SqlTokenUsageRecordRepository } from "../../../../src/token-usage/repositories/sql/token-usage-record-repository.js";
describe("SqlTokenUsageRecordRepository", () => {
    const repo = new SqlTokenUsageRecordRepository();
    it("creates usage records", async () => {
        const agentId = randomUUID();
        const record = await repo.createUsageRecord({
            agentId,
            role: "user",
            tokenCount: 100,
            cost: 0.002,
            llmModel: "sample_model",
        });
        try {
            expect(record).toBeTruthy();
            expect(record.agentId).toBe(agentId);
            expect(record.role).toBe("user");
            expect(record.tokenCount).toBe(100);
            expect(record.cost).toBe(0.002);
            expect(record.createdAt).toBeInstanceOf(Date);
            expect(record.usageRecordId).toBeTruthy();
        }
        finally {
            await repo.delete({ where: { id: record.id } });
        }
    });
    it("gets usage records by agent id", async () => {
        const agentId = randomUUID();
        const record = await repo.createUsageRecord({
            agentId,
            role: "assistant",
            tokenCount: 50,
            cost: 0.001,
            llmModel: "model_xyz",
        });
        try {
            const records = await repo.getUsageRecordsByAgentId(agentId);
            expect(records).toHaveLength(1);
            expect(records[0]?.agentId).toBe(agentId);
            expect(records[0]?.role).toBe("assistant");
            expect(records[0]?.tokenCount).toBe(50);
            expect(records[0]?.cost).toBe(0.001);
        }
        finally {
            await repo.delete({ where: { id: record.id } });
        }
    });
    it("calculates total cost in period", async () => {
        const now = Date.now();
        const startDate = new Date(now - 60 * 60 * 1000);
        const endDate = new Date(now + 60 * 60 * 1000);
        const records = await Promise.all([
            repo.createUsageRecord({
                agentId: randomUUID(),
                role: "user",
                tokenCount: 100,
                cost: 0.002,
                llmModel: "model_1",
            }),
            repo.createUsageRecord({
                agentId: randomUUID(),
                role: "assistant",
                tokenCount: 150,
                cost: 0.003,
                llmModel: "model_2",
            }),
            repo.createUsageRecord({
                agentId: randomUUID(),
                role: "user",
                tokenCount: 200,
                cost: 0.004,
                llmModel: "model_3",
            }),
        ]);
        try {
            const totalCost = await repo.getTotalCostInPeriod(startDate, endDate);
            expect(totalCost).toBeCloseTo(0.009, 6);
        }
        finally {
            await Promise.all(records.map((record) => repo.delete({ where: { id: record.id } })));
        }
    });
    it("returns empty records for unknown agent", async () => {
        const records = await repo.getUsageRecordsByAgentId("nonexistent-id");
        expect(records).toHaveLength(0);
    });
    it("returns zero cost for empty period", async () => {
        const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        const endDate = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
        const totalCost = await repo.getTotalCostInPeriod(startDate, endDate);
        expect(totalCost).toBe(0);
    });
    it("handles multiple records for the same agent", async () => {
        const agentId = randomUUID();
        const records = await Promise.all([
            repo.createUsageRecord({
                agentId,
                role: "user",
                tokenCount: 100,
                cost: 0.002,
                llmModel: "model_x",
            }),
            repo.createUsageRecord({
                agentId,
                role: "assistant",
                tokenCount: 150,
                cost: 0.003,
                llmModel: "model_y",
            }),
            repo.createUsageRecord({
                agentId,
                role: "user",
                tokenCount: 200,
                cost: 0.004,
                llmModel: "model_z",
            }),
        ]);
        const baseTime = new Date();
        await repo.update({
            where: { id: records[0].id },
            data: { createdAt: new Date(baseTime.getTime() + 1000) },
        });
        await repo.update({
            where: { id: records[1].id },
            data: { createdAt: new Date(baseTime.getTime() + 2000) },
        });
        await repo.update({
            where: { id: records[2].id },
            data: { createdAt: new Date(baseTime.getTime() + 3000) },
        });
        try {
            const retrieved = await repo.getUsageRecordsByAgentId(agentId);
            expect(retrieved).toHaveLength(3);
            expect(retrieved.map((record) => record.role)).toEqual([
                "user",
                "assistant",
                "user",
            ]);
            const totalCost = retrieved.reduce((sum, record) => sum + record.cost, 0);
            expect(totalCost).toBeCloseTo(0.009, 6);
        }
        finally {
            await Promise.all(records.map((record) => repo.delete({ where: { id: record.id } })));
        }
    });
});
