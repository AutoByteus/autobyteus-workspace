import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUILT_IN_APPLICATION_PACKAGE_ID,
  FileApplicationBundleProvider,
} from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import {
  buildCanonicalApplicationId,
  buildCanonicalApplicationOwnedAgentId,
  buildCanonicalApplicationOwnedTeamId,
} from "../../../src/application-bundles/utils/application-bundle-identity.js";

const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

describe("FileApplicationBundleProvider", () => {
  let tempRoot: string;
  let appRoot: string;
  let appDataRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-app-bundles-"));
    appRoot = path.join(tempRoot, "app-root");
    appDataRoot = path.join(tempRoot, "app-data");
    await fs.mkdir(appRoot, { recursive: true });
    await fs.mkdir(appDataRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const buildProvider = () =>
    new FileApplicationBundleProvider(
      {
        getAppRootDir: () => appRoot,
      } as never,
      {
        getDefaultRootPath: () => appDataRoot,
        listAdditionalRootPaths: () => [],
      } as never,
      {
        listPackageRecords: async () => [],
      } as never,
    );

  const writeBundle = async (options?: {
    localApplicationId?: string;
    teamMemberRef?: string;
  }): Promise<void> => {
    const localApplicationId = options?.localApplicationId ?? "sample-app";
    const teamMemberRef = options?.teamMemberRef ?? "sample-agent";
    const bundleRoot = path.join(appRoot, "applications", localApplicationId);

    await writeFile(
      path.join(bundleRoot, "application.json"),
      JSON.stringify(
        {
          id: localApplicationId,
          name: "Sample App",
          description: "Sample description",
          ui: { entryHtml: "ui/index.html" },
          runtimeTarget: { kind: "AGENT_TEAM", localId: "sample-team" },
        },
        null,
        2,
      ),
    );
    await writeFile(
      path.join(bundleRoot, "ui", "index.html"),
      "<!doctype html><html><body>ok</body></html>\n",
    );
    await writeFile(
      path.join(bundleRoot, "agents", "sample-agent", "agent.md"),
      [
        "---",
        "name: Sample Agent",
        "description: Sample agent",
        "category: Demo",
        "role: Helper",
        "---",
        "",
        "Help the bundled application.",
      ].join("\n"),
    );
    await writeFile(
      path.join(bundleRoot, "agents", "sample-agent", "agent-config.json"),
      JSON.stringify({ defaultLaunchConfig: { runtimeKind: "autobyteus" } }, null, 2),
    );
    await writeFile(
      path.join(bundleRoot, "agent-teams", "sample-team", "team.md"),
      [
        "---",
        "name: Sample Team",
        "description: Sample team",
        "category: Demo",
        "---",
        "",
        "Coordinate the bundled sample agent.",
      ].join("\n"),
    );
    await writeFile(
      path.join(bundleRoot, "agent-teams", "sample-team", "team-config.json"),
      JSON.stringify(
        {
          coordinatorMemberName: "lead",
          members: [
            {
              memberName: "lead",
              ref: teamMemberRef,
              refType: "agent",
              refScope: "application_owned",
            },
          ],
        },
        null,
        2,
      ),
    );
  };

  it("lists valid bundles from the built-in application root", async () => {
    await writeBundle();
    const provider = buildProvider();

    const bundles = await provider.listBundles();

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      id: buildCanonicalApplicationId(BUILT_IN_APPLICATION_PACKAGE_ID, "sample-app"),
      localApplicationId: "sample-app",
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      runtimeTarget: {
        kind: "AGENT_TEAM",
        localId: "sample-team",
        definitionId: buildCanonicalApplicationOwnedTeamId(
          BUILT_IN_APPLICATION_PACKAGE_ID,
          "sample-app",
          "sample-team",
        ),
      },
      localAgentIds: ["sample-agent"],
      localTeamIds: ["sample-team"],
    });

    const [bundle] = bundles;
    expect(provider.buildApplicationOwnedAgentSources(bundle!)).toEqual([
      expect.objectContaining({
        definitionId: buildCanonicalApplicationOwnedAgentId(
          BUILT_IN_APPLICATION_PACKAGE_ID,
          "sample-app",
          "sample-agent",
        ),
        applicationId: bundle!.id,
      }),
    ]);
  });

  it("rejects bundles whose application-owned team references an agent outside the bundle", async () => {
    await writeBundle({ teamMemberRef: "missing-agent" });
    const provider = buildProvider();

    await expect(provider.listBundles()).rejects.toThrow(
      "must reference an agent inside the same application bundle",
    );
  });
});
