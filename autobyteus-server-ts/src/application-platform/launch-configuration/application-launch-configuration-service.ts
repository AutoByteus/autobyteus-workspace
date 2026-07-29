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
  ApplicationLaunchSlotView,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type {
  ApplicationLaunchOverrideStore,
  StoredApplicationLaunchOverride,
} from "../../application-orchestration/stores/application-launch-override-store.js";
import {
  ApplicationLaunchHostCapabilityValidator,
} from "./application-launch-host-capability-validator.js";
import {
  ApplicationLaunchPackageBaselineBuilder,
  ApplicationLaunchPackageBaselineError,
} from "./application-launch-package-baseline-builder.js";
import {
  ApplicationLaunchOverrideValidationError,
  buildLegacyApplicationLaunchOverride,
  normalizeApplicationLaunchOverride,
} from "./application-launch-override-normalizer.js";
import { applyApplicationLaunchOverride } from "./application-launch-override-overlay.js";

type SlotBaselineResult = {
  baseline: ApplicationEffectiveLaunchConfiguration | null;
  issue: ApplicationLaunchIssue | null;
};

type StoredEvaluation = {
  savedOverride: ApplicationExecutionResourceOverride | null;
  state: ApplicationHostOverrideState;
  effectiveConfiguration: ApplicationEffectiveLaunchConfiguration | null;
  issues: ApplicationLaunchIssue[];
};

export class ApplicationLaunchConfigurationError extends Error {
  readonly code = "APPLICATION_SETUP_REQUIRED";

  constructor(readonly readiness: ApplicationLaunchReadiness) {
    super(
      readiness.status === "RUNNABLE"
        ? "The requested application launch slot has no runnable configuration."
        : readiness.issues.map((issue) => issue.message).join("; "),
    );
    this.name = "ApplicationLaunchConfigurationError";
  }
}

const cloneSlot = (
  slot: ApplicationExecutionResourceSlotDeclaration,
): ApplicationExecutionResourceSlotDeclaration => structuredClone(slot);

const issue = (input: {
  slotKey: string;
  scope: ApplicationLaunchIssue["scope"];
  code: ApplicationLaunchIssue["code"];
  message: string;
  staleMembers?: ApplicationLaunchIssue["staleMembers"];
}): ApplicationLaunchIssue => ({
  severity: "blocking",
  slotKey: input.slotKey,
  scope: input.scope,
  code: input.code,
  message: input.message,
  ...(input.staleMembers ? { staleMembers: structuredClone(input.staleMembers) } : {}),
});

