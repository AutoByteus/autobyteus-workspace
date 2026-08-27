import { Ajv, type ValidateFunction } from "ajv";
import type {
  ApplicationAgentToolResult,
} from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationAgentToolDeclarationSnapshot,
} from "../domain/application-agent-tool-declaration-snapshot.js";
import { ApplicationAgentToolError } from "../domain/application-agent-tool-errors.js";

export const APPLICATION_AGENT_TOOL_PAYLOAD_LIMIT_BYTES = 1024 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const assertExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  fieldName: string,
): void => {
  const allowed = new Set(keys);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`${fieldName} contains unsupported key '${unknown}'.`);
};

const requireString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string.`);
  return value;
};

const assertJsonValue = (
  value: unknown,
  fieldName: string,
  ancestors = new Set<object>(),
): void => {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${fieldName} must contain finite numbers.`);
    return;
  }
  if (typeof value !== "object") {
    throw new Error(`${fieldName} must be JSON-serializable.`);
  }
  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error(`${fieldName} must not contain symbol properties.`);
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        throw new Error(`${fieldName} must not contain sparse array entries.`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new Error(`${fieldName}[${index}] must be an enumerable JSON value.`);
      }
    }
    const extraProperty = Object.getOwnPropertyNames(value).find((propertyName) => {
      if (propertyName === "length") return false;
      const index = Number(propertyName);
      return !Number.isSafeInteger(index)
        || index < 0
        || String(index) !== propertyName
        || index >= value.length;
    });
    if (extraProperty) {
      throw new Error(`${fieldName}.${extraProperty} is not a JSON array index.`);
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${fieldName} must contain only plain JSON objects.`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error(`${fieldName} must not contain symbol properties.`);
    }
    for (const propertyName of Object.getOwnPropertyNames(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new Error(`${fieldName}.${propertyName} must be an enumerable JSON value.`);
      }
    }
  }
  if (ancestors.has(value)) throw new Error(`${fieldName} must not contain cycles.`);
  ancestors.add(value);
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertJsonValue(child, `${fieldName}[${index}]`, ancestors));
  } else {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      assertJsonValue(child, `${fieldName}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
};

const assertPayloadSize = (value: unknown, fieldName: string): void => {
  assertJsonValue(value, fieldName);
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > APPLICATION_AGENT_TOOL_PAYLOAD_LIMIT_BYTES) {
    throw new Error(
      `${fieldName} exceeds the ${APPLICATION_AGENT_TOOL_PAYLOAD_LIMIT_BYTES}-byte application tool payload limit.`,
    );
  }
};

const validateContent = (value: unknown, index: number): void => {
  const fieldName = `result.content[${index}]`;
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error(`${fieldName} must be a typed content object.`);
  }
  switch (value.type) {
    case "text":
      assertExactKeys(value, ["type", "text"], fieldName);
      requireString(value.text, `${fieldName}.text`);
      return;
    case "image":
    case "audio":
      assertExactKeys(value, ["type", "data", "mimeType"], fieldName);
      requireString(value.data, `${fieldName}.data`);
      requireString(value.mimeType, `${fieldName}.mimeType`);
      return;
    case "resource": { 
      assertExactKeys(value, ["type", "resource"], fieldName);
      if (!isRecord(value.resource)) {
        throw new Error(`${fieldName}.resource must be an object.`);
      }
      const resource = value.resource;
      const hasText = Object.prototype.hasOwnProperty.call(resource, "text");
      const hasBlob = Object.prototype.hasOwnProperty.call(resource, "blob");
      if (hasText === hasBlob) {
        throw new Error(`${fieldName}.resource must contain exactly one of text or blob.`);
      }
      assertExactKeys(resource, ["uri", "mimeType", hasText ? "text" : "blob"], `${fieldName}.resource`);
      requireString(resource.uri, `${fieldName}.resource.uri`);
      if (resource.mimeType !== undefined) requireString(resource.mimeType, `${fieldName}.resource.mimeType`);
      requireString(hasText ? resource.text : resource.blob, `${fieldName}.resource.${hasText ? "text" : "blob"}`);
      return;
    }
    case "resource_link":
      assertExactKeys(
        value,
        ["type", "name", "uri", "description", "mimeType", "size"],
        fieldName,
      );
      requireString(value.name, `${fieldName}.name`);
      requireString(value.uri, `${fieldName}.uri`);
      if (value.description !== undefined) requireString(value.description, `${fieldName}.description`);
      if (value.mimeType !== undefined) requireString(value.mimeType, `${fieldName}.mimeType`);
      if (
        value.size !== undefined
        && (typeof value.size !== "number" || !Number.isSafeInteger(value.size) || value.size < 0)
      ) throw new Error(`${fieldName}.size must be a non-negative safe integer.`);
      return;
    default:
      throw new Error(`${fieldName}.type '${value.type}' is unsupported.`);
  }
};

export const validateApplicationAgentToolResult = (
  value: unknown,
): ApplicationAgentToolResult => {
  try {
    if (!isRecord(value)) throw new Error("result must be an object.");
    assertPayloadSize(value, "result");
    assertExactKeys(value, ["content", "structuredContent", "isError"], "result");
    if (!Array.isArray(value.content)) throw new Error("result.content must be an array.");
    value.content.forEach(validateContent);
    if (value.structuredContent !== undefined && !isRecord(value.structuredContent)) {
      throw new Error("result.structuredContent must be an object when provided.");
    }
    if (value.isError !== undefined && typeof value.isError !== "boolean") {
      throw new Error("result.isError must be a boolean when provided.");
    }
    return structuredClone(value) as ApplicationAgentToolResult;
  } catch (error) {
    throw new ApplicationAgentToolError(
      "APPLICATION_TOOL_INVALID_RESULT",
      "Application tool returned an invalid result.",
      { cause: error },
    );
  }
};

export class ApplicationAgentToolPayloadValidator {
  private readonly ajv = new Ajv({
    strict: true,
    allErrors: true,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
  });
  private readonly validators = new Map<string, ValidateFunction>();

  validateInput(
    snapshot: ApplicationAgentToolDeclarationSnapshot,
    value: Record<string, unknown>,
  ): void {
    try {
      if (!isRecord(value)) throw new Error("arguments must be a JSON object.");
      assertPayloadSize(value, "arguments");
      let validator = this.validators.get(snapshot.fingerprint);
      if (!validator) {
        const compiled = this.ajv.compile(snapshot.declaration.inputSchema);
        this.validators.set(snapshot.fingerprint, compiled);
        validator = compiled;
      }
      if (!validator(value)) {
        throw new Error(this.ajv.errorsText(validator.errors, { separator: "; " }));
      }
    } catch (error) {
      throw new ApplicationAgentToolError(
        "APPLICATION_TOOL_INVALID_INPUT",
        "Application tool arguments do not satisfy the declared input schema.",
        { cause: error },
      );
    }
  }

  validateResult(value: unknown): ApplicationAgentToolResult {
    return validateApplicationAgentToolResult(value);
  }
}
