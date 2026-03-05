import type { RuntimeKind } from "../runtime-management/runtime-kind.js";

export type ExternalRuntimeKind = Exclude<RuntimeKind, "autobyteus">;

export interface ExternalRuntimeEventSource {
  readonly runtimeKind: ExternalRuntimeKind;
  subscribeToRunEvents(runId: string, listener: (event: unknown) => void): () => void;
  hasRunSession?(runId: string): boolean;
}
