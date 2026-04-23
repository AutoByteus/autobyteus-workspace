import type {
  ApplicationConfiguredLaunchDefaults,
  ApplicationConfiguredResource,
  ApplicationResourceSlotDeclaration,
  ApplicationRuntimeResourceRef,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { ApplicationRuntimeResourceResolver } from "./application-runtime-resource-resolver.js";
import {
  ApplicationPersistedResourceConfiguration,
  ApplicationResourceConfigurationStore,
} from "../stores/application-resource-configuration-store.js";

export type ApplicationResourceConfigurationView = {
  slot: ApplicationResourceSlotDeclaration;
  configuration: ApplicationConfiguredResource | null;
  updatedAt: string | null;
};

type EffectiveResourceSelection = {
  resourceRef: ApplicationRuntimeResourceRef;
  launchDefaults: ApplicationConfiguredLaunchDefaults | null;
  source: "persisted_override" | "manifest_default";
};

const cloneSlot = (slot: ApplicationResourceSlotDeclaration): ApplicationResourceSlotDeclaration => structuredClone(slot);

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const slotSupportsLaunchDefault = (
  slot: ApplicationResourceSlotDeclaration,
  key: keyof Omit<ApplicationConfiguredLaunchDefaults, "autoExecuteTools">,
): boolean => slot.supportedLaunchDefaults?.[key] === true;

const normalizeLaunchDefaults = (
  slot: ApplicationResourceSlotDeclaration,
  value: unknown,
  options: {
    rejectUnsupportedKeys: boolean;
  } = {
    rejectUnsupportedKeys: true,
  },
): ApplicationConfiguredLaunchDefaults | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (!options.rejectUnsupportedKeys) {
      return null;
    }
    throw new Error("launchDefaults must be an object when provided.");
  }

  const record = structuredClone(value) as Record<string, unknown>;
  const supportedKeys = new Set<string>(["llmModelIdentifier", "runtimeKind", "workspaceRootPath", "autoExecuteTools"]);

  for (const key of Object.keys(record)) {
    if (!supportedKeys.has(key)) {
      if (options.rejectUnsupportedKeys) {
        throw new Error(`launchDefaults.${key} is not supported by the host-managed application launch contract.`);
      }
      delete record[key];
      continue;
    }

    if (key === "autoExecuteTools") {
      delete record[key];
      continue;
    }

    if (!slotSupportsLaunchDefault(
      slot,
      key as keyof Omit<ApplicationConfiguredLaunchDefaults, "autoExecuteTools">,
    )) {
      if (options.rejectUnsupportedKeys) {
        throw new Error(`Application resource slot '${slot.slotKey}' does not support launchDefaults.${key}.`);
      }
      delete record[key];
    }
  }

  const llmModelIdentifier = normalizeOptionalString(record.llmModelIdentifier);
  const runtimeKind = normalizeOptionalString(record.runtimeKind);
  const workspaceRootPath = normalizeOptionalString(record.workspaceRootPath);

  if (!llmModelIdentifier && !runtimeKind && !workspaceRootPath) {
    return null;
  }

  return {
    ...(llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(runtimeKind ? { runtimeKind } : {}),
    ...(workspaceRootPath ? { workspaceRootPath } : {}),
    autoExecuteTools: true,
  };
};

export class ApplicationResourceConfigurationService {
  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      resourceResolver?: ApplicationRuntimeResourceResolver;
      configurationStore?: ApplicationResourceConfigurationStore;
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
    return this.resolveEffectiveConfiguration(applicationId, slot, stored);
  }

  async upsertConfiguration(
    applicationId: string,
    slotKey: string,
    input: {
      resourceRef?: ApplicationRuntimeResourceRef | null;
      launchDefaults?: ApplicationConfiguredLaunchDefaults | null;
    },
  ): Promise<ApplicationResourceConfigurationView> {
    const slot = await this.requireDeclaredSlot(applicationId, slotKey);
    const launchDefaults = normalizeLaunchDefaults(slot, input.launchDefaults, {
      rejectUnsupportedKeys: true,
    });
    const persistedResourceRef = input.resourceRef ? structuredClone(input.resourceRef) : null;
    const effectiveResourceRef = persistedResourceRef ?? slot.defaultResourceRef ?? null;

    if (!effectiveResourceRef) {
      if (slot.required) {
        throw new Error(`Application resource slot '${slot.slotKey}' requires a resource selection.`);
      }
      if (!launchDefaults) {
        await this.configurationStore.removeConfiguration(applicationId, slot.slotKey);
        return this.buildConfigurationView(applicationId, slot, null);
      }
      throw new Error(
        `Application resource slot '${slot.slotKey}' cannot persist launchDefaults without a selected or default resource.`,
      );
    }

    await this.validateResourceRef(applicationId, slot, effectiveResourceRef);
    const persisted: ApplicationPersistedResourceConfiguration = {
      slotKey: slot.slotKey,
      resourceRef: persistedResourceRef,
      launchDefaults,
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

  private async validateResourceRef(
    applicationId: string,
    slot: ApplicationResourceSlotDeclaration,
    resourceRef: ApplicationRuntimeResourceRef,
  ): Promise<void> {
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
    await this.resourceResolver.resolveResource(applicationId, resourceRef);
  }

  private getEffectiveSelection(
    slot: ApplicationResourceSlotDeclaration,
    persisted: ApplicationPersistedResourceConfiguration | null,
  ): EffectiveResourceSelection | null {
    const resourceRef = persisted?.resourceRef ?? slot.defaultResourceRef ?? null;
    if (!resourceRef) {
      return null;
    }
    return {
      resourceRef: structuredClone(resourceRef),
      launchDefaults: normalizeLaunchDefaults(slot, persisted?.launchDefaults ?? null, {
        rejectUnsupportedKeys: false,
      }),
      source: persisted?.resourceRef ? "persisted_override" : "manifest_default",
    };
  }

  private async resolveEffectiveConfiguration(
    applicationId: string,
    slot: ApplicationResourceSlotDeclaration,
    persisted: ApplicationPersistedResourceConfiguration | null,
  ): Promise<ApplicationConfiguredResource | null> {
    const selection = this.getEffectiveSelection(slot, persisted);
    if (!selection) {
      return null;
    }

    try {
      await this.validateResourceRef(applicationId, slot, selection.resourceRef);
    } catch (error) {
      const sourceLabel = selection.source === "persisted_override"
        ? "persisted override"
        : "manifest default";
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Application resource slot '${slot.slotKey}' has invalid ${sourceLabel}: ${detail}`,
      );
    }

    return {
      slotKey: slot.slotKey,
      resourceRef: selection.resourceRef,
      launchDefaults: selection.launchDefaults,
    };
  }

  private async buildConfigurationView(
    applicationId: string,
    slot: ApplicationResourceSlotDeclaration,
    persisted: ApplicationPersistedResourceConfiguration | null,
  ): Promise<ApplicationResourceConfigurationView> {
    return {
      slot: cloneSlot(slot),
      configuration: await this.resolveEffectiveConfiguration(applicationId, slot, persisted),
      updatedAt: persisted?.updatedAt ?? null,
    };
  }
}
