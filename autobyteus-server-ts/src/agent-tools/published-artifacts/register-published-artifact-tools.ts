import { registerPublishArtifactsTool } from "./publish-artifacts-tool.js";
import type { PublishedArtifactPublicationService } from "../../services/published-artifacts/published-artifact-publication-service.js";

export function registerPublishedArtifactTools(
  publicationService?: PublishedArtifactPublicationService,
): void {
  registerPublishArtifactsTool(publicationService);
}
