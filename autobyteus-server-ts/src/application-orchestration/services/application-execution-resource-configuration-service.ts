import type {
  ApplicationConfiguredLaunchProfile,
  ApplicationConfiguredExecutionResource,
  ApplicationExecutionResourceConfigurationView,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationExecutionResourceRef,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  TeamDefinitionTraversalService,
  type TeamLeafAgentMember,
} from "../../agent-team-execution/services/team-definition-traversal-service.js";
import { ApplicationExecutionResourceResolver } from "./application-execution-resource-resolver.js";
import {
  ApplicationPersistedExecutionResourceConfiguration,
  ApplicationExecutionResourceConfigurationStore,
} from "../stores/application-execution-resource-configuration-store.js";
import {
  buildConfiguredExecutionResource,
  buildIssue,
  buildLegacyLaunchProfile,
  LaunchProfileValidationError,
  normalizeConfiguredLaunchProfile,
} from "./application-execution-resource-configuration-launch-profile.js";

type EffectiveExecutionResourceSelection = {
  executionResourceRef: ApplicationExecutionResourceRef;
  resolvedResource: Awaited<ReturnType<ApplicationExecutionResourceResolver["resolveExecutionResource"]>>;
  source: "persisted_override" | "manifest_default";
};

const cloneSlot = (slot: ApplicationExecutionResourceSlotDeclaration): ApplicationExecutionResourceSlotDeclaration => structuredClone(slot);

export class ApplicationExecutionResourceConfigurationService {
  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      executionResourceResolver?: ApplicationExecutionResourceResolver;
      configurationStore?: ApplicationExecutionResourceConfigurationStore;
      agentTeamDefinitionService?: AgentTeamDefinitionService;
      teamDefinitionTraversalService?: TeamDefinitionTraversalService;
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get executionResourceResolver(): ApplicationExecutionResourceResolver {
    return this.dependencies.executionResourceResolver ?? new ApplicationExecutionResourceResolver();
  }

  private get configurationStore(): ApplicationExecutionResourceConfigurationStore {
    return this.dependencies.configurationStore ?? new ApplicationExecutionResourceConfigurationStore();
  }

  private get agentTeamDefinitionService(): AgentTeamDefinitionService {
    return this.dependencies.agentTeamDefinitionService ?? AgentTeamDefinitionService.getInstance();
  }

  private get teamDefinitionTraversalService(): TeamDefinitionTraversalService {
    return this.dependencies.teamDefinitionTraversalService
      ?? new TeamDefinitionTraversalService(this.agentTeamDefinitionService);
  }

  async listConfigurations(applicationId: string): Promise<ApplicationExecutionResourceConfigurationView[]> {
    const slots = await this.getDeclaredSlots(applicationId);
    const storedConfigurations = await this.configurationStore.listConfigurations(applicationId);
    const storedBySlotKey = new Map(storedConfigurations.map((record) => [record.slotKey, record]));
    return Promise.all(
      slots.map((slot) =>
        this.buildConfigurationView(applicationId, slot, storedBySlotKey.get(slot.slotKey) ?? null)),
    );
  }

  async getConfiguredExecutionResource(applicationId: string, slotKey: string): Promise<ApplicationConfiguredExecutionResource | null> {
    const slot = await this.requireDeclaredSlot(applicationId, slotKey);
    const stored = await this.configurationStore.getConfiguration(applicationId, slot.slotKey);
    const view = await this.buildConfigurationView(applicationId, slot, stored);
    return view.status === "READY" ? view.configuration : null;
  }

  async upsertConfiguration(
    applicationId: string,
    slotKey: string,
    input: {
      executionResourceRef?: ApplicationExecutionResourceRef | null;
      launchProfile?: ApplicationConfiguredLaunchProfile | null;
    },
  ): Promise<ApplicationExecutionResourceConfigurationView> {
    const slot = await this.requireDeclaredSlot(applicationId, slotKey);
    const persistedExecutionResourceRef = input.executionResourceRef ? structuredClone(input.executionResourceRef) : null;
    const effectiveExecutionResourceRef = persistedExecutionResourceRef ?? slot.defaultExecutionResourceRef ?? null;

    if (!effectiveExecutionResourceRef) {
      if (slot.required) {
        throw new Error(`Application execution resource slot '${slot.slotKey}' requires a resource selection.`);
      }
      if (!input.launchProfile) {
        await this.configurationStore.removeConfiguration(applicationId, slot.slotKey);
        return this.buildConfigurationView(applicationId, slot, null);
      }
      throw new Error(
        `Application execution resource slot '${slot.slotKey}' cannot persist launchProfile without a selected or default execution resource.`,
      );
    }

    const selection = await this.validateExecutionResourceSelection(applicationId, slot, effectiveExecutionResourceRef, persistedExecutionResourceRef ? "persisted_override" : "manifest_default");
    const launchProfile = await this.normalizeLaunchProfileForWrite(slot, selection, input.launchProfile ?? null);

    const persisted: ApplicationPersistedExecutionResourceConfiguration = {
      slotKey: slot.slotKey,
      executionResourceRef: persistedExecutionResourceRef,
      launchProfile,
      legacyLaunchDefaults: null,
      updatedAt: new Date().toISOString(),
    };
    const saved = await this.configurationStore.upsertConfiguration(applicationId, persisted);
    return this.buildConfigurationView(applicationId, slot, saved);
  }

