import type {
  ApplicationEffectiveLaunchConfiguration,
  ApplicationExecutionResourceOverride,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationHostOverrideState,
  ApplicationLaunchConfigurationView,
  ApplicationLaunchIssue,
  ApplicationLaunchOverride,
  ApplicationLaunchReadiness,
  ApplicationLaunchSelectionIssue,
  ApplicationLaunchSelectionPreview,
  ApplicationLaunchSlotView,
  ApplicationResolvedResourceLaunchBaseline,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type {
  ApplicationLaunchOverrideStore,
  StoredApplicationLaunchOverride,
} from "../../application-orchestration/stores/application-launch-override-store.js";
import { ApplicationLaunchHostCapabilityValidator } from "./application-launch-host-capability-validator.js";
import {
  ApplicationLaunchResourceBaselineBuilder,
  ApplicationLaunchResourceBaselineError,
} from "./application-launch-resource-baseline-builder.js";
import {
  ApplicationLaunchOverrideValidationError,
  normalizeApplicationLaunchOverride,
} from "./application-launch-override-normalizer.js";
import {
  ApplicationLaunchOverrideResolutionError,
  applyApplicationLaunchOverride,
} from "./application-launch-override-overlay.js";
import {
  ApplicationLaunchConfigurationError,
  buildApplicationLaunchIssue as issue,
} from "./application-launch-configuration-diagnostics.js";
import { isSameApplicationExecutionResourceRef } from "./application-execution-resource-ref.js";
import {
  parseStoredExecutionResourceRef,
  readParsedStoredJsonCell,
  readRawStoredApplicationLaunchOverride,
} from "./application-launch-stored-override-reader.js";

type SlotBaselineResult = { baseline: ApplicationResolvedResourceLaunchBaseline | null; issue: ApplicationLaunchIssue | null };

type StoredEvaluation = {
  savedOverride: ApplicationExecutionResourceOverride | null;
  state: ApplicationHostOverrideState;
  selectedResourceBaseline: ApplicationResolvedResourceLaunchBaseline | null;
  effectiveConfiguration: ApplicationEffectiveLaunchConfiguration | null;
  issues: ApplicationLaunchIssue[];
};

export class ApplicationLaunchConfigurationService {
  constructor(private readonly dependencies: {
    applicationBundleService: ApplicationBundleService;
    overrideStore: ApplicationLaunchOverrideStore;
    baselineBuilder: ApplicationLaunchResourceBaselineBuilder;
    hostCapabilityValidator: ApplicationLaunchHostCapabilityValidator;
    resolveWorkspaceRootPath: (applicationId: string) => string;
  }) {}

  async getApplicationLaunchConfigurationView(
    applicationId: string,
  ): Promise<ApplicationLaunchConfigurationView> {
    const slots = await this.getDeclaredSlots(applicationId);
    const storedRows = await this.dependencies.overrideStore.listOverrides(applicationId);
    const storedBySlot = new Map(storedRows.map((row) => [row.slotKey, row]));
    const baselineBySlot = new Map<string, SlotBaselineResult>();
    for (const slot of slots) {
      baselineBySlot.set(slot.slotKey, await this.buildPackageBaseline(applicationId, slot));
    }

    const packageIssues = [...baselineBySlot.values()].flatMap(
      (result) => result.issue ? [result.issue] : [],
    );
    const hasInvalidPackage = packageIssues.length > 0;
    const views: ApplicationLaunchSlotView[] = [];
    for (const slot of slots) {
      const baselineResult = baselineBySlot.get(slot.slotKey)!;
      const stored = storedBySlot.get(slot.slotKey) ?? null;
      const storedEvaluation = hasInvalidPackage
        ? this.notEvaluatedStored(stored, slot, baselineResult.baseline)
        : await this.evaluateStoredOverride(
            applicationId,
            slot,
            baselineResult.baseline,
            stored,
          );
      const slotIssues = [
        ...(baselineResult.issue ? [baselineResult.issue] : []),
        ...storedEvaluation.issues,
      ];
      views.push({
        slot: structuredClone(slot),
        packageBaseline: baselineResult.baseline
          ? structuredClone(baselineResult.baseline)
          : null,
        selectedResourceBaseline: storedEvaluation.selectedResourceBaseline
          ? structuredClone(storedEvaluation.selectedResourceBaseline)
          : null,
        savedOverride: storedEvaluation.savedOverride,
        savedOverrideState: storedEvaluation.state,
        effectiveConfiguration: storedEvaluation.effectiveConfiguration,
        issues: slotIssues,
        canResetToPackageDefaults: stored !== null,
        updatedAt: stored?.updatedAt ?? null,
      });
    }

    let readiness: ApplicationLaunchReadiness;
    if (hasInvalidPackage) {
      readiness = { status: "INVALID_PACKAGE", issues: packageIssues };
    } else {
      const requiredViews = views.filter((view) => view.slot.required);
      const hostIssues = requiredViews.flatMap((view) => view.issues);
      for (const view of requiredViews) {
        if (view.effectiveConfiguration && view.issues.length === 0) {
          const capabilityIssues = await this.dependencies.hostCapabilityValidator
            .validate(view.effectiveConfiguration);
          view.issues.push(...capabilityIssues);
          hostIssues.push(...capabilityIssues);
        }
      }
      const missingRequired = requiredViews.some((view) => !view.effectiveConfiguration);
      readiness = hostIssues.length > 0 || missingRequired
        ? { status: "HOST_REQUIREMENT_MISSING", issues: hostIssues }
        : { status: "RUNNABLE", issues: [] };
    }
    return { applicationId, slots: views, readiness };
  }

  async previewSelectedResourceBaseline(
    applicationId: string,
    slotKey: string,
    executionResourceRef: ApplicationExecutionResourceRef,
  ): Promise<ApplicationLaunchSelectionPreview> {
    const slot = await this.requireDeclaredSlot(applicationId, slotKey);
    const ref = structuredClone(executionResourceRef);
    try {
      const baseline = await this.dependencies.baselineBuilder.build({
        applicationId,
        slot,
        executionResourceRef: ref,
        provenance: isSameApplicationExecutionResourceRef(ref, slot.defaultExecutionResourceRef)
          ? "PACKAGE"
          : "SELECTED_RESOURCE",
      });
      return {
        status: "RESOLVED",
        applicationId,
        slotKey: slot.slotKey,
        executionResourceRef: ref,
        selectedResourceBaseline: baseline,
        issues: [],
      };
    } catch (error) {
      const baselineError = error instanceof ApplicationLaunchResourceBaselineError ? error : null;
      const code: ApplicationLaunchSelectionIssue["code"] =
        baselineError?.code === "PACKAGE_RESOURCE_UNAVAILABLE"
          ? "SELECTION_UNAVAILABLE"
          : baselineError?.code === "PACKAGE_RESOURCE_NOT_ALLOWED"
            ? "SELECTION_NOT_ALLOWED"
            : "SELECTION_TOPOLOGY_INVALID";
      return {
        status: "INVALID_SELECTION",
        applicationId,
        slotKey: slot.slotKey,
        executionResourceRef: ref,
        selectedResourceBaseline: null,
        issues: [{
          scope: "SELECTION",
          code,
          applicationId,
          slotKey: slot.slotKey,
          executionResourceRef: structuredClone(ref),
          message: error instanceof Error ? error.message : String(error),
        }],
      };
    }
  }

  async evaluateApplicationReadiness(applicationId: string): Promise<ApplicationLaunchReadiness> {
    return (await this.getApplicationLaunchConfigurationView(applicationId)).readiness;
  }

  async requireRunnableConfiguration(
    applicationId: string,
    slotKey: string,
  ): Promise<ApplicationEffectiveLaunchConfiguration> {
    const view = await this.getApplicationLaunchConfigurationView(applicationId);
    const slot = view.slots.find((candidate) => candidate.slot.slotKey === slotKey.trim());
    if (view.readiness.status !== "RUNNABLE" || !slot?.effectiveConfiguration) {
      throw new ApplicationLaunchConfigurationError(view.readiness);
    }
    return structuredClone(slot.effectiveConfiguration);
  }

  async upsertOverride(
    applicationId: string,
    slotKey: string,
    input: {
      executionResourceRef?: ApplicationExecutionResourceRef | null;
      launchOverride?: ApplicationLaunchOverride | null;
    },
  ): Promise<ApplicationLaunchConfigurationView> {
    const slot = await this.requireDeclaredSlot(applicationId, slotKey);
    const packageBaseline = (await this.buildPackageBaseline(applicationId, slot)).baseline;
    const stored: StoredApplicationLaunchOverride = {
      slotKey: slot.slotKey,
      executionResourceRef: input.executionResourceRef
        ? { state: "parsed", value: structuredClone(input.executionResourceRef) }
        : { state: "absent" },
      launchOverride: input.launchOverride
        ? { state: "parsed", value: structuredClone(input.launchOverride) }
        : { state: "absent" },
      legacyLaunchDefaults: { state: "absent" },
      updatedAt: new Date().toISOString(),
    };
    const evaluation = await this.evaluateStoredOverride(
      applicationId,
      slot,
      packageBaseline,
      stored,
    );
    if (evaluation.state !== "VALID") {
      throw new ApplicationLaunchConfigurationError({
        status: "HOST_REQUIREMENT_MISSING",
        issues: evaluation.issues,
      });
    }
    await this.dependencies.overrideStore.upsertOverride(applicationId, {
      slotKey: stored.slotKey,
      executionResourceRef: input.executionResourceRef
        ? structuredClone(input.executionResourceRef)
        : null,
      launchOverride: evaluation.savedOverride?.launchOverride ?? null,
      updatedAt: stored.updatedAt,
    });
    return this.getApplicationLaunchConfigurationView(applicationId);
  }

  async removeOverride(
    applicationId: string,
    slotKey: string,
  ): Promise<ApplicationLaunchConfigurationView> {
    const slot = await this.requireDeclaredSlot(applicationId, slotKey);
    await this.dependencies.overrideStore.removeOverride(applicationId, slot.slotKey);
    return this.getApplicationLaunchConfigurationView(applicationId);
  }

  private async getDeclaredSlots(
    applicationId: string,
  ): Promise<ApplicationExecutionResourceSlotDeclaration[]> {
    const application = await this.dependencies.applicationBundleService
      .getApplicationById(applicationId);
    if (!application) throw new Error(`Application '${applicationId}' was not found.`);
    return application.executionResourceSlots.map((slot) => structuredClone(slot));
  }

  private async requireDeclaredSlot(
    applicationId: string,
    slotKey: string,
  ): Promise<ApplicationExecutionResourceSlotDeclaration> {
    const normalized = slotKey.trim();
    if (!normalized) throw new Error("slotKey is required.");
    const slot = (await this.getDeclaredSlots(applicationId))
      .find((candidate) => candidate.slotKey === normalized);
    if (!slot) {
      throw new Error(`Application slot '${normalized}' is not declared for '${applicationId}'.`);
    }
    return slot;
  }

  private async buildPackageBaseline(
    applicationId: string,
    slot: ApplicationExecutionResourceSlotDeclaration,
  ): Promise<SlotBaselineResult> {
    const ref = slot.defaultExecutionResourceRef ?? null;
    if (!ref) {
      return slot.required
        ? {
            baseline: null,
            issue: issue({
              slotKey: slot.slotKey,
              scope: "PACKAGE",
              code: "PACKAGE_DEFAULT_MISSING",
              message: `Required application slot '${slot.slotKey}' has no package default resource.`,
            }),
          }
        : { baseline: null, issue: null };
    }
    if (ref.source !== "bundle") {
      return {
        baseline: null,
        issue: issue({
          slotKey: slot.slotKey,
          scope: "PACKAGE",
          code: "PACKAGE_RESOURCE_NOT_ALLOWED",
          message: `Application slot '${slot.slotKey}' package default must be bundle-owned.`,
        }),
      };
    }
    try {
      const baseline = await this.dependencies.baselineBuilder.build({
        applicationId,
        slot,
        executionResourceRef: ref,
        provenance: "PACKAGE",
      });
      const incomplete = baseline.leaves.find(
        (leaf) => !leaf.runtimeKind?.trim() || !leaf.llmModelIdentifier?.trim(),
      );
      if (incomplete) {
        throw new ApplicationLaunchResourceBaselineError(
          "PACKAGE_DEFAULT_INCOMPLETE",
          `Application slot '${slot.slotKey}' has an incomplete package launch default.`,
        );
      }
      return { baseline, issue: null };
    } catch (error) {
      const baselineError = error instanceof ApplicationLaunchResourceBaselineError
        ? error
        : new ApplicationLaunchResourceBaselineError(
            "PACKAGE_DEFAULT_INCOMPLETE",
            error instanceof Error ? error.message : String(error),
          );
      return {
        baseline: null,
        issue: issue({
          slotKey: slot.slotKey,
          scope: "PACKAGE",
          code: baselineError.code,
          message: baselineError.message,
        }),
      };
    }
  }

  private notEvaluatedStored(
    stored: StoredApplicationLaunchOverride | null,
    slot: ApplicationExecutionResourceSlotDeclaration,
    baseline: ApplicationResolvedResourceLaunchBaseline | null,
  ): StoredEvaluation {
    return {
      savedOverride: readRawStoredApplicationLaunchOverride({ stored, slot, baseline }),
      state: stored ? "NOT_EVALUATED" : "ABSENT",
      selectedResourceBaseline: stored ? null : baseline ? structuredClone(baseline) : null,
      effectiveConfiguration: null,
      issues: [],
    };
  }

  private async evaluateStoredOverride(
    applicationId: string,
    slot: ApplicationExecutionResourceSlotDeclaration,
    packageBaseline: ApplicationResolvedResourceLaunchBaseline | null,
    stored: StoredApplicationLaunchOverride | null,
  ): Promise<StoredEvaluation> {
    if (!stored) {
      return {
        savedOverride: null,
        state: "ABSENT",
        selectedResourceBaseline: packageBaseline ? structuredClone(packageBaseline) : null,
        effectiveConfiguration: packageBaseline
          ? applyApplicationLaunchOverride({
              baseline: packageBaseline,
              launchOverride: null,
              workspaceRootPath: this.dependencies.resolveWorkspaceRootPath(applicationId),
            })
          : null,
        issues: [],
      };
    }
    let storedRef: ApplicationExecutionResourceRef | null;
    try {
      storedRef = parseStoredExecutionResourceRef(stored.executionResourceRef);
    } catch (error) {
      return this.invalidStored(
        null,
        null,
        issue({
          slotKey: slot.slotKey,
          scope: "HOST_OVERRIDE",
          code: "SAVED_OVERRIDE_MALFORMED",
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    const selectedRef = storedRef
      ?? packageBaseline?.executionResourceRef
      ?? slot.defaultExecutionResourceRef
      ?? null;
    if (!selectedRef) {
      return this.invalidStored(
        null,
        null,
        issue({
          slotKey: slot.slotKey,
          scope: "HOST_OVERRIDE",
          code: "SAVED_OVERRIDE_MALFORMED",
          message: `Saved override for slot '${slot.slotKey}' has no selected resource.`,
        }),
      );
    }

    let selectedBaseline: ApplicationResolvedResourceLaunchBaseline;
    try {
      selectedBaseline = isSameApplicationExecutionResourceRef(selectedRef, slot.defaultExecutionResourceRef)
        && packageBaseline
        ? structuredClone(packageBaseline)
        : await this.dependencies.baselineBuilder.build({
            applicationId,
            slot,
            executionResourceRef: selectedRef,
            provenance: "SELECTED_RESOURCE",
          });
    } catch (error) {
      const baselineError = error instanceof ApplicationLaunchResourceBaselineError ? error : null;
      const code = baselineError?.code === "PACKAGE_RESOURCE_UNAVAILABLE"
        ? "SAVED_RESOURCE_UNAVAILABLE"
        : baselineError?.code === "PACKAGE_RESOURCE_NOT_ALLOWED"
          ? "SAVED_RESOURCE_NOT_ALLOWED"
          : "SAVED_OVERRIDE_MALFORMED";
      return this.invalidStored(
        readRawStoredApplicationLaunchOverride({ stored, slot, baseline: packageBaseline }),
        null,
        issue({
          slotKey: slot.slotKey,
          scope: "HOST_OVERRIDE",
          code,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    try {
      if (stored.launchOverride.state === "malformed") {
        throw new ApplicationLaunchOverrideValidationError(
          "SAVED_OVERRIDE_MALFORMED",
          "Saved launch override contains malformed JSON.",
        );
      }
      if (
        stored.launchOverride.state === "absent"
        && stored.legacyLaunchDefaults.state !== "absent"
      ) {
        throw new ApplicationLaunchOverrideValidationError(
          "SAVED_OVERRIDE_MALFORMED",
          "Historical launch defaults are not a supported current launch override; Reset is required.",
        );
      }
      const rawOverride = readParsedStoredJsonCell(stored.launchOverride);
      const normalized = normalizeApplicationLaunchOverride({
        slot,
        resourceKind: selectedBaseline.resourceKind,
        launchOverride: rawOverride,
        currentTeamMembers: selectedBaseline.leaves.map((leaf) => ({
          memberAddress: leaf.memberAddress ?? "/",
          displayName: leaf.displayName,
          agentDefinitionId: leaf.agentDefinitionId,
        })),
      });
      const savedOverride: ApplicationExecutionResourceOverride = {
        slotKey: slot.slotKey,
        executionResourceRef: structuredClone(selectedRef),
        launchOverride: normalized,
      };
      return {
        savedOverride,
        state: "VALID",
        selectedResourceBaseline: structuredClone(selectedBaseline),
        effectiveConfiguration: applyApplicationLaunchOverride({
          baseline: selectedBaseline,
          launchOverride: normalized,
          workspaceRootPath: this.dependencies.resolveWorkspaceRootPath(applicationId),
        }),
        issues: [],
      };
    } catch (error) {
      const validationError = error instanceof ApplicationLaunchOverrideValidationError
        ? error
        : new ApplicationLaunchOverrideValidationError(
            "SAVED_OVERRIDE_MALFORMED",
            error instanceof ApplicationLaunchOverrideResolutionError
              ? error.message
              : error instanceof Error ? error.message : String(error),
          );
      return this.invalidStored(
        readRawStoredApplicationLaunchOverride({ stored, slot, baseline: packageBaseline }),
        selectedBaseline,
        issue({
          slotKey: slot.slotKey,
          scope: "HOST_OVERRIDE",
          code: validationError.code,
          message: validationError.message,
          staleMembers: validationError.staleMembers,
        }),
      );
    }
  }

  private invalidStored(
    savedOverride: ApplicationExecutionResourceOverride | null,
    selectedResourceBaseline: ApplicationResolvedResourceLaunchBaseline | null,
    validationIssue: ApplicationLaunchIssue,
  ): StoredEvaluation {
    return {
      savedOverride,
      state: "INVALID",
      selectedResourceBaseline: selectedResourceBaseline
        ? structuredClone(selectedResourceBaseline)
        : null,
      effectiveConfiguration: null,
      issues: [validationIssue],
    };
  }

}
