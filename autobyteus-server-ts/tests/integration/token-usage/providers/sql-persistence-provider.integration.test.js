import { describe, expect, it } from "vitest";
import { SqlPersistenceProvider } from "../../../../src/token-usage/providers/sql-persistence-provider.js";
import { SqlTokenUsageRecordRepository } from "../../../../src/token-usage/repositories/sql/token-usage-record-repository.js";
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
describe("SqlPersistenceProvider (TokenUsage)", () => {
    const provider = new SqlPersistenceProvider();
    const repo = new SqlTokenUsageRecordRepository();
    it("creates token usage records", async () => {
        const record = await provider.createTokenUsageRecord("sql_test_agent_id", "assistant", 50, 0.002, "sql_test_model");
        try {
            expect(record.agentId).toBe("sql_test_agent_id");
            expect(record.role).toBe("assistant");
            expect(record.tokenCount).toBe(50);
            expect(record.cost).toBe(0.002);
            expect(record.createdAt).toBeInstanceOf(Date);
            expect(record.llmModel).toBe("sql_test_model");
            expect(record.tokenUsageRecordId).toBeTruthy();
            expect(uuidRegex.test(record.tokenUsageRecordId ?? "")).toBe(true);
        }
        finally {
            await repo.deleteMany({
                where: { usageRecordId: record.tokenUsageRecordId ?? undefined },
            });
        }
    });
    it("gets usage records in period without model filter", async () => {
        const now = Date.now();
        const start = new Date(now - 24 * 60 * 60 * 1000);
        const end = new Date(now + 24 * 60 * 60 * 1000);
        const record1 = await provider.createTokenUsageRecord("agent_a", "user", 10, 0.001);
        const record2 = await provider.createTokenUsageRecord("agent_b", "assistant", 20, 0.002);
        try {
            const records = await provider.getUsageRecordsInPeriod(start, end);
            const agentIds = new Set(records.map((record) => record.agentId));
            expect(agentIds.has(record1.agentId)).toBe(true);
            expect(agentIds.has(record2.agentId)).toBe(true);
        }
        finally {
            await repo.deleteMany({
                where: { usageRecordId: { in: [record1.tokenUsageRecordId, record2.tokenUsageRecordId] } },
            });
        }
    });
    it("gets usage records in period filtered by model", async () => {
        const now = Date.now();
        const start = new Date(now - 24 * 60 * 60 * 1000);
        const end = new Date(now + 24 * 60 * 60 * 1000);
        const recordA = await provider.createTokenUsageRecord("agent_c", "user", 30, 0.003, "modelSQLA");
        const recordB = await provider.createTokenUsageRecord("agent_d", "assistant", 40, 0.004, "modelSQLB");
        try {
            const filtered = await provider.getUsageRecordsInPeriod(start, end, "modelSQLA");
            expect(filtered.length).toBeGreaterThan(0);
            expect(filtered[0]?.llmModel).toBe("modelSQLA");
            expect(filtered[0]?.agentId).toBe(recordA.agentId);
        }
        finally {
            await repo.deleteMany({
                where: { usageRecordId: { in: [recordA.tokenUsageRecordId, recordB.tokenUsageRecordId] } },
            });
        }
    });
    it("returns empty when no records match", async () => {
        const now = Date.now();
        const start = new Date(now - 10 * 24 * 60 * 60 * 1000);
        const end = new Date(now - 9 * 24 * 60 * 60 * 1000);
        const record = await provider.createTokenUsageRecord("agent_e", "assistant", 50, 0.005, "modelSQLX");
        try {
            const records = await provider.getUsageRecordsInPeriod(start, end);
            expect(records).toHaveLength(0);
        }
        finally {
            await repo.deleteMany({
                where: { usageRecordId: record.tokenUsageRecordId ?? undefined },
            });
        }
    });
    it("calculates total cost in period", async () => {
        const now = Date.now();
        const start = new Date(now - 24 * 60 * 60 * 1000);
        const end = new Date(now + 24 * 60 * 60 * 1000);
        const record1 = await provider.createTokenUsageRecord("agent_f", "user", 10, 0.001, "modelSQL7");
        const record2 = await provider.createTokenUsageRecord("agent_g", "assistant", 20, 0.002, "modelSQL8");
        try {
            const totalCost = await provider.getTotalCostInPeriod(start, end);
            expect(totalCost).toBeGreaterThan(0);
            const oldStart = new Date(now - 10 * 24 * 60 * 60 * 1000);
            const oldEnd = new Date(now - 9 * 24 * 60 * 60 * 1000);
            const totalCostOlder = await provider.getTotalCostInPeriod(oldStart, oldEnd);
            expect(totalCostOlder).toBe(0);
        }
        finally {
            await repo.deleteMany({
                where: { usageRecordId: { in: [record1.tokenUsageRecordId, record2.tokenUsageRecordId] } },
            });
        }
    });
});
