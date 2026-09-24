import type { ModelSelectionPresentation } from "../../../llm-management/domain/model-selection-presentation.js";
import {
  resolveCanonicalModelId,
  type NormalizedModelDescriptor,
} from "./claude-sdk-model-normalizer.js";

/** The Claude SDK row whose value tracks the SDK-recommended model. */
export const CLAUDE_SDK_DEFAULT_MODEL_VALUE = "default";

const NOT_RECOMMENDED: ModelSelectionPresentation = { recommended: false, aliasOfModelIdentifier: null };

/**
 * Derives picker hints over the full SDK row set: the `default` row folds into the
 * first other row (SDK order) resolving to the same canonical model ID, which becomes
 * the recommended option. Without such a sibling, `default` stays its own recommended
 * option. Catalog identities are never changed here.
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
