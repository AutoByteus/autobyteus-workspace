import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import { AgentPackageService } from "../../../../src/agent-packages/services/agent-package-service.js";
import { SkillSourceService } from "../../../../src/skills/services/skill-source-service.js";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
import { UpdateNotificationService } from "../../../../src/update-notifications/services/update-notification-service.js";
import { UpdateChecksCapabilityService } from "../../../../src/update-notifications/services/update-checks-capability-service.js";
import { UpdateAutomationSettingsService } from "../../../../src/update-notifications/services/update-automation-settings-service.js";

// The renderer's actual documents (gql template text, fragments inlined), run against the real
// schema, resolver and notification service over a test-owned app data directory.
const documentSource = fs.readFileSync(new URL("../../../../../autobyteus-web/graphql/updateNotifications.ts", import.meta.url), "utf8");
const templates = Object.fromEntries([...documentSource.matchAll(/export const (\w+) = gql`([\s\S]*?)`/g)]
  .map((match) => [match[1]!, match[2]!]));
const documents = Object.fromEntries(Object.entries(templates).map(([key, body]) =>
  [key, body.replace(/\$\{(\w+)\}/g, (_match, fragment: string) => templates[fragment]!)]));

const A = "a".repeat(40);
const B = "b".repeat(40);

describe("Update notifications through the renderer's GraphQL documents", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let data: string;
  const run = async (document: string, variableValues?: Record<string, unknown>) => {
    const result = await graphql({ schema, source: document, variableValues });
    expect(result.errors).toBeUndefined();
    return result.data as Record<string, any>;
  };

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    graphql = (await import(require.resolve("graphql", { paths: [typeGraphqlRoot] }))).graphql;
  });

  beforeEach(() => {
    data = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "update-notifications-graphql-")));
    fs.mkdirSync(path.join(data, "skills"), { recursive: true });
    fs.writeFileSync(path.join(data, ".env"), "");
    appConfigProvider.resetForTests();
    appConfigProvider.config.setCustomAppDataDir(data);
    for (const owner of [AgentPackageService, SkillSourceService, SkillService, UpdateNotificationService, UpdateChecksCapabilityService,
      UpdateAutomationSettingsService]) {
      owner.resetInstance();
    }
    const installDir = path.join(data, "agent-packages", "managed", "acme__agents");
    fs.mkdirSync(path.join(data, "agent-packages"), { recursive: true });
    fs.writeFileSync(path.join(data, "agent-packages", "registry.json"), JSON.stringify([{
      packageId: "github:acme/agents", rootPath: installDir, sourceKind: "GITHUB_REPOSITORY",
      source: "https://github.com/acme/agents", normalizedSource: "acme/agents", managedInstallPath: installDir,
      sourceMetadata: { github: { defaultBranch: "main", installedRevision: A, latestRevision: B,
        latestCheckedAt: "2026-10-20T09:00:00.000Z", updateStatus: "UPDATE_AVAILABLE", lastError: null } },
      createdAt: "2026-10-20T08:00:00.000Z", updatedAt: "2026-10-20T09:00:00.000Z",
    }]));
  });

  afterEach(() => {
    delete process.env.ENABLE_UPDATE_CHECKS;
    appConfigProvider.resetForTests();
    fs.rmSync(data, { recursive: true, force: true });
  });

  it("lists, marks read and refuses to clear a waiting notification", async () => {
    const listed = await run(documents.GET_UPDATE_NOTIFICATIONS!);
    expect(listed.updateNotifications).toEqual([expect.objectContaining({
      kind: "AGENT_PACKAGE", sourceId: "github:acme/agents", name: "acme/agents", repositoryUrl: "https://github.com/acme/agents",
      defaultBranch: "main", installedRevision: A, latestRevision: B, read: false, state: "WAITING", handledRevision: null,
      outcome: null, outcomeReason: null, outcomeAt: null,
    })]);

    const read = await run(documents.MARK_UPDATE_NOTIFICATIONS_READ!);
    expect(read.markUpdateNotificationsRead[0].read).toBe(true);

    const refused = await graphql({ schema, source: documents.CLEAR_UPDATE_NOTIFICATION!,
      variableValues: { kind: "AGENT_PACKAGE", sourceId: "github:acme/agents" } });
    expect(refused.errors?.[0]?.message).toBe("Only an updated notification can be cleared.");

    const stored = JSON.parse(fs.readFileSync(path.join(data, "update-notifications", "notifications.json"), "utf8"));
    expect(stored).toEqual([expect.objectContaining({ kind: "AGENT_PACKAGE", latestRevision: B, fromRevision: A, read: true })]);
  });

  it("lists package notifications while the skill source registry is unreadable (CR-001)", async () => {
    fs.mkdirSync(path.join(data, "skill-sources", "github"), { recursive: true });
    fs.writeFileSync(path.join(data, "skill-sources", "github", "registry.json"), "{not json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(SkillSourceService.getInstance().getRegistryError()).toContain("GitHub skill sources unavailable");

    const listed = await run(documents.GET_UPDATE_NOTIFICATIONS!);
    expect(listed.updateNotifications.map((entry: { kind: string; sourceId: string }) => [entry.kind, entry.sourceId]))
      .toEqual([["AGENT_PACKAGE", "github:acme/agents"]]);
    expect((await run(documents.MARK_UPDATE_NOTIFICATIONS_READ!)).markUpdateNotificationsRead[0].read).toBe(true);
    expect(warn).toHaveBeenCalledWith("UPDATE_NOTIFICATIONS_SOURCE_UNAVAILABLE:SKILL_SOURCE", expect.anything());
    warn.mockRestore();
  });

  it("reads and switches the Update checks setting (on by default)", async () => {
    expect((await run(documents.GET_UPDATE_CHECKS_CAPABILITY!)).updateChecksCapability)
      .toEqual({ enabled: true, settingKey: "ENABLE_UPDATE_CHECKS", source: "DEFAULT_ENABLED" });
    expect((await run(documents.SET_UPDATE_CHECKS_ENABLED!, { enabled: false })).setUpdateChecksEnabled)
      .toEqual({ enabled: false, settingKey: "ENABLE_UPDATE_CHECKS", source: "SERVER_SETTING" });
    expect((await run(documents.GET_UPDATE_CHECKS_CAPABILITY!)).updateChecksCapability.enabled).toBe(false);
  });

  it("reads the automation settings (defaults) and stores an interval and a switch; refuses an interval out of range", async () => {
    expect((await run(documents.GET_UPDATE_AUTOMATION_SETTINGS!)).updateAutomationSettings).toEqual({
      intervals: { agentPackages: 30, skillSources: 30, agentRuntimes: 60 },
      automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: false },
      githubWaitUntil: null,
      desktopEmbeddedNode: false,
    });
    expect((await run(documents.SET_UPDATE_CHECK_INTERVAL!, { kind: "SKILL_SOURCE", minutes: 15 })).setUpdateCheckInterval.intervals)
      .toEqual({ agentPackages: 30, skillSources: 15, agentRuntimes: 60 });
    expect((await run(documents.SET_AUTOMATIC_UPDATES!, { kind: "AGENT_PACKAGE", enabled: true })).setAutomaticUpdates.automaticUpdates)
      .toEqual({ agentPackages: true, skillSources: false, agentRuntimes: false });

    const refused = await graphql({ schema, source: documents.SET_UPDATE_CHECK_INTERVAL!, variableValues: { kind: "AGENT_PACKAGE", minutes: 14 } });
    expect(refused.errors?.[0]?.message).toBe("Enter a whole number from 15 minutes to 24 hours.");
    expect(refused.errors?.[0]?.extensions?.code).toBe("UPDATE_CHECK_INTERVAL_OUT_OF_RANGE");
    expect((await run(documents.GET_UPDATE_AUTOMATION_SETTINGS!)).updateAutomationSettings.intervals.agentPackages).toBe(30);
  });
});
