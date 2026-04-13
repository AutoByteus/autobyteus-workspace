import {
  validateApplicationArtifactRef,
} from "../utils/application-artifact-ref-validator.js";
import type {
  ApplicationArtifactRef,
  ApplicationDeliveryState,
  ApplicationMemberArtifactState,
  ApplicationMemberProgressState,
  PublishApplicationEventInputV1,
} from "../domain/models.js";

const FAMILY_ALLOWED_FIELDS = {
  MEMBER_ARTIFACT: new Set([
    "contractVersion",
    "publicationFamily",
    "publicationKey",
    "artifactType",
    "state",
    "title",
    "summary",
    "artifactRef",
    "isFinal",
  ]),
  DELIVERY_STATE: new Set([
    "contractVersion",
    "publicationFamily",
    "publicationKey",
    "deliveryState",
    "title",
    "summary",
    "artifactType",
    "artifactRef",
  ]),
  PROGRESS: new Set([
    "contractVersion",
    "publicationFamily",
    "publicationKey",
    "phaseLabel",
    "state",
    "percent",
    "detailText",
  ]),
} as const;

const ARTIFACT_STATES = new Set<ApplicationMemberArtifactState>([
  "draft",
  "ready",
  "blocked",
  "superseded",
]);
const DELIVERY_STATES = new Set<ApplicationDeliveryState>([
  "waiting",
  "in_progress",
  "ready",
  "blocked",
]);
const PROGRESS_STATES = new Set<ApplicationMemberProgressState>([
  "queued",
  "working",
  "ready",
  "blocked",
]);

type PublicationFamily = keyof typeof FAMILY_ALLOWED_FIELDS;

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("publish_application_event requires an object publication payload.");
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

const readOptionalString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  if (!hasOwn(record, key) || record[key] === null || record[key] === undefined) {
    return undefined;
  }
  if (typeof record[key] !== "string") {
    throw new Error(`${key} must be a string when provided.`);
  }
  const normalized = record[key].trim();
  return normalized || undefined;
};

const readOptionalBoolean = (
  record: Record<string, unknown>,
  key: string,
): boolean | undefined => {
  if (!hasOwn(record, key) || record[key] === null || record[key] === undefined) {
    return undefined;
  }
  if (typeof record[key] !== "boolean") {
    throw new Error(`${key} must be a boolean when provided.`);
  }
  return record[key];
};

const readOptionalPercent = (
  record: Record<string, unknown>,
): number | undefined => {
  if (!hasOwn(record, "percent") || record["percent"] === null || record["percent"] === undefined) {
    return undefined;
  }
  if (typeof record["percent"] !== "number" || !Number.isFinite(record["percent"])) {
    throw new Error("percent must be a finite number when provided.");
  }
  if (record["percent"] < 0 || record["percent"] > 100) {
    throw new Error("percent must be between 0 and 100.");
  }
  return record["percent"];
};

const readEnumValue = <TValue extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: Set<TValue>,
): TValue => {
  const normalized = requireNonEmptyString(value, fieldName);
  if (!allowedValues.has(normalized as TValue)) {
    throw new Error(
      `${fieldName} must be one of: ${Array.from(allowedValues.values()).join(", ")}.`,
    );
  }
  return normalized as TValue;
};

const resolvePublicationFamily = (record: Record<string, unknown>): PublicationFamily => {
  const family = requireNonEmptyString(record["publicationFamily"], "publicationFamily");
  if (!(family in FAMILY_ALLOWED_FIELDS)) {
    throw new Error(`Unsupported publish_application_event publicationFamily '${family}'.`);
  }
  return family as PublicationFamily;
};

const assertNoMetadataEscapeHatches = (record: Record<string, unknown>): void => {
  if (hasOwn(record, "metadata")) {
    throw new Error("publish_application_event v1 does not allow metadata.");
  }
};

const assertAllowedFields = (
  record: Record<string, unknown>,
  publicationFamily: PublicationFamily,
): void => {
  const allowed = FAMILY_ALLOWED_FIELDS[publicationFamily];
  const disallowedFields = Object.keys(record).filter((key) => !allowed.has(key));
  if (disallowedFields.length > 0) {
    throw new Error(
      `publish_application_event v1 disallows fields for ${publicationFamily}: ${disallowedFields.join(", ")}.`,
    );
  }
};

const validateOptionalArtifactRef = async (
  record: Record<string, unknown>,
  applicationId: string,
): Promise<ApplicationArtifactRef | undefined> => {
  if (!hasOwn(record, "artifactRef") || record["artifactRef"] === null || record["artifactRef"] === undefined) {
    return undefined;
  }

  return validateApplicationArtifactRef(
    applicationId,
    record["artifactRef"] as ApplicationArtifactRef,
  );
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

export const normalizeApplicationPublication = async (input: {
  publication: unknown;
  applicationId: string;
}): Promise<PublishApplicationEventInputV1> => {
  const record = asRecord(input.publication);
  assertNoMetadataEscapeHatches(record);

  const contractVersion = requireNonEmptyString(record["contractVersion"], "contractVersion");
  if (contractVersion !== "1") {
    throw new Error(`Unsupported publish_application_event contractVersion '${contractVersion}'.`);
  }

  const publicationFamily = resolvePublicationFamily(record);
  assertAllowedFields(record, publicationFamily);
  const publicationKey = requireNonEmptyString(record["publicationKey"], "publicationKey");

  if (publicationFamily === "MEMBER_ARTIFACT") {
    return {
      contractVersion: "1",
      publicationFamily: "MEMBER_ARTIFACT",
      publicationKey,
      artifactType: requireNonEmptyString(record["artifactType"], "artifactType"),
      state: readEnumValue(record["state"], "state", ARTIFACT_STATES),
      title: requireNonEmptyString(record["title"], "title"),
      summary: readOptionalString(record, "summary"),
      artifactRef: await validateRequiredArtifactRef(record, input.applicationId),
      isFinal: readOptionalBoolean(record, "isFinal") ?? false,
    };
  }

  if (publicationFamily === "DELIVERY_STATE") {
    return {
      contractVersion: "1",
      publicationFamily: "DELIVERY_STATE",
      publicationKey,
      deliveryState: readEnumValue(record["deliveryState"], "deliveryState", DELIVERY_STATES),
      title: readOptionalString(record, "title"),
      summary: readOptionalString(record, "summary"),
      artifactType: readOptionalString(record, "artifactType"),
      artifactRef: await validateOptionalArtifactRef(record, input.applicationId),
    };
  }

  return {
    contractVersion: "1",
    publicationFamily: "PROGRESS",
    publicationKey,
    phaseLabel: requireNonEmptyString(record["phaseLabel"], "phaseLabel"),
    state: readEnumValue(record["state"], "state", PROGRESS_STATES),
    percent: readOptionalPercent(record),
    detailText: readOptionalString(record, "detailText"),
  };
};
