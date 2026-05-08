import fs from "node:fs/promises";

import {
  resolveAgentRunAbsoluteSourcePath,
  type AgentRunFilePathResolutionFailureCode,
} from "../../agent-execution/domain/agent-run-file-path-identity.js";
import {
  buildPublishedArtifactId,
  normalizePublishedArtifactPath,
} from "./published-artifact-types.js";

export type PublishedArtifactPathResolutionFailureCode = AgentRunFilePathResolutionFailureCode;

export type PublishedArtifactSourcePathResolution =
  | {
      ok: true;
      canonicalPath: string;
      sourceAbsolutePath: string;
    }
  | {
      ok: false;
      code: PublishedArtifactPathResolutionFailureCode;
      message: string;
    };

const pathResolutionMessageByCode: Record<PublishedArtifactPathResolutionFailureCode, string> = {
  INVALID_PATH: "Published artifact path is required.",
  RELATIVE_PATH_REQUIRES_WORKSPACE_ROOT: "Published artifact relative paths require a workspace root.",
  UNSUPPORTED_ABSOLUTE_PATH: "Published artifact path is not supported by this runtime platform.",
};

export const resolvePublishedArtifactSourcePath = async (
  rawPath: string | null | undefined,
  workspaceRootPath?: string | null,
): Promise<PublishedArtifactSourcePathResolution> => {
  const result = resolveAgentRunAbsoluteSourcePath(rawPath, workspaceRootPath);
  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      message: pathResolutionMessageByCode[result.code],
    };
  }

  const resolvedSourceAbsolutePath = await fs.realpath(result.sourceAbsolutePath)
    .catch(() => result.sourceAbsolutePath);

  return {
    ok: true,
    canonicalPath: normalizePublishedArtifactPath(resolvedSourceAbsolutePath),
    sourceAbsolutePath: resolvedSourceAbsolutePath,
  };
};

export const buildPublishedArtifactIdentity = (
  runId: string,
  canonicalPath: string,
): { artifactId: string; canonicalPath: string } => {
  const normalizedCanonicalPath = normalizePublishedArtifactPath(canonicalPath);
  return {
    artifactId: buildPublishedArtifactId(runId, normalizedCanonicalPath),
    canonicalPath: normalizedCanonicalPath,
  };
};
