import { registerPublishArtifactTool } from "./publish-artifact-tool.js";

export function registerApplicationOrchestrationTools(): void {
  registerPublishArtifactTool();
}
