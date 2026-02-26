import {
  DEFAULT_RUNTIME_KIND,
  normalizeRuntimeKind,
  type RuntimeKind,
} from "../runtime-management/runtime-kind.js";
import {
  getRuntimeCapabilityService,
  type RuntimeCapabilityService,
} from "../runtime-management/runtime-capability-service.js";
import { evaluateCommandCapability } from "./runtime-capability-policy.js";
import { getRuntimeAdapterRegistry, type RuntimeAdapterRegistry } from "./runtime-adapter-registry.js";
import type {
  RuntimeCreateAgentRunInput,
  RuntimeRestoreAgentRunInput,
  RuntimeSessionRecord,
} from "./runtime-adapter-port.js";
import { getRuntimeSessionStore, type RuntimeSessionStore } from "./runtime-session-store.js";

export interface RuntimeCreateAgentRunRequest extends RuntimeCreateAgentRunInput {
  runtimeKind?: RuntimeKind | null;
}

export interface RuntimeRestoreAgentRunRequest extends RuntimeRestoreAgentRunInput {
  runtimeKind?: RuntimeKind | null;
}

export class RuntimeCompositionService {
  private sessionStore: RuntimeSessionStore;
  private adapterRegistry: RuntimeAdapterRegistry;
  private runtimeCapabilityService: RuntimeCapabilityService;

  constructor(
    sessionStore: RuntimeSessionStore = getRuntimeSessionStore(),
    adapterRegistry: RuntimeAdapterRegistry = getRuntimeAdapterRegistry(),
    runtimeCapabilityService: RuntimeCapabilityService = getRuntimeCapabilityService(),
  ) {
    this.sessionStore = sessionStore;
    this.adapterRegistry = adapterRegistry;
    this.runtimeCapabilityService = runtimeCapabilityService;
  }

  async createAgentRun(input: RuntimeCreateAgentRunRequest): Promise<RuntimeSessionRecord> {
    const runtimeKind = normalizeRuntimeKind(input.runtimeKind, DEFAULT_RUNTIME_KIND);
    this.assertRuntimeAvailableForCreateOrRestore(runtimeKind);
    const adapter = this.adapterRegistry.resolveAdapter(runtimeKind);
    if (!adapter.createAgentRun) {
      throw new Error(`Runtime '${runtimeKind}' does not support createAgentRun.`);
    }

    const result = await adapter.createAgentRun(input);
    const session: RuntimeSessionRecord = {
      runId: result.runId,
      runtimeKind,
      mode: "agent",
      runtimeReference: result.runtimeReference,
    };
    this.sessionStore.upsertSession(session);
    return session;
  }

  async restoreAgentRun(input: RuntimeRestoreAgentRunRequest): Promise<RuntimeSessionRecord> {
    const runtimeKind = normalizeRuntimeKind(
      input.runtimeKind ?? input.runtimeReference?.runtimeKind,
      DEFAULT_RUNTIME_KIND,
    );
    this.assertRuntimeAvailableForCreateOrRestore(runtimeKind);
    const adapter = this.adapterRegistry.resolveAdapter(runtimeKind);
    if (!adapter.restoreAgentRun) {
      throw new Error(`Runtime '${runtimeKind}' does not support restoreAgentRun.`);
    }

    const result = await adapter.restoreAgentRun({
      ...input,
      runtimeReference: {
        runtimeKind,
        sessionId: input.runtimeReference?.sessionId ?? input.runId,
        threadId: input.runtimeReference?.threadId ?? null,
        metadata: input.runtimeReference?.metadata ?? null,
      },
    });

    const session: RuntimeSessionRecord = {
      runId: result.runId,
      runtimeKind,
      mode: "agent",
      runtimeReference: result.runtimeReference,
    };
    this.sessionStore.upsertSession(session);
    return session;
  }

  registerRunSession(session: RuntimeSessionRecord): RuntimeSessionRecord {
    this.sessionStore.upsertSession(session);
    return session;
  }

  getRunSession(runId: string): RuntimeSessionRecord | null {
    return this.sessionStore.getSession(runId);
  }

  removeRunSession(runId: string): void {
    this.sessionStore.removeSession(runId);
  }

  private assertRuntimeAvailableForCreateOrRestore(runtimeKind: RuntimeKind): void {
    const capability = this.runtimeCapabilityService.getRuntimeCapability(runtimeKind);
    const decision = evaluateCommandCapability(capability, "create_or_restore");
    if (!decision.allowed) {
      throw new Error(
        decision.message ?? `Runtime '${runtimeKind}' is unavailable for create/restore.`,
      );
    }
  }
}

let cachedRuntimeCompositionService: RuntimeCompositionService | null = null;

export const getRuntimeCompositionService = (): RuntimeCompositionService => {
  if (!cachedRuntimeCompositionService) {
    cachedRuntimeCompositionService = new RuntimeCompositionService();
  }
  return cachedRuntimeCompositionService;
};
