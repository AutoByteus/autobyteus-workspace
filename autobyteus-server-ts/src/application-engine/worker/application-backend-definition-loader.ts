import { pathToFileURL } from "node:url";
import {
  APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION,
  type ApplicationBackendDefinition,
  type ApplicationBackendExposureSummary,
  type ApplicationStorageContext,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationWorkerLoadDefinitionInput } from "../runtime/protocol.js";

export type LoadedApplicationDefinition = {
  applicationId: string;
  definition: ApplicationBackendDefinition;
  storage: ApplicationStorageContext;
  exposures: ApplicationBackendExposureSummary;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveDefinition = (namespace: Record<string, unknown>): ApplicationBackendDefinition => {
  const candidate = namespace.default ?? namespace.application ?? namespace;
  if (!isRecord(candidate)) throw new Error("Application backend entry module must export an application definition object.");
  return candidate as ApplicationBackendDefinition;
};

const validateDefinitionShape = (definition: ApplicationBackendDefinition): void => {
  const record = definition as unknown as Record<string, unknown>;
  const allowed = new Set([
    "definitionContractVersion",
    "lifecycle",
    "queries",
    "commands",
    "routes",
    "webSocketRoutes",
    "graphql",
    "eventHandlers",
    "artifactHandlers",
  ]);
  const unknown = Object.keys(record).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`Application backend definition contains unsupported key '${unknown}'.`);
  if (record.webSocketRoutes !== undefined && !Array.isArray(record.webSocketRoutes)) {
    throw new Error("Application backend webSocketRoutes must be an array when provided.");
  }
};

const validateExposures = (
  definition: ApplicationBackendDefinition,
  supported: ApplicationBackendExposureSummary["supportedExposures"],
): void => {
  if (!supported.queries && Object.keys(definition.queries ?? {}).length) throw new Error("Backend manifest disables queries, but the app definition exposes queries.");
  if (!supported.commands && Object.keys(definition.commands ?? {}).length) throw new Error("Backend manifest disables commands, but the app definition exposes commands.");
  if (!supported.routes && (definition.routes?.length ?? 0) > 0) throw new Error("Backend manifest disables routes, but the app definition exposes routes.");
  if (!supported.webSockets && (definition.webSocketRoutes?.length ?? 0) > 0) throw new Error("Backend manifest disables webSockets, but the app definition exposes webSocketRoutes.");
  if (!supported.graphql && definition.graphql) throw new Error("Backend manifest disables graphql, but the app definition exposes graphql.");
  if (!supported.eventHandlers && Object.keys(definition.eventHandlers ?? {}).length) throw new Error("Backend manifest disables eventHandlers, but the app definition exposes eventHandlers.");
  if (!supported.eventHandlers && definition.artifactHandlers?.persisted) throw new Error("Backend manifest disables eventHandlers, but the app definition exposes artifactHandlers.");
};


const normalizeWebSocketRoutePattern = (value: string): Array<{ kind: "literal"; value: string } | { kind: "param"; value: string }> => {
  const normalized = value.trim();
  if (!normalized || normalized.includes("?") || normalized.includes("#") || normalized.includes("://")) {
    throw new Error("Application WebSocket route path is invalid.");
  }
  const rawSegments = normalized.replace(/^\/+/, "").split("/");
  if (rawSegments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Application WebSocket route path '${value}' is invalid.`);
  }
  const parameters = new Set<string>();
  return rawSegments.map((segment) => {
    if (!segment.startsWith(":")) return { kind: "literal" as const, value: segment };
    const name = segment.slice(1);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Application WebSocket route path '${value}' has an invalid parameter.`);
    }
    if (parameters.has(name)) {
      throw new Error(`Application WebSocket route path '${value}' has a duplicate parameter '${name}'.`);
    }
    parameters.add(name);
    return { kind: "param" as const, value: name };
  });
};