  private async getDeclaredSlots(applicationId: string): Promise<ApplicationExecutionResourceSlotDeclaration[]> {
    const application = await this.applicationBundleService.getApplicationById(applicationId);
    if (!application) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }
    return application.executionResourceSlots.map((slot) => cloneSlot(slot));
  }

  private async requireDeclaredSlot(
    applicationId: string,
    slotKey: string,
  ): Promise<ApplicationExecutionResourceSlotDeclaration> {
    const normalizedSlotKey = slotKey.trim();
    if (!normalizedSlotKey) {
      throw new Error("slotKey is required.");
    }
    const slot = (await this.getDeclaredSlots(applicationId)).find((candidate) => candidate.slotKey === normalizedSlotKey);
    if (!slot) {
      throw new Error(`Application execution resource slot '${normalizedSlotKey}' is not declared for application '${applicationId}'.`);
    }
    return slot;
  }

  private async validateExecutionResourceSelection(
    applicationId: string,
    slot: ApplicationExecutionResourceSlotDeclaration,
    executionResourceRef: ApplicationExecutionResourceRef,
    source: EffectiveExecutionResourceSelection["source"],
  ): Promise<EffectiveExecutionResourceSelection> {
    if (!slot.allowedExecutionResourceKinds.includes(executionResourceRef.kind)) {
      throw new Error(
        `Application execution resource slot '${slot.slotKey}' does not allow execution resource kind '${executionResourceRef.kind}'.`,
      );
    }
    const allowedSources = slot.allowedExecutionResourceSources ?? ["bundle", "shared"];
    if (!allowedSources.includes(executionResourceRef.source)) {
      throw new Error(
        `Application execution resource slot '${slot.slotKey}' does not allow execution resource source '${executionResourceRef.source}'.`,
      );
    }
    return {
      executionResourceRef: structuredClone(executionResourceRef),
      resolvedResource: await this.executionResourceResolver.resolveExecutionResource(applicationId, executionResourceRef),
      source,
    };
  }

  private async collectCurrentTeamMembers(resourceDefinitionId: string): Promise<TeamLeafAgentMember[]> {
    return this.teamDefinitionTraversalService.collectLeafAgentMembers(resourceDefinitionId);
  }

  private async normalizeLaunchProfileForWrite(
    slot: ApplicationExecutionResourceSlotDeclaration,
    selection: EffectiveExecutionResourceSelection,
    launchProfile: ApplicationConfiguredLaunchProfile | null,
  ): Promise<ApplicationConfiguredLaunchProfile | null> {
    return normalizeConfiguredLaunchProfile({
      slot,
      resourceKind: selection.executionResourceRef.kind,
      launchProfile,
      currentTeamMembers: selection.executionResourceRef.kind === "AGENT_TEAM"
        ? await this.collectCurrentTeamMembers(selection.resolvedResource.definitionId)
        : undefined,
    });
  }

  private async buildConfigurationView(
    applicationId: string,
    slot: ApplicationExecutionResourceSlotDeclaration,
    persisted: ApplicationPersistedExecutionResourceConfiguration | null,
  ): Promise<ApplicationExecutionResourceConfigurationView> {
    const slotViewBase = { slot: cloneSlot(slot), updatedAt: persisted?.updatedAt ?? null };
    const effectiveExecutionResourceRef = persisted?.executionResourceRef ?? slot.defaultExecutionResourceRef ?? null;

    if (!effectiveExecutionResourceRef) {
      return {
        ...slotViewBase,
        status: "NOT_CONFIGURED",
        configuration: null,
        invalidSavedConfiguration: null,
        issue: null,
      };
    }

    let selection: EffectiveExecutionResourceSelection;
    try {
      selection = await this.validateExecutionResourceSelection(
        applicationId,
        slot,
        effectiveExecutionResourceRef,
        persisted?.executionResourceRef ? "persisted_override" : "manifest_default",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (persisted) {
        return {
          ...slotViewBase,
          status: "INVALID_SAVED_CONFIGURATION",
          configuration: null,
          invalidSavedConfiguration: buildConfiguredExecutionResource(
            slot.slotKey,
            effectiveExecutionResourceRef,
            buildLegacyLaunchProfile({
              executionResourceRef: effectiveExecutionResourceRef,
              launchDefaults: persisted.legacyLaunchDefaults,
            }) ?? persisted.launchProfile ?? null,
          ),
          issue: buildIssue(
            "INVALID_RESOURCE_SELECTION",
            `Application execution resource slot '${slot.slotKey}' has a saved execution resource selection that is no longer valid: ${message}`,
          ),
        };
      }

      return {
        ...slotViewBase,
        status: "NOT_CONFIGURED",
        configuration: null,
        invalidSavedConfiguration: null,
        issue: buildIssue(
          "INVALID_RESOURCE_SELECTION",
          `Application execution resource slot '${slot.slotKey}' default execution resource is no longer valid: ${message}`,
        ),
      };
    }

    let nextPersisted = persisted;
    let candidateLaunchProfile = persisted?.launchProfile ?? null;
    if (!candidateLaunchProfile && persisted?.legacyLaunchDefaults) {
      try {
        candidateLaunchProfile = buildLegacyLaunchProfile({
          executionResourceRef: selection.executionResourceRef,
          launchDefaults: persisted.legacyLaunchDefaults,
          currentTeamMembers: selection.executionResourceRef.kind === "AGENT_TEAM"
            ? await this.collectCurrentTeamMembers(selection.resolvedResource.definitionId)
            : undefined,
        });
      } catch (error) {
        return {
          ...slotViewBase,
          status: "INVALID_SAVED_CONFIGURATION",
          configuration: null,
          invalidSavedConfiguration: buildConfiguredExecutionResource(slot.slotKey, selection.executionResourceRef, null),
          issue: buildIssue(
            "PROFILE_MALFORMED",
            error instanceof Error ? error.message : String(error),
          ),
        };
      }
      nextPersisted = await this.configurationStore.upsertConfiguration(applicationId, {
        slotKey: persisted.slotKey,
        executionResourceRef: persisted.executionResourceRef,
        launchProfile: candidateLaunchProfile,
        legacyLaunchDefaults: null,
        updatedAt: persisted.updatedAt,
      });
    }

    if (!candidateLaunchProfile) {
      return {
        ...slotViewBase,
        updatedAt: nextPersisted?.updatedAt ?? slotViewBase.updatedAt,
        status: "READY",
        configuration: buildConfiguredExecutionResource(slot.slotKey, selection.executionResourceRef, null),
        invalidSavedConfiguration: null,
        issue: null,
      };
    }

    try {
      const normalizedLaunchProfile = await this.normalizeLaunchProfileForWrite(slot, selection, candidateLaunchProfile);
      if (nextPersisted && JSON.stringify(nextPersisted.launchProfile ?? null) !== JSON.stringify(normalizedLaunchProfile ?? null)) {
        nextPersisted = await this.configurationStore.upsertConfiguration(applicationId, {
          slotKey: nextPersisted.slotKey,
          executionResourceRef: nextPersisted.executionResourceRef,
          launchProfile: normalizedLaunchProfile,
          legacyLaunchDefaults: null,
          updatedAt: nextPersisted.updatedAt,
        });
      }

      return {
        ...slotViewBase,
        updatedAt: nextPersisted?.updatedAt ?? slotViewBase.updatedAt,
        status: "READY",
        configuration: buildConfiguredExecutionResource(slot.slotKey, selection.executionResourceRef, normalizedLaunchProfile),
        invalidSavedConfiguration: null,
        issue: null,
      };
    } catch (error) {
      if (persisted) {
        const validationError = error instanceof LaunchProfileValidationError
          ? error
          : new LaunchProfileValidationError(
              "PROFILE_MALFORMED",
              error instanceof Error ? error.message : String(error),
            );
        return {
          ...slotViewBase,
          updatedAt: nextPersisted?.updatedAt ?? slotViewBase.updatedAt,
          status: "INVALID_SAVED_CONFIGURATION",
          configuration: null,
          invalidSavedConfiguration: buildConfiguredExecutionResource(slot.slotKey, selection.executionResourceRef, candidateLaunchProfile),
          issue: buildIssue(
            validationError.issueCode,
            validationError.message,
            validationError.staleMembers ?? null,
          ),
        };
      }
      throw error;
    }
  }
}
