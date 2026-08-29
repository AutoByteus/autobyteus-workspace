import { createHash } from "node:crypto";
import type {
  ApplicationAgentToolDeclaration,
} from "@autobyteus/application-sdk-contracts";

export type ApplicationAgentToolDeclarationSnapshot = Readonly<{
  declaration: ApplicationAgentToolDeclaration;
  fingerprint: string;
}>;

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
};

const canonicalJson = (value: unknown): string => JSON.stringify(canonicalize(value));

export const createApplicationAgentToolDeclarationSnapshot = (
  declaration: ApplicationAgentToolDeclaration,
): ApplicationAgentToolDeclarationSnapshot => {
  const cloned = structuredClone(declaration) as ApplicationAgentToolDeclaration;
  const fingerprint = createHash("sha256")
    .update(canonicalJson(cloned))
    .digest("hex");
  return Object.freeze({
    declaration: deepFreeze(cloned),
    fingerprint,
  });
};

export const cloneApplicationAgentToolDeclarationSnapshot = (
  snapshot: ApplicationAgentToolDeclarationSnapshot,
): ApplicationAgentToolDeclarationSnapshot => Object.freeze({
  declaration: deepFreeze(structuredClone(snapshot.declaration)),
  fingerprint: snapshot.fingerprint,
});

export const canonicalizeApplicationAgentToolSchema = (value: unknown): unknown =>
  canonicalize(value);

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
};
