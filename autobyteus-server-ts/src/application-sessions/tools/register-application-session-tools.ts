import { registerPublishArtifactTool } from "./publish-artifact-tool.js";

export function registerApplicationSessionTools(): void {
  registerPublishArtifactTool();
}
