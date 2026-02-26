import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SqlAgentArtifactRepository } from "../../../../src/agent-artifacts/repositories/sql/agent-artifact-repository.js";
describe("SqlAgentArtifactRepository", () => {
    const repo = new SqlAgentArtifactRepository();
    it("creates and finds artifacts by id", async () => {
        const agentId = randomUUID();
        const created = await repo.createArtifact({
            agentId,
            path: "/path/to/test_file.py",
            type: "file",
        });
        try {
            expect(created.id).toBeTruthy();
            expect(created.agentId).toBe(agentId);
            expect(created.path).toBe("/path/to/test_file.py");
            expect(created.type).toBe("file");
            const found = await repo.findById(created.id);
            expect(found).not.toBeNull();
            expect(found?.id).toBe(created.id);
            expect(found?.path).toBe("/path/to/test_file.py");
        }
        finally {
            await repo.delete({ where: { id: created.id } });
        }
    });
    it("retrieves artifacts by agent id", async () => {
        const agentId = randomUUID();
        const created = await Promise.all([
            repo.createArtifact({ agentId, path: "/path/to/file1.py", type: "file" }),
            repo.createArtifact({ agentId, path: "/path/to/file2.py", type: "file" }),
        ]);
        try {
            const artifacts = await repo.getByAgentId(agentId);
            expect(artifacts.length).toBeGreaterThanOrEqual(2);
            const paths = artifacts.map((artifact) => artifact.path);
            expect(paths).toContain("/path/to/file1.py");
            expect(paths).toContain("/path/to/file2.py");
        }
        finally {
            await repo.deleteMany({ where: { id: { in: created.map((record) => record.id) } } });
        }
    });
    it("returns empty list for unknown agent id", async () => {
        const artifacts = await repo.getByAgentId("non-existent-agent-id");
        expect(artifacts).toHaveLength(0);
    });
});
