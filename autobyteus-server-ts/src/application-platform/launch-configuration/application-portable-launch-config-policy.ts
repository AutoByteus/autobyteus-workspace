import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import {
  applicationPortableRootFieldSchemas,
  applicationPortableSchemaForRuntime,
  type ApplicationPortableLaunchConfigSchema,
} from "./application-portable-launch-config-schemas.js";

const DEFAULT_CONFIG_FIELDS = new Set([
  "runtimeKind",
  "llmModelIdentifier",
  "llmConfig",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const canonicalKey = (key: string): string => key.replace(/[^a-z0-9]/gi, "").toLowerCase();
const semanticKeyTokens = (key: string): string[] => (
  key.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
);
const ROOT_TOKEN_COUNT_KEYS = new Set(["tokenlimit", "maxtokens", "safetymargintokens"]);
const PRICING_TOKEN_KEYS = new Set([
  "inputtokenpricing",
  "outputtokenpricing",
  "cachedinputreadtokenpricing",
  "cachedinputwritetokenpricing",
  "cachedinputwrite5mtokenpricing",
  "cachedinputwrite1htokenpricing",
  "maxinputtokens",
  "inputtokenpricingtiers",
]);
const ENDPOINT_ADDRESS_QUALIFIERS = new Set([
  "api",
  "endpoint",
  "gateway",
  "host",
  "hostname",
  "provider",
  "proxy",
  "server",
  "service",
]);

const forbiddenReason = (key: string): string | null => {
  const normalized = canonicalKey(key);
  const tokens = semanticKeyTokens(key);
  if (/password|passphrase/.test(normalized)) return "password/passphrase fields are host-owned";
  if (
    /credential|secret|apikey|clientsecret|privatekey|accesskey|accountkey|clientkey|subscriptionkey/.test(
      normalized,
    )
  ) {
    return "credential or secret fields are host-owned";
  }
  if (
    /authorization|authentication|authheader|bearer/.test(normalized)
    || tokens.includes("auth")
  ) {
    return "authorization or bearer fields are host-owned";
  }
  if (normalized.includes("token")) return "token-value fields are host-owned";
  if (
    /endpoint|baseurl|baseuri|apibase|connectionstring|dsn/.test(normalized)
    || tokens.includes("url")
    || tokens.includes("uri")
    || (
      tokens.includes("address")
      && tokens.some((token) => ENDPOINT_ADDRESS_QUALIFIERS.has(token))
    )
  ) {
    return "endpoint/base-URL fields are host-owned";
  }
  if (tokens.includes("host") || tokens.includes("hostname")) {
    return "host endpoint fields are host-owned";
  }
  if (/workspace(root|path)?|machinepath|filesystempath|filepath|rootpath|homepath|homedir|workingdirectory/.test(normalized)) {
    return "workspace or machine-path fields are host-owned";
  }
  return null;
};

const tokenKeyAllowedAtPath = (key: string, ancestors: string[]): boolean => {
  const normalized = canonicalKey(key);
  if (ancestors.length === 0 && ROOT_TOKEN_COUNT_KEYS.has(normalized)) return true;
  return ancestors[0] === "pricingconfig" && PRICING_TOKEN_KEYS.has(normalized);
};

export class ApplicationPortableLaunchConfigError extends Error {
  readonly code = "PACKAGE_FORBIDDEN_HOST_FIELD";

  constructor(
    readonly configPath: string,
    readonly reason: string,
  ) {
    super(`${configPath}: ${reason}.`);
    this.name = "ApplicationPortableLaunchConfigError";
  }
}

const fail = (path: string, reason: string): never => {
  throw new ApplicationPortableLaunchConfigError(path, reason);
};

function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(path, "must be an object");
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail(path, "must be an array");
}

const assertNoHostOwnedKeys = (
  value: unknown,
  path: string,
  ancestors: string[] = [],
): void => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoHostOwnedKeys(entry, `${path}[${index}]`, ancestors));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    const reason = forbiddenReason(key);
    if (reason && !(reason.startsWith("token-value") && tokenKeyAllowedAtPath(key, ancestors))) {
      fail(childPath, reason);
    }
    assertNoHostOwnedKeys(child, childPath, [...ancestors, canonicalKey(key)]);
  }
};

