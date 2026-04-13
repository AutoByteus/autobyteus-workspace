import { URL } from "node:url";
import type { ApplicationArtifactRef } from "../domain/models.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";

const requireNonEmptyString = (value: string | null | undefined, fieldName: string): string => {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const validateUrl = (value: string): string => {
  const normalized = requireNonEmptyString(value, "artifactRef.url");
  const parsed = new URL(normalized);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("artifactRef.url must use http or https.");
  }
  return normalized;
};

export const validateApplicationArtifactRef = async (
  applicationId: string,
  artifactRef: ApplicationArtifactRef,
  applicationBundleService = ApplicationBundleService.getInstance(),
): Promise<ApplicationArtifactRef> => {
  if (!artifactRef || typeof artifactRef !== "object") {
    throw new Error("artifactRef is required.");
  }

  switch (artifactRef.kind) {
    case "WORKSPACE_FILE":
      return {
        kind: "WORKSPACE_FILE",
        workspaceId: artifactRef.workspaceId?.trim() || null,
        path: requireNonEmptyString(artifactRef.path, "artifactRef.path"),
      };
    case "URL":
      return {
        kind: "URL",
        url: validateUrl(artifactRef.url),
      };
    case "BUNDLE_ASSET": {
      const assetPath = requireNonEmptyString(artifactRef.assetPath, "artifactRef.assetPath");
      await applicationBundleService.resolveUiAsset(applicationId, assetPath);
      return {
        kind: "BUNDLE_ASSET",
        assetPath,
      };
    }
    case "INLINE_JSON":
      return {
        kind: "INLINE_JSON",
        mimeType: requireNonEmptyString(artifactRef.mimeType, "artifactRef.mimeType"),
        value: artifactRef.value,
      };
    default:
      throw new Error(`Unsupported artifactRef kind '${String((artifactRef as { kind?: unknown }).kind)}'.`);
  }
};
