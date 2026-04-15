import {
  validateApplicationArtifactRef,
} from "../utils/application-artifact-ref-validator.js";
import type {
  ApplicationArtifactRef,
  PublishArtifactInputV1,
} from "../domain/models.js";

const ALLOWED_FIELDS = new Set([
  "contractVersion",
  "artifactKey",
  "artifactType",
  "title",
  "summary",
  "artifactRef",
  "metadata",
  "isFinal",
]);

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("publish_artifact requires an object publication payload.");
  }
  return value as Record<string, unknown>;
};

const requireNonEmptyString = (
  value: unknown,
  fieldName: string,
): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
};

const readOptionalNullableString = (
  record: Record<string, unknown>,
  key: string,
): string | null | undefined => {
  if (!hasOwn(record, key) || record[key] === undefined) {
    return undefined;
  }
  if (record[key] === null) {
    return null;
  }
  if (typeof record[key] !== "string") {
    throw new Error(`${key} must be a string when provided.`);
  }
  const normalized = record[key].trim();
  return normalized || null;
};

const readOptionalNullableBoolean = (
  record: Record<string, unknown>,
  key: string,
): boolean | null | undefined => {
  if (!hasOwn(record, key) || record[key] === undefined) {
    return undefined;
  }
  if (record[key] === null) {
    return null;
  }
  if (typeof record[key] !== "boolean") {
    throw new Error(`${key} must be a boolean when provided.`);
  }
  return record[key];
};

const readOptionalMetadata = (
  record: Record<string, unknown>,
): Record<string, unknown> | null | undefined => {
  if (!hasOwn(record, "metadata") || record["metadata"] === undefined) {
    return undefined;
  }
  if (record["metadata"] === null) {
    return null;
  }
  if (!record["metadata"] || typeof record["metadata"] !== "object" || Array.isArray(record["metadata"])) {
    throw new Error("metadata must be an object when provided.");
  }
  return structuredClone(record["metadata"] as Record<string, unknown>);
};

const assertAllowedFields = (record: Record<string, unknown>): void => {
  const disallowedFields = Object.keys(record).filter((key) => !ALLOWED_FIELDS.has(key));
  if (disallowedFields.length > 0) {
    throw new Error(
      `publish_artifact v1 disallows fields: ${disallowedFields.join(", ")}.`,
    );
  }
};

const validateRequiredArtifactRef = async (
  record: Record<string, unknown>,
  applicationId: string,
): Promise<ApplicationArtifactRef> => {
  if (!hasOwn(record, "artifactRef") || record["artifactRef"] === null || record["artifactRef"] === undefined) {
    throw new Error("artifactRef is required.");
  }

  return validateApplicationArtifactRef(
    applicationId,
    record["artifactRef"] as ApplicationArtifactRef,
  );
};

export const normalizeArtifactPublication = async (input: {
  publication: unknown;
  applicationId: string;
}): Promise<PublishArtifactInputV1> => {
  const record = asRecord(input.publication);
  assertAllowedFields(record);

  const contractVersion = requireNonEmptyString(record["contractVersion"], "contractVersion");
  if (contractVersion !== "1") {
    throw new Error(`Unsupported publish_artifact contractVersion '${contractVersion}'.`);
  }

  return {
    contractVersion: "1",
    artifactKey: requireNonEmptyString(record["artifactKey"], "artifactKey"),
    artifactType: requireNonEmptyString(record["artifactType"], "artifactType"),
    title: readOptionalNullableString(record, "title"),
    summary: readOptionalNullableString(record, "summary"),
    artifactRef: await validateRequiredArtifactRef(record, input.applicationId),
    metadata: readOptionalMetadata(record),
    isFinal: readOptionalNullableBoolean(record, "isFinal"),
  };
};