const assertPortableExtraParams = (value: unknown, path: string): void => {
  assertRecord(value, path);
  assertNoHostOwnedKeys(value, path, ["extraparams"]);
};

const assertSchema = (
  value: unknown,
  schema: ApplicationPortableLaunchConfigSchema,
  path: string,
): void => {
  if (schema.kind === "portable-extra-params") {
    assertPortableExtraParams(value, path);
    return;
  }
  if (schema.kind === "record") {
    assertRecord(value, path);
    for (const [key, child] of Object.entries(value)) {
      const fieldSchema = schema.fields[key];
      if (!fieldSchema) {
        const reason = forbiddenReason(key);
        fail(`${path}.${key}`, reason ?? "is not portable for this runtime");
      }
      assertSchema(child, fieldSchema, `${path}.${key}`);
    }
    return;
  }
  if (schema.kind === "array") {
    assertArray(value, path);
    value.forEach((entry, index) => assertSchema(entry, schema.element, `${path}[${index}]`));
    return;
  }
  if (schema.kind === "string-array") {
    if (value === null && schema.nullable) return;
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
      fail(path, "must be an array of strings");
    }
    return;
  }
  if (schema.kind === "string") {
    if (typeof value !== "string" || (schema.nonEmpty && !value.trim())) {
      fail(path, schema.nonEmpty ? "must be a non-empty string" : "must be a string");
    }
    return;
  }
  if (schema.kind === "boolean") {
    if (typeof value !== "boolean") fail(path, "must be a boolean");
    return;
  }
  if (value === null && schema.nullable) return;
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || (schema.integer && !Number.isInteger(value))
    || (schema.minimum !== undefined && value < schema.minimum)
  ) {
    fail(path, "must be a valid numeric value");
  }
};

export class ApplicationPortableLaunchConfigPolicy {
  assertPortableDefaultLaunchConfig(value: unknown, path: string): void {
    assertRecord(value, path);
    for (const key of Object.keys(value)) {
      if (!DEFAULT_CONFIG_FIELDS.has(key)) {
        fail(`${path}.${key}`, forbiddenReason(key) ?? "is not a portable launch field");
      }
    }
    if (value.runtimeKind !== undefined && typeof value.runtimeKind !== "string") {
      fail(`${path}.runtimeKind`, "must be a string");
    }
    if (
      value.llmModelIdentifier !== undefined
      && typeof value.llmModelIdentifier !== "string"
    ) {
      fail(`${path}.llmModelIdentifier`, "must be a string");
    }
    if (value.llmConfig !== undefined && value.llmConfig !== null) {
      assertRecord(value.llmConfig, `${path}.llmConfig`);
      assertNoHostOwnedKeys(value.llmConfig, `${path}.llmConfig`);
      for (const [key, child] of Object.entries(value.llmConfig)) {
        const fieldSchema = applicationPortableRootFieldSchemas[key];
        if (!fieldSchema) {
          fail(
            `${path}.llmConfig.${key}`,
            forbiddenReason(key) ?? "is not a portable runtime launch field",
          );
        }
        assertSchema(child, fieldSchema, `${path}.llmConfig.${key}`);
      }
    }
  }

  assertPortableLlmConfig(input: {
    runtimeKind: RuntimeKind;
    llmConfig: Record<string, unknown> | null;
    path: string;
  }): void {
    if (!input.llmConfig) return;
    assertSchema(
      input.llmConfig,
      applicationPortableSchemaForRuntime(input.runtimeKind),
      input.path,
    );
    if (
      input.runtimeKind === RuntimeKind.CODEX_APP_SERVER
      && input.llmConfig.service_tier !== undefined
      && input.llmConfig.service_tier !== "fast"
    ) {
      fail(`${input.path}.service_tier`, "must be 'fast'");
    }
  }
}