export class ApplicationLaunchConfigurationService {
  constructor(private readonly dependencies: {
    applicationBundleService: ApplicationBundleService;
    overrideStore: ApplicationLaunchOverrideStore;
    baselineBuilder: ApplicationLaunchPackageBaselineBuilder;
    hostCapabilityValidator: ApplicationLaunchHostCapabilityValidator;
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

    const packageIssues = [...baselineBySlot.values()]
      .flatMap((result) => result.issue ? [result.issue] : []);
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
        slot: cloneSlot(slot),
        packageBaseline: baselineResult.baseline
          ? structuredClone(baselineResult.baseline)
          : null,
        savedOverride: storedEvaluation.savedOverride,
        savedOverrideState: storedEvaluation.state,
        effectiveConfiguration: storedEvaluation.effectiveConfiguration,
        issues: slotIssues,
        canResetToPackageDefaults: storedEvaluation.savedOverride !== null,
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

  async evaluateApplicationReadiness(
    applicationId: string,
  ): Promise<ApplicationLaunchReadiness> {
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
        ? structuredClone(input.executionResourceRef)
        : null,
      launchOverride: input.launchOverride ? structuredClone(input.launchOverride) : null,
      legacyLaunchDefaults: null,
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
      ...stored,
      launchOverride: evaluation.savedOverride?.launchOverride ?? null,
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
    return application.executionResourceSlots.map(cloneSlot);
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
      return {
        baseline: await this.dependencies.baselineBuilder.build({
          applicationId,
          slot,
          executionResourceRef: ref,
        }),
        issue: null,
      };
    } catch (error) {
      const baselineError = error instanceof ApplicationLaunchPackageBaselineError
        ? error
        : new ApplicationLaunchPackageBaselineError(
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
    baseline: ApplicationEffectiveLaunchConfiguration | null,
  ): StoredEvaluation {
    return {
      savedOverride: this.toRawSavedOverride(stored, slot, baseline),
      state: stored ? "NOT_EVALUATED" : "ABSENT",
      effectiveConfiguration: null,
      issues: [],
    };
  }

  private async evaluateStoredOverride(
    applicationId: string,
    slot: ApplicationExecutionResourceSlotDeclaration,
    packageBaseline: ApplicationEffectiveLaunchConfiguration | null,
    stored: StoredApplicationLaunchOverride | null,
  ): Promise<StoredEvaluation> {
    if (!stored) {
      return {
        savedOverride: null,
        state: "ABSENT",
        effectiveConfiguration: packageBaseline ? structuredClone(packageBaseline) : null,
        issues: [],
      };
    }
    const selectedRef = stored.executionResourceRef
      ?? packageBaseline?.executionResourceRef
      ?? slot.defaultExecutionResourceRef
      ?? null;
    if (!selectedRef) {
      return this.invalidStored(
        null,
        issue({
          slotKey: slot.slotKey,
          scope: "HOST_OVERRIDE",
          code: "SAVED_OVERRIDE_MALFORMED",
          message: `Saved override for slot '${slot.slotKey}' has no selected resource.`,
        }),
      );
    }
    let selectedBaseline: ApplicationEffectiveLaunchConfiguration;
    try {
      selectedBaseline = stored.executionResourceRef
        ? await this.dependencies.baselineBuilder.build({
            applicationId,
            slot,
            executionResourceRef: selectedRef,
          })
        : packageBaseline!;
    } catch (error) {
      const baselineError = error instanceof ApplicationLaunchPackageBaselineError
        ? error
        : null;
      const code = baselineError?.code === "PACKAGE_RESOURCE_UNAVAILABLE"
        ? "SAVED_RESOURCE_UNAVAILABLE"
        : baselineError?.code === "PACKAGE_RESOURCE_NOT_ALLOWED"
          ? "SAVED_RESOURCE_NOT_ALLOWED"
          : "SAVED_OVERRIDE_MALFORMED";
      return this.invalidStored(
        this.toRawSavedOverride(stored, slot, packageBaseline),
        issue({
          slotKey: slot.slotKey,
          scope: "HOST_OVERRIDE",
          code,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    try {
      const rawOverride = stored.launchOverride
        ?? buildLegacyApplicationLaunchOverride({
          executionResourceRef: selectedRef,
          launchDefaults: stored.legacyLaunchDefaults,
          currentTeamMembers: selectedBaseline.leaves.map((leaf) => ({
            memberRouteKey: leaf.memberRouteKey ?? slot.slotKey,
            memberName: leaf.memberName,
            agentDefinitionId: leaf.agentDefinitionId,
          })),
        });
      const normalized = normalizeApplicationLaunchOverride({
        slot,
        resourceKind: selectedBaseline.resourceKind,
        launchOverride: rawOverride,
        currentTeamMembers: selectedBaseline.leaves.map((leaf) => ({
          memberRouteKey: leaf.memberRouteKey ?? slot.slotKey,
          memberName: leaf.memberName,
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
        effectiveConfiguration: applyApplicationLaunchOverride({
          baseline: selectedBaseline,
          launchOverride: normalized,
        }),
        issues: [],
      };
    } catch (error) {
      const validationError = error instanceof ApplicationLaunchOverrideValidationError
        ? error
        : new ApplicationLaunchOverrideValidationError(
            "SAVED_OVERRIDE_MALFORMED",
            error instanceof Error ? error.message : String(error),
          );
      return this.invalidStored(
        this.toRawSavedOverride(stored, slot, packageBaseline),
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
    validationIssue: ApplicationLaunchIssue,
  ): StoredEvaluation {
    return {
      savedOverride,
      state: "INVALID",
      effectiveConfiguration: null,
      issues: [validationIssue],
    };
  }

  private toRawSavedOverride(
    stored: StoredApplicationLaunchOverride | null,
    slot: ApplicationExecutionResourceSlotDeclaration,
    baseline: ApplicationEffectiveLaunchConfiguration | null,
  ): ApplicationExecutionResourceOverride | null {
    if (!stored) return null;
    const ref = stored.executionResourceRef
      ?? baseline?.executionResourceRef
      ?? slot.defaultExecutionResourceRef
      ?? null;
    if (!ref) return null;
    return {
      slotKey: slot.slotKey,
      executionResourceRef: structuredClone(ref),
      launchOverride: stored.launchOverride ? structuredClone(stored.launchOverride) : null,
    };
  }
}
