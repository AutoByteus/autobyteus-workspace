import type { RunModelSelectionValidator } from "../../src/llm-management/services/run-model-selection-service.js";

type ValidationInput = Readonly<{ selection: Readonly<{ llmModelIdentifier: string; llmConfig: Readonly<Record<string, unknown>> | null }> }>;

/** autobyteus-646: a model-selection validator that accepts every selection as given, continuing by hand-over. */
export const ACCEPTING_MODEL_SELECTION_VALIDATOR = {
  validate: async (input: ValidationInput) => ({ kind: "valid" as const, selection: input.selection, continuation: "hand_over" as const }),
  validateMany: async (inputs: readonly ValidationInput[]) => inputs.map((input) =>
    ({ kind: "valid" as const, selection: input.selection, continuation: "hand_over" as const })),
} as unknown as RunModelSelectionValidator;

/** autobyteus-646: a stopped-run selection save a test never reaches (an automatic switch's); a call fails loudly. */
export const UNUSED_STOPPED_SELECTION_SAVE = Object.freeze({
  updateStoppedSelection: async (): Promise<never> => { throw new Error("unexpected stopped-run selection save"); },
});
