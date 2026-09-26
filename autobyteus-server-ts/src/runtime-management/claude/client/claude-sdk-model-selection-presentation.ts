import type { ModelSelectionPresentation } from "../../../llm-management/domain/model-selection-presentation.js";
import {
  resolveCanonicalModelId,
  type NormalizedModelDescriptor,
} from "./claude-sdk-model-normalizer.js";

/** The Claude SDK row whose value tracks the SDK-recommended model. */
export const CLAUDE_SDK_DEFAULT_MODEL_VALUE = "default";

const NOT_RECOMMENDED: ModelSelectionPresentation = { recommended: false, aliasOfModelIdentifier: null };

/**
 * Derives internal identity evidence over the full raw SDK row set. The first
 * distinct row (SDK order) resolving to the same canonical ID as `default`
 * becomes recommended. Filtering of redundant `default` belongs to ClaudeModelCatalog.
 */
export const deriveClaudeModelSelectionPresentation = (
  descriptors: readonly NormalizedModelDescriptor[],
): Map<string, ModelSelectionPresentation> => {
  const presentation = new Map<string, ModelSelectionPresentation>(
    descriptors.map((descriptor) => [descriptor.identifier, NOT_RECOMMENDED]),
  );
  const defaultRow = descriptors.find(
    (descriptor) => descriptor.identifier === CLAUDE_SDK_DEFAULT_MODEL_VALUE,
  );
  if (!defaultRow) {
    return presentation;
  }

  const defaultCanonicalId = resolveCanonicalModelId(defaultRow);
  const sibling = defaultCanonicalId
    ? descriptors.find((descriptor) =>
      descriptor !== defaultRow && resolveCanonicalModelId(descriptor) === defaultCanonicalId)
    : undefined;
  if (!sibling) {
    presentation.set(defaultRow.identifier, { recommended: true, aliasOfModelIdentifier: null });
    return presentation;
  }

  presentation.set(defaultRow.identifier, {
    recommended: false,
    aliasOfModelIdentifier: sibling.identifier,
  });
  presentation.set(sibling.identifier, { recommended: true, aliasOfModelIdentifier: null });
  return presentation;
};
