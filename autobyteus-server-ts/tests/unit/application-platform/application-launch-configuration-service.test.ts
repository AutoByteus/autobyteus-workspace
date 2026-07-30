import type {
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationResolvedResourceLaunchBaseline,
} from "@autobyteus/application-sdk-contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationLaunchConfigurationService,
} from "../../../src/application-platform/launch-configuration/application-launch-configuration-service.js";
import {
  ApplicationLaunchConfigurationError,
} from "../../../src/application-platform/launch-configuration/application-launch-configuration-diagnostics.js";
import {
  ApplicationLaunchResourceBaselineError,
} from "../../../src/application-platform/launch-configuration/application-launch-resource-baseline-builder.js";
import type {
  StoredApplicationLaunchOverride,
} from "../../../src/application-orchestration/stores/application-launch-override-store.js";

const applicationId = "brief-app";
const packageRef = {
  source: "bundle",
  kind: "AGENT_TEAM",
  localId: "brief-team",
} as const;
const alternateRef = {
  source: "shared",
  kind: "AGENT_TEAM",
  definitionId: "alternate-team",
} as const;

const slot: ApplicationExecutionResourceSlotDeclaration = {
  slotKey: "draftingTeam",
  name: "Drafting Team",
  allowedExecutionResourceKinds: ["AGENT_TEAM"],
  allowedExecutionResourceSources: ["bundle", "shared"],
  required: true,
  supportedLaunchConfig: {
    AGENT_TEAM: {
      runtimeKind: true,
      llmModelIdentifier: true,
      llmConfig: true,
      workspaceRootPath: true,
      memberOverrides: {
        runtimeKind: true,
        llmModelIdentifier: true,
        llmConfig: true,
      },
    },
  },
  defaultExecutionResourceRef: packageRef,
};

const resourceKey = (ref: ApplicationExecutionResourceRef): string => (
  ref.source === "bundle" ? `bundle:${ref.localId}` : `shared:${ref.definitionId}`
);

const buildBaseline = (input: {
  ref: ApplicationExecutionResourceRef;
  definitionId: string;
  provenance: "PACKAGE" | "SELECTED_RESOURCE";
  writerDefinitionId?: string;
}): ApplicationResolvedResourceLaunchBaseline => {
  const sourceKind = input.provenance === "PACKAGE"
    ? "PACKAGE_AGENT_DEFAULT"
    : "SELECTED_RESOURCE_AGENT_DEFAULT";
  const leaf = (
    memberRouteKey: string,
    agentDefinitionId: string,
    runtimeKind: string,
    llmModelIdentifier: string,
  ) => ({
    memberRouteKey,
    memberName: memberRouteKey,
    agentDefinitionId,
    runtimeKind,
    llmModelIdentifier,
    llmConfig: { reasoning_effort: "high" },
    provenance: {
      runtimeKind: { kind: sourceKind, agentDefinitionId } as const,
      llmModelIdentifier: { kind: sourceKind, agentDefinitionId } as const,
      llmConfig: { kind: sourceKind, agentDefinitionId } as const,
    },
  });
  return {
    slotKey: slot.slotKey,
    executionResourceRef: structuredClone(input.ref),
    resourceDefinitionId: input.definitionId,
    resourceKind: "AGENT_TEAM",
    leaves: input.provenance === "PACKAGE"
      ? [
          leaf("researcher", "package-researcher", "codex_app_server", "gpt-5.6-luna"),
          leaf("writer", "package-writer", "codex_app_server", "gpt-5.6-luna"),
        ]
      : [
          leaf("researcher", "alternate-researcher", "codex_app_server", "gpt-5.6-luna"),
          leaf(
            "writer",
            input.writerDefinitionId ?? "alternate-writer",
            "claude_agent_sdk",
            "claude-sonnet",
          ),
        ],
  };
};

const packageBaseline = () => buildBaseline({
  ref: packageRef,
  definitionId: "package-team-definition",
  provenance: "PACKAGE",
});
const alternateBaseline = (writerDefinitionId?: string) => buildBaseline({
  ref: alternateRef,
  definitionId: "alternate-team",
  provenance: "SELECTED_RESOURCE",
  writerDefinitionId,
});