const validateWebSocketRoutes = (definition: ApplicationBackendDefinition): void => {
  const patterns = (definition.webSocketRoutes ?? []).map((route, index) => {
    if (!isRecord(route)) {
      throw new Error(`Application WebSocket route at index ${index} must be an object.`);
    }
    const unknown = Object.keys(route).find((key) => key !== "path" && key !== "open");
    if (unknown) {
      throw new Error(`Application WebSocket route at index ${index} contains unsupported key '${unknown}'.`);
    }
    if (typeof route.path !== "string" || typeof route.open !== "function") {
      throw new Error(`Application WebSocket route at index ${index} must declare a string path and open handler.`);
    }
    return { route, segments: normalizeWebSocketRoutePattern(route.path) };
  });
  for (let leftIndex = 0; leftIndex < patterns.length; leftIndex += 1) {
    const left = patterns[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < patterns.length; rightIndex += 1) {
      const right = patterns[rightIndex]!;
      if (left.segments.length !== right.segments.length) continue;
      const ambiguous = left.segments.every((segment, index) => {
        const candidate = right.segments[index]!;
        return segment.kind === "param" || candidate.kind === "param" || segment.value === candidate.value;
      });
      if (ambiguous) {
        throw new Error(`Application WebSocket routes '${left.route.path}' and '${right.route.path}' are ambiguous.`);
      }
    }
  }
};

const EVENT_FAMILY_BY_HANDLER_KEY = {
  runStarted: "RUN_STARTED",
  runTerminated: "RUN_TERMINATED",
  runFailed: "RUN_FAILED",
  runOrphaned: "RUN_ORPHANED",
} as const;

export class ApplicationBackendDefinitionLoader {
  async load(input: ApplicationWorkerLoadDefinitionInput): Promise<LoadedApplicationDefinition> {
    const namespace = await import(pathToFileURL(input.entryModulePath).href);
    const definition = resolveDefinition(namespace as Record<string, unknown>);
    validateDefinitionShape(definition);
    if (definition.definitionContractVersion !== APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION) {
      throw new Error(`Unsupported application backend definitionContractVersion '${String(definition.definitionContractVersion)}'.`);
    }
    validateExposures(definition, input.supportedExposures);
    validateWebSocketRoutes(definition);
    return {
      applicationId: input.applicationId,
      definition,
      storage: input.storage,
      exposures: {
        supportedExposures: input.supportedExposures,
        queries: Object.keys(definition.queries ?? {}).sort(),
        commands: Object.keys(definition.commands ?? {}).sort(),
        routes: (definition.routes ?? []).map(({ method, path }) => ({ method, path })),
        webSocketRoutes: (definition.webSocketRoutes ?? []).map(({ path }) => ({ path })),
        graphql: Boolean(definition.graphql),
        notifications: input.supportedExposures.notifications,
        eventHandlers: Object.keys(definition.eventHandlers ?? {}).flatMap((key) => {
          const family = EVENT_FAMILY_BY_HANDLER_KEY[key as keyof typeof EVENT_FAMILY_BY_HANDLER_KEY];
          return family ? [family] : [];
        }),
      },
    };
  }
}

export const normalizeApplicationRoutePath = (value: string): string => {
  const normalized = value.trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

export const matchApplicationPath = <T extends { path: string }>(
  routes: T[],
  requestPathValue: string,
): { route: T; params: Record<string, string> } | null => {
  const requestPath = normalizeApplicationRoutePath(requestPathValue).split("/").filter(Boolean);
  for (const route of routes) {
    const routeParts = normalizeApplicationRoutePath(route.path).split("/").filter(Boolean);
    if (routeParts.length !== requestPath.length) continue;
    const params: Record<string, string> = {};
    let matches = true;
    routeParts.forEach((part, index) => {
      if (!matches) return;
      if (part.startsWith(":")) params[part.slice(1)] = requestPath[index]!;
      else if (part !== requestPath[index]) matches = false;
    });
    if (matches) return { route, params };
  }
  return null;
};
