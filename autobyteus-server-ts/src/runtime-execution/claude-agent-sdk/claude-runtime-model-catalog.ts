import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { asObject, asString } from "./claude-runtime-shared.js";

const DEFAULT_MODEL_DISPLAY_NAMES: Record<string, string> = {
  default: "Default (recommended)",
  "sonnet[1m]": "Sonnet (1M context)",
  opus: "Opus",
  "opus[1m]": "Opus (1M context)",
  haiku: "Haiku",
};

export const readDefaultModelIdentifiers = (): string[] => {
  const fromEnv = process.env.CLAUDE_AGENT_SDK_MODELS;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return Array.from(
      new Set(
        fromEnv
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
  }
  return ["default", "sonnet[1m]", "opus", "opus[1m]", "haiku"];
};

export const toModelInfo = (identifier: string, displayName?: string | null): ModelInfo => ({
  model_identifier: identifier,
  display_name:
    (typeof displayName === "string" && displayName.trim().length > 0
      ? displayName.trim()
      : null) ??
    DEFAULT_MODEL_DISPLAY_NAMES[identifier] ??
    identifier,
  value: identifier,
  canonical_name: identifier,
  provider: LLMProvider.ANTHROPIC,
  runtime: LLMRuntime.API,
});

export type NormalizedModelDescriptor = {
  identifier: string;
  displayName: string | null;
};

export const normalizeModelDescriptors = (value: unknown): NormalizedModelDescriptor[] => {
  if (!value) {
    return [];
  }

  const objectValue = asObject(value);
  const asArrayLike = Array.isArray(value)
    ? value
    : objectValue?.models && Array.isArray(objectValue.models)
      ? (objectValue.models as unknown[])
      : objectValue?.data && Array.isArray(objectValue.data)
        ? (objectValue.data as unknown[])
        : [];

  const descriptors = new Map<string, NormalizedModelDescriptor>();
  for (const row of asArrayLike) {
    if (typeof row === "string") {
      const existing = descriptors.get(row);
      if (!existing) {
        descriptors.set(row, {
          identifier: row,
          displayName: DEFAULT_MODEL_DISPLAY_NAMES[row] ?? null,
        });
      }
      continue;
    }

    const payload = asObject(row);
    if (!payload) {
      continue;
    }

    const identifier =
      asString(payload.value) ??
      asString(payload.model_identifier) ??
      asString(payload.modelIdentifier) ??
      asString(payload.id) ??
      asString(payload.name);

    if (!identifier) {
      continue;
    }

    const displayName =
      asString(payload.displayName) ??
      asString(payload.display_name) ??
      asString(payload.label) ??
      (asString(payload.name) !== identifier ? asString(payload.name) : null);

    const existing = descriptors.get(identifier);
    if (!existing) {
      descriptors.set(identifier, { identifier, displayName });
      continue;
    }

    if (!existing.displayName && displayName) {
      descriptors.set(identifier, { identifier, displayName });
    }
  }

  return Array.from(descriptors.values());
};
