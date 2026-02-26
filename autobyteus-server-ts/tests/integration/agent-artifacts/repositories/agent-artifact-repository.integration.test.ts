import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SqlAgentArtifactRepository } from "../../../../src/agent-artifacts/repositories/sql/agent-artifact-repository.js";

describe("SqlAgentArtifactRepository", () => {
  const repo = new SqlAgentArtifactRepository();

  it("creates and finds artifacts by id", async () => {
    const runId = randomUUID();
    const created = await repo.createArtifact({
      runId,
      path: "/path/to/test_file.py",
      type: "file",
    });

    try {
      expect(created.id).toBeTruthy();
      expect(created.runId).toBe(runId);
      expect(created.path).toBe("/path/to/test_file.py");
      expect(created.type).toBe("file");

      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.path).toBe("/path/to/test_file.py");
    } finally {
      await repo.delete({ where: { id: created.id } });
    }
  });

  it("retrieves artifacts by run id", async () => {
    const runId = randomUUID();
    const created = await Promise.all([
      repo.createArtifact({ runId, path: "/path/to/file1.py", type: "file" }),
      repo.createArtifact({ runId, path: "/path/to/file2.py", type: "file" }),
    ]);

    try {
      const artifacts = await repo.getByRunId(runId);
      expect(artifacts.length).toBeGreaterThanOrEqual(2);
      const paths = artifacts.map((artifact) => artifact.path);
      expect(paths).toContain("/path/to/file1.py");
      expect(paths).toContain("/path/to/file2.py");
    } finally {
      await repo.deleteMany({ where: { id: { in: created.map((record) => record.id) } } });
    }
  });

  it("returns empty list for unknown run id", async () => {
    const artifacts = await repo.getByRunId("non-existent-run-id");
    expect(artifacts).toHaveLength(0);
  });
});