const createHarness = (input: {
  buildBaseline?: (
    ref: ApplicationExecutionResourceRef,
    provenance: "PACKAGE" | "SELECTED_RESOURCE",
  ) => ApplicationResolvedResourceLaunchBaseline | Promise<ApplicationResolvedResourceLaunchBaseline>;
  initialStored?: StoredApplicationLaunchOverride | null;
} = {}) => {
  let stored = input.initialStored ? structuredClone(input.initialStored) : null;
  const listOverrides = vi.fn(async () => stored ? [structuredClone(stored)] : []);
  const upsertOverride = vi.fn(async (
    _applicationId: string,
    next: StoredApplicationLaunchOverride,
  ) => {
    stored = structuredClone(next);
    return structuredClone(next);
  });
  const removeOverride = vi.fn(async () => {
    stored = null;
  });
  const build = vi.fn(async (request: {
    executionResourceRef: ApplicationExecutionResourceRef;
    provenance: "PACKAGE" | "SELECTED_RESOURCE";
  }) => {
    if (input.buildBaseline) {
      return input.buildBaseline(request.executionResourceRef, request.provenance);
    }
    return resourceKey(request.executionResourceRef) === resourceKey(packageRef)
      ? packageBaseline()
      : alternateBaseline();
  });
  const validate = vi.fn(async () => []);
  const service = new ApplicationLaunchConfigurationService({
    applicationBundleService: {
      getApplicationById: vi.fn(async () => ({
        id: applicationId,
        executionResourceSlots: [slot],
      })),
    } as never,
    overrideStore: {
      listOverrides,
      upsertOverride,
      removeOverride,
    } as never,
    baselineBuilder: { build } as never,
    hostCapabilityValidator: { validate } as never,
    resolveWorkspaceRootPath: () => "/runtime/brief-app",
  });
  return {
    service,
    build,
    validate,
    listOverrides,
    upsertOverride,
    removeOverride,
    getStored: () => stored ? structuredClone(stored) : null,
  };
};

const memberIdentityOnly = (
  baseline: ApplicationResolvedResourceLaunchBaseline,
) => baseline.leaves.map((leaf) => ({
  memberRouteKey: leaf.memberRouteKey!,
  memberName: leaf.memberName,
  agentDefinitionId: leaf.agentDefinitionId,
}));

