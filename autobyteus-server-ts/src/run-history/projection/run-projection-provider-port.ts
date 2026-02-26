import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";
import type { RunManifest, RunRuntimeReference } from "../domain/models.js";
import type { RunProjection } from "./run-projection-types.js";

export interface RunProjectionProviderInput {
  runId: string;
  runtimeKind: RuntimeKind;
  manifest: RunManifest | null;
  runtimeReference: RunRuntimeReference | null;
}

export interface RunProjectionProvider {
  readonly providerId: string;
  readonly runtimeKind?: RuntimeKind;
  buildProjection(input: RunProjectionProviderInput): Promise<RunProjection | null>;
}
