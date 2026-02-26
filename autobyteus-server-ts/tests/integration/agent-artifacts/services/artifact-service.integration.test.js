import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ArtifactService } from "../../../../src/agent-artifacts/services/artifact-service.js";
import { SqlAgentArtifactRepository } from "../../../../src/agent-artifacts/repositories/sql/agent-artifact-repository.js";
describe("ArtifactService", () => {
    const repo = new SqlAgentArtifactRepository();
    it("creates artifacts", async () => {
        const service = new ArtifactService({ repository: repo });
        const agentId = randomUUID();
        const created = await service.createArtifact({
            agentId,
            path: "/workspace/test_file.py",
            type: "file",
        });
        try {
            expect(created).toBeTruthy();
            expect(created.id).toBeTruthy();
            expect(created.agentId).toBe(agentId);
            expect(created.path).toBe("/workspace/test_file.py");
            expect(created.type).toBe("file");
        }
        finally {
            if (created.id) {
                await repo.delete({ where: { id: Number(created.id) } });
            }
        }
    });
    it("retrieves artifacts by agent id", async () => {
        const service = new ArtifactService({ repository: repo });
        const agentId = randomUUID();
        const created = await Promise.all([
            service.createArtifact({ agentId, path: "/path/a.py", type: "file" }),
            service.createArtifact({ agentId, path: "/path/b.py", type: "file" }),
        ]);
        try {
            const artifacts = await service.getArtifactsByAgentId(agentId);
            expect(artifacts.length).toBeGreaterThanOrEqual(2);
            const paths = artifacts.map((artifact) => artifact.path);
            expect(paths).toContain("/path/a.py");
            expect(paths).toContain("/path/b.py");
        }
        finally {
            const ids = created.map((artifact) => Number(artifact.id)).filter((id) => !Number.isNaN(id));
            if (ids.length) {
                await repo.deleteMany({ where: { id: { in: ids } } });
            }
        }
    });
    it("returns empty list for unknown agent id", async () => {
        const service = new ArtifactService({ repository: repo });
        const artifacts = await service.getArtifactsByAgentId("non-existent-service-agent");
        expect(artifacts).toHaveLength(0);
    });
});
