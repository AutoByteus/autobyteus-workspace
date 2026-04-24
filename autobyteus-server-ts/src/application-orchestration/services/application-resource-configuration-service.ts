import type {
  ApplicationConfiguredLaunchProfile,
  ApplicationConfiguredResource,
  ApplicationResourceConfigurationView,
  ApplicationResourceSlotDeclaration,
  ApplicationRuntimeResourceRef,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  TeamDefinitionTraversalService,
  type TeamLeafAgentMember,
} from "../../agent-team-execution/services/team-definition-traversal-service.js";
import { ApplicationRuntimeResourceResolver } from "./application-runtime-resource-resolver.js";
import {
  ApplicationPersistedResourceConfiguration,
  ApplicationResourceConfigurationStore,
} from "../stores/application-resource-configuration-store.js";
import {
  buildConfiguredResource,
  buildIssue,
  buildLegacyLaunchProfile,
  LaunchProfileValidationError,
  normalizeConfiguredLaunchProfile,
} from "./application-resource-configuration-launch-profile.js";

type EffectiveResourceSelection = {
  resourceRef: ApplicationRuntimeResourceRef;
  resolvedResource: Awaited<ReturnType<ApplicationRuntimeResourceResolver["resolveResource"]>>;
  source: "persisted_override" | "manifest_default";
};

const cloneSlot = (slot: ApplicationResourceSlotDeclaration): ApplicationResourceSlotDeclaration => structuredClone(slot);

export class ApplicationResourceConfigurationService {
  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      resourceResolver?: ApplicationRuntimeResourceResolver;
      configurationStore?: ApplicationResourceConfigurationStore;
      agentTeamDefinitionService?: AgentTeamDefinitionService;
      teamDefinitionTraversalService?: TeamDefinitionTraversalService;
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get resourceResolver(): ApplicationRuntimeResourceResolver {
    return this.dependencies.resourceResolver ?? new ApplicationRuntimeResourceResolver();
  }

  private get configurationStore(): ApplicationResourceConfigurationStore {
    return this.dependencies.configurationStore ?? new ApplicationResourceConfigurationStore();
  }

  private get agentTeamDefinitionService(): AgentTeamDefinitionService {
    return this.dependencies.agentTeamDefinitionService ?? AgentTeamDefinitionService.getInstance();
  }

  private get teamDefinitionTraversalService(): TeamDefinitionTraversalService {
    return this.dependencies.teamDefinitionTraversalService
      ?? new TeamDefinitionTraversalService(this.agentTeamDefinitionService);
  }

  async listConfigurations(applicationId: string): Promise<ApplicationResourceConfigurationView[]> {
    const slots = await this.getDeclaredSlots(applicationId);
    const storedConfigurations = await this.configurationStore.listConfigurations(applicationId);
    const storedBySlotKey = new Map(storedConfigurations.map((record) => [record.slotKey, record]));
    return Promise.all(
      slots.map((slot) =>
        this.buildConfigurationView(applicationId, slot, storedBySlotKey.get(slot.slotKey) ?? null)),
    );
  }

  async getConfiguredResource(applicationId: string, slotKey: string): Promise<ApplicationConfiguredResource | null> {
    const slot = await this.requireDeclaredSlot(applicationId, slotKey);
    const stored = await this.configurationStore.getConfiguration(applicationId, slot.slotKey);
    const view = await this.buildConfigurationView(applicationId, slot, stored);
    return view.status === "READY" ? view.configuration : null;
  }

