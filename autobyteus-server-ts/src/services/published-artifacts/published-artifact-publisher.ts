import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { PublishArtifactsToolArtifactInput } from "./published-artifact-tool-contract.js";
import type {
  PublishedArtifactSummary,
} from "./published-artifact-types.js";

export type PublishedArtifactPublicationFallbackRuntimeContext = {
  memoryDir?: string | null;
  workspaceRootPath?: string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
  emitArtifactPersisted?: ((
    artifact: PublishedArtifactSummary,
  ) => void | Promise<void>) | null;
};

export type PublishedArtifactPublicationRequest = {
  runId: string;
  artifacts: PublishArtifactsToolArtifactInput[];
  fallbackRuntimeContext?: PublishedArtifactPublicationFallbackRuntimeContext | null;
};

export interface PublishedArtifactPublisher {
  publishManyForRun(
    input: PublishedArtifactPublicationRequest,
  ): Promise<PublishedArtifactSummary[]>;
}