describe("ApplicationLaunchConfigurationService selected-resource authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps package, selected, saved, and effective meanings distinct with exact provenance", async () => {
    const harness = createHarness();

    const view = await harness.service.getApplicationLaunchConfigurationView(applicationId);

    expect(view.readiness).toEqual({ status: "RUNNABLE", issues: [] });
    expect(view.slots).toHaveLength(1);
    const row = view.slots[0]!;
    expect(row.packageBaseline).toEqual(packageBaseline());
    expect(row.selectedResourceBaseline).toEqual(packageBaseline());
    expect(row.savedOverride).toBeNull();
    expect(row.savedOverrideState).toBe("ABSENT");
    expect(row.effectiveConfiguration?.leaves).toEqual([
      expect.objectContaining({
        memberRouteKey: "researcher",
        runtimeKind: "codex_app_server",
        llmModelIdentifier: "gpt-5.6-luna",
        workspaceRootPath: "/runtime/brief-app",
        provenance: expect.objectContaining({
          runtimeKind: {
            kind: "PACKAGE_AGENT_DEFAULT",
            agentDefinitionId: "package-researcher",
          },
          llmModelIdentifier: {
            kind: "PACKAGE_AGENT_DEFAULT",
            agentDefinitionId: "package-researcher",
          },
          workspaceRootPath: "APPLICATION_RUNTIME",
        }),
      }),
      expect.objectContaining({
        memberRouteKey: "writer",
        provenance: expect.objectContaining({
          runtimeKind: {
            kind: "PACKAGE_AGENT_DEFAULT",
            agentDefinitionId: "package-writer",
          },
        }),
      }),
    ]);
    expect(harness.validate).toHaveBeenCalledWith(row.effectiveConfiguration);
  });

  it("previews an exact alternate baseline without reading or writing override state", async () => {
    const harness = createHarness();

    const preview = await harness.service.previewSelectedResourceBaseline(
      applicationId,
      slot.slotKey,
      alternateRef,
    );

    expect(preview).toEqual({
      status: "RESOLVED",
      applicationId,
      slotKey: slot.slotKey,
      executionResourceRef: alternateRef,
      selectedResourceBaseline: alternateBaseline(),
      issues: [],
    });
    expect(harness.listOverrides).not.toHaveBeenCalled();
    expect(harness.upsertOverride).not.toHaveBeenCalled();
    expect(harness.removeOverride).not.toHaveBeenCalled();
    expect(harness.validate).not.toHaveBeenCalled();
    expect(harness.build).toHaveBeenCalledOnce();
    expect(harness.build).toHaveBeenCalledWith(expect.objectContaining({
      applicationId,
      slot,
      executionResourceRef: alternateRef,
      provenance: "SELECTED_RESOURCE",
    }));
  });

  it("first-saves an alternate sparsely, inherits mixed member baselines, and re-inherits a cleared field", async () => {
    const harness = createHarness();
    const baseline = alternateBaseline();

    const firstView = await harness.service.upsertOverride(applicationId, slot.slotKey, {
      executionResourceRef: alternateRef,
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: null,
        memberProfiles: memberIdentityOnly(baseline).map((member) => (
          member.memberRouteKey === "writer"
            ? { ...member, llmModelIdentifier: "host-writer-model" }
            : member
        )),
      },
    });

    const firstRow = firstView.slots[0]!;
    expect(firstRow.packageBaseline).toEqual(packageBaseline());
    expect(firstRow.selectedResourceBaseline).toEqual(baseline);
    expect(firstRow.savedOverride).toEqual({
      slotKey: slot.slotKey,
      executionResourceRef: alternateRef,
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: null,
        memberProfiles: [
          {
            memberRouteKey: "researcher",
            memberName: "researcher",
            agentDefinitionId: "alternate-researcher",
          },
          {
            memberRouteKey: "writer",
            memberName: "writer",
            agentDefinitionId: "alternate-writer",
            llmModelIdentifier: "host-writer-model",
          },
        ],
      },
    });
    expect(firstRow.effectiveConfiguration?.leaves).toEqual([
      expect.objectContaining({
        memberRouteKey: "researcher",
        runtimeKind: "codex_app_server",
        llmModelIdentifier: "gpt-5.6-luna",
        provenance: expect.objectContaining({
          runtimeKind: {
            kind: "SELECTED_RESOURCE_AGENT_DEFAULT",
            agentDefinitionId: "alternate-researcher",
          },
          llmModelIdentifier: {
            kind: "SELECTED_RESOURCE_AGENT_DEFAULT",
            agentDefinitionId: "alternate-researcher",
          },
        }),
      }),
      expect.objectContaining({
        memberRouteKey: "writer",
        runtimeKind: "claude_agent_sdk",
        llmModelIdentifier: "host-writer-model",
        provenance: expect.objectContaining({
          runtimeKind: {
            kind: "SELECTED_RESOURCE_AGENT_DEFAULT",
            agentDefinitionId: "alternate-writer",
          },
          llmModelIdentifier: {
            kind: "HOST_MEMBER_OVERRIDE",
            memberRouteKey: "writer",
          },
        }),
      }),
    ]);

    const clearedView = await harness.service.upsertOverride(applicationId, slot.slotKey, {
      executionResourceRef: alternateRef,
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: null,
        memberProfiles: memberIdentityOnly(baseline),
      },
    });

    const clearedWriter = clearedView.slots[0]!.effectiveConfiguration!.leaves[1]!;
    expect(clearedWriter.llmModelIdentifier).toBe("claude-sonnet");
    expect(clearedWriter.provenance.llmModelIdentifier).toEqual({
      kind: "SELECTED_RESOURCE_AGENT_DEFAULT",
      agentDefinitionId: "alternate-writer",
    });
    expect(harness.getStored()?.launchOverride).toEqual({
      kind: "AGENT_TEAM",
      defaults: null,
      memberProfiles: memberIdentityOnly(baseline),
    });
  });

  it("preserves deleted and stale saved rows as blocking until explicit Reset", async () => {
    const savedBaseline = alternateBaseline();
    const initialStored: StoredApplicationLaunchOverride = {
      slotKey: slot.slotKey,
      executionResourceRef: alternateRef,
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: null,
        memberProfiles: memberIdentityOnly(savedBaseline),
      },
      legacyLaunchDefaults: null,
      updatedAt: "2026-07-29T12:00:00.000Z",
    };
    let mode: "deleted" | "stale" = "deleted";
    const harness = createHarness({
      initialStored,
      buildBaseline: (ref, provenance) => {
        if (resourceKey(ref) === resourceKey(packageRef)) return packageBaseline();
        if (mode === "deleted") {
          throw new ApplicationLaunchResourceBaselineError(
            "PACKAGE_RESOURCE_UNAVAILABLE",
            "Selected shared team is unavailable.",
          );
        }
        return buildBaseline({
          ref,
          definitionId: "alternate-team",
          provenance,
          writerDefinitionId: "alternate-writer-v2",
        });
      },
    });

    const deleted = (await harness.service.getApplicationLaunchConfigurationView(applicationId))
      .slots[0]!;
    expect(deleted.savedOverrideState).toBe("INVALID");
    expect(deleted.savedOverride).toEqual(expect.objectContaining({
      executionResourceRef: alternateRef,
    }));
    expect(deleted.selectedResourceBaseline).toBeNull();
    expect(deleted.effectiveConfiguration).toBeNull();
    expect(deleted.issues).toEqual([
      expect.objectContaining({
        scope: "HOST_OVERRIDE",
        code: "SAVED_RESOURCE_UNAVAILABLE",
      }),
    ]);

    mode = "stale";
    const stale = (await harness.service.getApplicationLaunchConfigurationView(applicationId))
      .slots[0]!;
    expect(stale.savedOverrideState).toBe("INVALID");
    expect(stale.selectedResourceBaseline).toEqual(alternateBaseline("alternate-writer-v2"));
    expect(stale.effectiveConfiguration).toBeNull();
    expect(stale.issues).toEqual([
      expect.objectContaining({
        scope: "HOST_OVERRIDE",
        code: "SAVED_MEMBER_TOPOLOGY_STALE",
        staleMembers: expect.arrayContaining([
          expect.objectContaining({
            memberRouteKey: "writer",
            reason: "AGENT_CHANGED",
            currentAgentDefinitionId: "alternate-writer-v2",
          }),
        ]),
      }),
    ]);

    const reset = await harness.service.removeOverride(applicationId, slot.slotKey);
    expect(harness.removeOverride).toHaveBeenCalledWith(applicationId, slot.slotKey);
    expect(reset.readiness).toEqual({ status: "RUNNABLE", issues: [] });
    expect(reset.slots[0]).toEqual(expect.objectContaining({
      savedOverride: null,
      savedOverrideState: "ABSENT",
      selectedResourceBaseline: packageBaseline(),
      canResetToPackageDefaults: false,
    }));
    expect(reset.slots[0]!.effectiveConfiguration?.executionResourceRef).toEqual(packageRef);
  });

  it("re-resolves topology at PUT and refuses a stale preview without writing", async () => {
    let alternateBuild = 0;
    const harness = createHarness({
      buildBaseline: (ref, provenance) => {
        if (resourceKey(ref) === resourceKey(packageRef)) return packageBaseline();
        alternateBuild += 1;
        return buildBaseline({
          ref,
          definitionId: "alternate-team",
          provenance,
          writerDefinitionId: alternateBuild === 1
            ? "alternate-writer"
            : "alternate-writer-v2",
        });
      },
    });
    const preview = await harness.service.previewSelectedResourceBaseline(
      applicationId,
      slot.slotKey,
      alternateRef,
    );
    if (preview.status !== "RESOLVED") throw new Error("Expected resolved preview.");

    await expect(harness.service.upsertOverride(applicationId, slot.slotKey, {
      executionResourceRef: alternateRef,
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: null,
        memberProfiles: memberIdentityOnly(preview.selectedResourceBaseline),
      },
    })).rejects.toBeInstanceOf(ApplicationLaunchConfigurationError);

    expect(harness.upsertOverride).not.toHaveBeenCalled();
    expect(harness.getStored()).toBeNull();
    expect(alternateBuild).toBe(2);
  });
});