  async upsertConfiguration(
    applicationId: string,
    slotKey: string,
    input: {
      resourceRef?: ApplicationRuntimeResourceRef | null;
      launchProfile?: ApplicationConfiguredLaunchProfile | null;
    },
  ): Promise<ApplicationResourceConfigurationView> {
    const slot = await this.requireDeclaredSlot(applicationId, slotKey);
    const persistedResourceRef = input.resourceRef ? structuredClone(input.resourceRef) : null;
    const effectiveResourceRef = persistedResourceRef ?? slot.defaultResourceRef ?? null;

    if (!effectiveResourceRef) {
      if (slot.required) {
        throw new Error(`Application resource slot '${slot.slotKey}' requires a resource selection.`);
      }
      if (!input.launchProfile) {
        await this.configurationStore.removeConfiguration(applicationId, slot.slotKey);
        return this.buildConfigurationView(applicationId, slot, null);
      }
      throw new Error(
        `Application resource slot '${slot.slotKey}' cannot persist launchProfile without a selected or default resource.`,
      );
    }

    const selection = await this.validateResourceSelection(applicationId, slot, effectiveResourceRef, persistedResourceRef ? "persisted_override" : "manifest_default");
    const launchProfile = await this.normalizeLaunchProfileForWrite(slot, selection, input.launchProfile ?? null);

    const persisted: ApplicationPersistedResourceConfiguration = {
      slotKey: slot.slotKey,
      resourceRef: persistedResourceRef,
      launchProfile,
      legacyLaunchDefaults: null,
      updatedAt: new Date().toISOString(),
    };
    const saved = await this.configurationStore.upsertConfiguration(applicationId, persisted);
    return this.buildConfigurationView(applicationId, slot, saved);
  }

