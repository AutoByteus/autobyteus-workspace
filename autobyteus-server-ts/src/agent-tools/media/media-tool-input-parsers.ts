import type {
  EditImageInput,
  GenerateImageInput,
  GenerateSpeechInput,
} from "./media-tool-contract.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireNonEmptyString = (args: Record<string, unknown>, name: string): string => {
  const value = args[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`'${name}' is required and must be a non-empty string.`);
  }
  return value.trim();
};

const optionalNonEmptyString = (
  args: Record<string, unknown>,
  name: string,
): string | null => {
  const value = args[name];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`'${name}' must be a string when provided.`);
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const parseMediaInputImages = (value: unknown): string[] | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((entry, index) => {
        if (typeof entry !== "string") {
          throw new Error(`'input_images[${index}]' must be a string.`);
        }
        return entry.trim();
      })
      .filter(Boolean);
    return items.length > 0 ? items : null;
  }

  throw new Error("'input_images' must be an array of image reference strings when provided.");
};

const parseGenerationConfig = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value)) {
    throw new Error("'generation_config' must be an object when provided.");
  }
  return value;
};

export const parseGenerateImageInput = (
  rawArguments: Record<string, unknown>,
): GenerateImageInput => ({
  prompt: requireNonEmptyString(rawArguments, "prompt"),
  input_images: parseMediaInputImages(rawArguments.input_images),
  output_file_path: requireNonEmptyString(rawArguments, "output_file_path"),
  generation_config: parseGenerationConfig(rawArguments.generation_config),
});

export const parseEditImageInput = (
  rawArguments: Record<string, unknown>,
): EditImageInput => ({
  prompt: requireNonEmptyString(rawArguments, "prompt"),
  input_images: parseMediaInputImages(rawArguments.input_images),
  mask_image: optionalNonEmptyString(rawArguments, "mask_image"),
  output_file_path: requireNonEmptyString(rawArguments, "output_file_path"),
  generation_config: parseGenerationConfig(rawArguments.generation_config),
});

export const parseGenerateSpeechInput = (
  rawArguments: Record<string, unknown>,
): GenerateSpeechInput => ({
  prompt: requireNonEmptyString(rawArguments, "prompt"),
  output_file_path: requireNonEmptyString(rawArguments, "output_file_path"),
  generation_config: parseGenerationConfig(rawArguments.generation_config),
});
