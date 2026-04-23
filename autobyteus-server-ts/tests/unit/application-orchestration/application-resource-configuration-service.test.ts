import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationResourceSlotDeclaration,
  ApplicationRuntimeResourceRef,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationResourceConfigurationService } from "../../../src/application-orchestration/services/application-resource-configuration-service.js";

const applicationId = "app-1";

const buildSlot = (
  overrides: Partial<ApplicationResourceSlotDeclaration> = {},
): ApplicationResourceSlotDeclaration => ({
  slotKey: "draftingTeam",
  name: "Drafting Team",
  allowedResourceKinds: ["AGENT_TEAM"],
  allowedResourceOwners: ["bundle", "shared"],
  required: true,
  supportedLaunchDefaults: {
    runtimeKind: true,
    llmModelIdentifier: true,
    workspaceRootPath: true,
  },
  defaultResourceRef: {
    owner: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
  },
  ...overrides,
});

describe("ApplicationResourceConfigurationService", () => {
  it("returns the manifest default resource when no persisted configuration exists", async () => {
    const service = new ApplicationResourceConfigurationService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: applicationId,
          resourceSlots: [buildSlot()],
        })),
      } as never,
      resourceResolver: {
        resolveResource: vi.fn(async (_applicationId: string, resourceRef: ApplicationRuntimeResourceRef) => ({
          name: "Brief Studio Team",
          applicationId,
          owner: resourceRef.owner,
          kind: resourceRef.kind,
          localId: resourceRef.owner === "bundle" ? resourceRef.localId : null,
          definitionId: resourceRef.owner === "shared" ? resourceRef.definitionId : "brief-studio-team",
        })),
      } as never,
      configurationStore: {
        getConfiguration: vi.fn(async () => null),
      } as never,
    });

    await expect(service.getConfiguredResource(applicationId, "draftingTeam")).resolves.toEqual({
      slotKey: "draftingTeam",
      resourceRef: {
        owner: "bundle",
        kind: "AGENT_TEAM",
        localId: "brief-studio-team",
      },
      launchDefaults: null,
    });
  });

  it("persists launch defaults while validating the effective resource selection", async () => {
    const savedConfigurations: unknown[] = [];
    const service = new ApplicationResourceConfigurationService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: applicationId,
          resourceSlots: [buildSlot()],
        })),
      } as never,
      resourceResolver: {
        resolveResource: vi.fn(async (_applicationId: string, resourceRef: ApplicationRuntimeResourceRef) => ({
          name: "Shared Writing Team",
          applicationId: null,
          owner: resourceRef.owner,
          kind: resourceRef.kind,
          localId: resourceRef.owner === "bundle" ? resourceRef.localId : null,
          definitionId: resourceRef.owner === "shared" ? resourceRef.definitionId : "bundle-team",
        })),
      } as never,
      configurationStore: {
        upsertConfiguration: vi.fn(async (_applicationId: string, record) => {
          savedConfigurations.push(record);
          return record;
        }),
      } as never,
    });

    const view = await service.upsertConfiguration(applicationId, "draftingTeam", {
      resourceRef: {
        owner: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launchDefaults: {
        llmModelIdentifier: "qwen3.5",
        workspaceRootPath: "/tmp/briefs",
      },
    });

    expect(view.configuration).toEqual({
      slotKey: "draftingTeam",
      resourceRef: {
        owner: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launchDefaults: {
        llmModelIdentifier: "qwen3.5",
        workspaceRootPath: "/tmp/briefs",
        autoExecuteTools: true,
      },
    });
    expect(savedConfigurations).toHaveLength(1);
    expect(savedConfigurations[0]).toMatchObject({
      launchDefaults: {
        llmModelIdentifier: "qwen3.5",
        workspaceRootPath: "/tmp/briefs",
        autoExecuteTools: true,
      },
    });
  });

  it("rejects unsupported launch defaults on write when the slot does not declare them", async () => {
    const service = new ApplicationResourceConfigurationService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: applicationId,
          resourceSlots: [buildSlot({
            supportedLaunchDefaults: {
              runtimeKind: true,
            },
          })],
        })),
      } as never,
      resourceResolver: {
        resolveResource: vi.fn(async () => ({})),
      } as never,
      configurationStore: {
        upsertConfiguration: vi.fn(),
      } as never,
    });

    await expect(service.upsertConfiguration(applicationId, "draftingTeam", {
      resourceRef: {
        owner: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launchDefaults: {
        llmModelIdentifier: "qwen3.5",
      },
    })).rejects.toThrow("does not support launchDefaults.llmModelIdentifier");
  });

  it("rejects stale persisted overrides that no longer satisfy the declared slot contract on read", async () => {
    const service = new ApplicationResourceConfigurationService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: applicationId,
          resourceSlots: [buildSlot()],
        })),
      } as never,
      configurationStore: {
        getConfiguration: vi.fn(async () => ({
          slotKey: "draftingTeam",
          resourceRef: {
            owner: "bundle",
            kind: "AGENT",
            localId: "wrong-agent",
          },
          launchDefaults: {
            llmModelIdentifier: "qwen3.5",
          },
          updatedAt: "2026-04-20T12:00:00.000Z",
        })),
      } as never,
    });

    await expect(service.getConfiguredResource(applicationId, "draftingTeam")).rejects.toThrow(
      "Application resource slot 'draftingTeam' has invalid persisted override: Application resource slot 'draftingTeam' does not allow resource kind 'AGENT'.",
    );
  });

  it("strips stale persisted launch defaults that the current slot contract no longer supports", async () => {
    const service = new ApplicationResourceConfigurationService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: applicationId,
          resourceSlots: [buildSlot({
            supportedLaunchDefaults: {
              runtimeKind: true,
            },
          })],
        })),
      } as never,
      resourceResolver: {
        resolveResource: vi.fn(async (_applicationId: string, resourceRef: ApplicationRuntimeResourceRef) => ({
          name: "Brief Studio Team",
          applicationId,
          owner: resourceRef.owner,
          kind: resourceRef.kind,
          localId: resourceRef.owner === "bundle" ? resourceRef.localId : null,
          definitionId: resourceRef.owner === "shared" ? resourceRef.definitionId : "brief-studio-team",
        })),
      } as never,
      configurationStore: {
        getConfiguration: vi.fn(async () => ({
          slotKey: "draftingTeam",
          resourceRef: {
            owner: "bundle",
            kind: "AGENT_TEAM",
            localId: "brief-studio-team",
          },
          launchDefaults: {
            runtimeKind: "lmstudio",
            llmModelIdentifier: "stale-model",
            workspaceRootPath: "/stale/workspace",
            autoExecuteTools: true,
          },
          updatedAt: "2026-04-20T12:00:00.000Z",
        })),
      } as never,
    });

    await expect(service.getConfiguredResource(applicationId, "draftingTeam")).resolves.toEqual({
      slotKey: "draftingTeam",
      resourceRef: {
        owner: "bundle",
        kind: "AGENT_TEAM",
        localId: "brief-studio-team",
      },
      launchDefaults: {
        runtimeKind: "lmstudio",
        autoExecuteTools: true,
      },
    });
  });

  it("rejects unresolved shared manifest defaults on read", async () => {
    const service = new ApplicationResourceConfigurationService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: applicationId,
          resourceSlots: [buildSlot({
            defaultResourceRef: {
              owner: "shared",
              kind: "AGENT_TEAM",
              definitionId: "missing-shared-team",
            },
          })],
        })),
      } as never,
      resourceResolver: {
        resolveResource: vi.fn(async () => {
          throw new Error(
            `Application runtime resource could not be resolved for application '${applicationId}'.`,
          );
        }),
      } as never,
      configurationStore: {
        listConfigurations: vi.fn(async () => []),
      } as never,
    });

    await expect(service.listConfigurations(applicationId)).rejects.toThrow(
      "Application resource slot 'draftingTeam' has invalid manifest default: Application runtime resource could not be resolved",
    );
  });

  it("rejects unsupported slot keys and resource kinds that violate the manifest declaration", async () => {
    const service = new ApplicationResourceConfigurationService({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: applicationId,
          resourceSlots: [buildSlot()],
        })),
      } as never,
      resourceResolver: {
        resolveResource: vi.fn(async () => ({})),
      } as never,
      configurationStore: {
        upsertConfiguration: vi.fn(),
      } as never,
    });

    await expect(service.getConfiguredResource(applicationId, "unknownSlot")).rejects.toThrow(
      "Application resource slot 'unknownSlot' is not declared",
    );

    await expect(service.upsertConfiguration(applicationId, "draftingTeam", {
      resourceRef: {
        owner: "bundle",
        kind: "AGENT",
        localId: "wrong-kind-agent",
      },
    })).rejects.toThrow("does not allow resource kind 'AGENT'");
  });
});