  private async getDeclaredSlots(applicationId: string): Promise<ApplicationResourceSlotDeclaration[]> {
    const application = await this.applicationBundleService.getApplicationById(applicationId);
    if (!application) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }
    return application.resourceSlots.map((slot) => cloneSlot(slot));
  }

  private async requireDeclaredSlot(
    applicationId: string,
    slotKey: string,
  ): Promise<ApplicationResourceSlotDeclaration> {
    const normalizedSlotKey = slotKey.trim();
    if (!normalizedSlotKey) {
      throw new Error("slotKey is required.");
    }
    const slot = (await this.getDeclaredSlots(applicationId)).find((candidate) => candidate.slotKey === normalizedSlotKey);
    if (!slot) {
      throw new Error(`Application resource slot '${normalizedSlotKey}' is not declared for application '${applicationId}'.`);
    }
    return slot;
  }

  private async validateResourceSelection(
    applicationId: string,
    slot: ApplicationResourceSlotDeclaration,
    resourceRef: ApplicationRuntimeResourceRef,
    source: EffectiveResourceSelection["source"],
  ): Promise<EffectiveResourceSelection> {
    if (!slot.allowedResourceKinds.includes(resourceRef.kind)) {
      throw new Error(
        `Application resource slot '${slot.slotKey}' does not allow resource kind '${resourceRef.kind}'.`,
      );
    }
    const allowedOwners = slot.allowedResourceOwners ?? ["bundle", "shared"];
    if (!allowedOwners.includes(resourceRef.owner)) {
      throw new Error(
        `Application resource slot '${slot.slotKey}' does not allow resource owner '${resourceRef.owner}'.`,
      );
    }
    return {
      resourceRef: structuredClone(resourceRef),
      resolvedResource: await this.resourceResolver.resolveResource(applicationId, resourceRef),
      source,
    };
  }

  private async collectCurrentTeamMembers(resourceDefinitionId: string): Promise<TeamLeafAgentMember[]> {
    return this.teamDefinitionTraversalService.collectLeafAgentMembers(resourceDefinitionId);
  }

  private async normalizeLaunchProfileForWrite(
    slot: ApplicationResourceSlotDeclaration,
    selection: EffectiveResourceSelection,
    launchProfile: ApplicationConfiguredLaunchProfile | null,
  ): Promise<ApplicationConfiguredLaunchProfile | null> {
    return normalizeConfiguredLaunchProfile({
      slot,
      resourceKind: selection.resourceRef.kind,
      launchProfile,
      currentTeamMembers: selection.resourceRef.kind === "AGENT_TEAM"
        ? await this.collectCurrentTeamMembers(selection.resolvedResource.definitionId)
        : undefined,
    });
  }

  private async buildConfigurationView(
    applicationId: string,
    slot: ApplicationResourceSlotDeclaration,
    persisted: ApplicationPersistedResourceConfiguration | null,
  ): Promise<ApplicationResourceConfigurationView> {
    const slotViewBase = { slot: cloneSlot(slot), updatedAt: persisted?.updatedAt ?? null };
    const effectiveResourceRef = persisted?.resourceRef ?? slot.defaultResourceRef ?? null;

    if (!effectiveResourceRef) {
      return {
        ...slotViewBase,
        status: "NOT_CONFIGURED",
        configuration: null,
        invalidSavedConfiguration: null,
        issue: null,
      };
    }

    let selection: EffectiveResourceSelection;
    try {
      selection = await this.validateResourceSelection(
        applicationId,
        slot,
        effectiveResourceRef,
        persisted?.resourceRef ? "persisted_override" : "manifest_default",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (persisted) {
        return {
          ...slotViewBase,
          status: "INVALID_SAVED_CONFIGURATION",
          configuration: null,
          invalidSavedConfiguration: buildConfiguredResource(
            slot.slotKey,
            effectiveResourceRef,
            buildLegacyLaunchProfile({
              resourceRef: effectiveResourceRef,
              launchDefaults: persisted.legacyLaunchDefaults,
            }) ?? persisted.launchProfile ?? null,
          ),
          issue: buildIssue(
            "INVALID_RESOURCE_SELECTION",
            `Application resource slot '${slot.slotKey}' has a saved runtime resource selection that is no longer valid: ${message}`,
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
          `Application resource slot '${slot.slotKey}' default runtime resource is no longer valid: ${message}`,
        ),
      };
    }

    let nextPersisted = persisted;
    let candidateLaunchProfile = persisted?.launchProfile ?? null;
    if (!candidateLaunchProfile && persisted?.legacyLaunchDefaults) {
      try {
        candidateLaunchProfile = buildLegacyLaunchProfile({
          resourceRef: selection.resourceRef,
          launchDefaults: persisted.legacyLaunchDefaults,
          currentTeamMembers: selection.resourceRef.kind === "AGENT_TEAM"
            ? await this.collectCurrentTeamMembers(selection.resolvedResource.definitionId)
            : undefined,
        });
      } catch (error) {
        return {
          ...slotViewBase,
          status: "INVALID_SAVED_CONFIGURATION",
          configuration: null,
          invalidSavedConfiguration: buildConfiguredResource(slot.slotKey, selection.resourceRef, null),
          issue: buildIssue(
            "PROFILE_MALFORMED",
            error instanceof Error ? error.message : String(error),
          ),
        };
      }
      nextPersisted = await this.configurationStore.upsertConfiguration(applicationId, {
        slotKey: persisted.slotKey,
        resourceRef: persisted.resourceRef,
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
        configuration: buildConfiguredResource(slot.slotKey, selection.resourceRef, null),
        invalidSavedConfiguration: null,
        issue: null,
      };
    }

    try {
      const normalizedLaunchProfile = await this.normalizeLaunchProfileForWrite(slot, selection, candidateLaunchProfile);
      if (nextPersisted && JSON.stringify(nextPersisted.launchProfile ?? null) !== JSON.stringify(normalizedLaunchProfile ?? null)) {
        nextPersisted = await this.configurationStore.upsertConfiguration(applicationId, {
          slotKey: nextPersisted.slotKey,
          resourceRef: nextPersisted.resourceRef,
          launchProfile: normalizedLaunchProfile,
          legacyLaunchDefaults: null,
          updatedAt: nextPersisted.updatedAt,
        });
      }

      return {
        ...slotViewBase,
        updatedAt: nextPersisted?.updatedAt ?? slotViewBase.updatedAt,
        status: "READY",
        configuration: buildConfiguredResource(slot.slotKey, selection.resourceRef, normalizedLaunchProfile),
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
          invalidSavedConfiguration: buildConfiguredResource(slot.slotKey, selection.resourceRef, candidateLaunchProfile),
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
