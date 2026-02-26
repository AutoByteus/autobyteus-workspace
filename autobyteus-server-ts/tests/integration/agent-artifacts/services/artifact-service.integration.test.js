import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ArtifactService } from "../../../../src/agent-artifacts/services/artifact-service.js";
import { SqlAgentArtifactRepository } from "../../../../src/agent-artifacts/repositories/sql/agent-artifact-repository.js";
describe("ArtifactService", () => {
    const repo = new SqlAgentArtifactRepository();
    it("creates artifacts", async () => {
        const service = new ArtifactService({ repository: repo });
        const runId = randomUUID();
        const created = await service.createArtifact({
            runId,
            path: "/workspace/test_file.py",
            type: "file",
        });
        try {
            expect(created).toBeTruthy();
            expect(created.id).toBeTruthy();
            expect(created.runId).toBe(runId);
            expect(created.path).toBe("/workspace/test_file.py");
            expect(created.type).toBe("file");
        }
        finally {
            if (created.id) {
                await repo.delete({ where: { id: Number(created.id) } });
            }
        }
    });
    it("retrieves artifacts by run id", async () => {
        const service = new ArtifactService({ repository: repo });
        const runId = randomUUID();
        const created = await Promise.all([
            service.createArtifact({ runId, path: "/path/a.py", type: "file" }),
            service.createArtifact({ runId, path: "/path/b.py", type: "file" }),
        ]);
        try {
            const artifacts = await service.getArtifactsByRunId(runId);
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
    it("returns empty list for unknown run id", async () => {
        const service = new ArtifactService({ repository: repo });
        const artifacts = await service.getArtifactsByRunId("non-existent-service-run");
        expect(artifacts).toHaveLength(0);
    });
});
