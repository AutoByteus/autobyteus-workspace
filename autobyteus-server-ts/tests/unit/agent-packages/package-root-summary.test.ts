import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPackageSummary,
  validatePackageRoot,
} from "../../../src/agent-packages/utils/package-root-summary.js";

describe("package-root-summary", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  it("validates package roots and counts shared agents, team-local agents, and teams", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-summary-"));
    cleanupPaths.add(rootPath);

    await fs.mkdir(path.join(rootPath, "agents", "shared-agent"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(rootPath, "agents", "shared-agent", "agent.md"),
      "agent",
      "utf-8",
    );

    await fs.mkdir(path.join(rootPath, "agent-teams", "demo-team"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(rootPath, "agent-teams", "demo-team", "team.md"),
      "team",
      "utf-8",
    );
    await fs.mkdir(
      path.join(rootPath, "agent-teams", "demo-team", "agents", "local-agent"),
      { recursive: true },
    );
    await fs.writeFile(
      path.join(
        rootPath,
        "agent-teams",
        "demo-team",
        "agents",
        "local-agent",
        "agent.md",
      ),
      "agent",
      "utf-8",
    );

    expect(validatePackageRoot(rootPath)).toBe(rootPath);
    expect(buildPackageSummary(rootPath)).toEqual({
      sharedAgentCount: 1,
      teamLocalAgentCount: 1,
      agentTeamCount: 1,
    });
  });

  it("rejects directories that do not contain package content", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-empty-"));
    cleanupPaths.add(rootPath);

    expect(() => validatePackageRoot(rootPath)).toThrow(/agents|agent-teams/i);
  });
});
