import { builtinModules } from "node:module";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseVueSfc } from "@vue/compiler-sfc";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";

type AfbPolicyId = "AFB-001" | "AFB-002" | "AFB-003" | "AFB-004" | "AFB-005";

type ProjectProfileName =
  | "server"
  | "studio-web"
  | "brief-backend"
  | "brief-frontend"
  | "socratic-backend"
  | "socratic-frontend"
  | `devkit-template:${string}`;

type ProjectProfile = {
  name: ProjectProfileName;
  projectRoot: string;
  manifestPath: string;
  compilerOptions: ts.CompilerOptions;
};

type Resolution =
  | { kind: "source"; resolvedPath: string }
  | { kind: "builtin"; packageName: string }
  | { kind: "bare"; packageName: string }
  | { kind: "unresolved" };

type ImportEdge = {
  specifier: string;
  line: number;
  column: number;
  importedNames?: readonly string[];
};

type ImportBinding = {
  kind: "named" | "namespace";
  exportedName?: string;
  resolution: Resolution;
};

type ParsedSource = {
  diagnosticImporter: string;
  resolutionOrigin: string;
  sourceFile: ts.SourceFile;
  lineOffset: number;
  edges: ImportEdge[];
  bindings: Map<string, ImportBinding>;
};

type BoundaryViolation = {
  policy: AfbPolicyId;
  profile: ProjectProfileName;
  importer: string;
  sourceOrigin?: string;
  line: number;
  column: number;
  subject: string;
  resolvedDependency?: string;
  reason: string;
  correction: string;
};

type RequiredInput =
  | { kind: "object-property"; argumentIndex: number; path: string }
  | { kind: "positional"; argumentIndex: number; label: string };

type ConstructionObligation = {
  family: "publication-resource" | "run" | "session-provider" | "team-context";
  symbol: string;
  moduleSuffix?: string;
  kind: "new" | "method";
  requiredInputs: readonly RequiredInput[];
};

type ConstructionOccurrence = {
  obligation: ConstructionObligation;
  node: ts.NewExpression | ts.CallExpression;
  parsed: ParsedSource;
};

type CheckResult = {
  violations: BoundaryViolation[];
  governedFiles: Map<AfbPolicyId, string[]>;
  constructionCounts: Map<string, number>;
  vueFiles: string[];
  templateProfiles: string[];
};

type DirectGlobalCallee = {
  symbol: string;
  exportName: string;
  member?: string;
  moduleSuffix: string;
};

const THIS_FILE = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(THIS_FILE), "../../..");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue"]);
const NODE_BUILTINS = new Set(
  builtinModules.flatMap((name) => [name, name.replace(/^node:/, "")]),
);

const CORRECTIONS: Record<AfbPolicyId, string> = {
  "AFB-001": "Use application-platform-runtime-contracts.ts or an exact subject input supplied by the assembly root.",
  "AFB-002": "Use the declared GraphQL package/query/command contract or an application SDK/presentation-local helper.",
  "AFB-003": "Keep package/bundle code on its owned contracts; only the catalog refresh coordinator may call catalog reconciliation.",
  "AFB-004": "Inject the named application-scoped dependency; move genuine process construction to a named assembly owner.",
  "AFB-005": "Use project-local source, an application SDK, a Node built-in, or a library declared by this project's manifest.",
};

type ForbiddenTargetRule = {
  category: string;
  matches: (relativeTarget: string) => boolean;
};

const SERVER_SOURCE_PREFIX = "autobyteus-server-ts/src/";
const APPLICATION_RUNTIME_CONTRACT = `${SERVER_SOURCE_PREFIX}application-platform/runtime/application-platform-runtime-contracts.ts`;

const AFB_001_FORBIDDEN_TARGET_RULES: readonly ForbiddenTargetRule[] = [
  {
    category: "lifecycle",
    matches: (target) => target === `${SERVER_SOURCE_PREFIX}application-platform/runtime/application-platform-lifecycle.ts`,
  },
  {
    category: "stores",
    matches: (target) => [
      `${SERVER_SOURCE_PREFIX}application-orchestration/stores/`,
      `${SERVER_SOURCE_PREFIX}application-packages/stores/`,
      `${SERVER_SOURCE_PREFIX}application-storage/stores/`,
    ].some((prefix) => target.startsWith(prefix)),
  },
  {
    category: "recovery",
    matches: (target) => target === `${SERVER_SOURCE_PREFIX}application-orchestration/services/application-orchestration-recovery-service.ts`,
  },
  {
    category: "availability",
    matches: (target) => [
      `${SERVER_SOURCE_PREFIX}application-orchestration/services/application-availability-service.ts`,
      `${SERVER_SOURCE_PREFIX}application-platform/runtime/application-availability-state-registry.ts`,
    ].includes(target),
  },
  {
    category: "run",
    matches: (target) => [
      `${SERVER_SOURCE_PREFIX}agent-execution/runtime/`,
      `${SERVER_SOURCE_PREFIX}agent-execution/services/`,
      `${SERVER_SOURCE_PREFIX}agent-team-execution/services/`,
    ].some((prefix) => target.startsWith(prefix))
      || target.startsWith(`${SERVER_SOURCE_PREFIX}application-orchestration/services/application-run-`)
      || target.startsWith(`${SERVER_SOURCE_PREFIX}application-orchestration/services/application-bound-run-`),
  },
  {
    category: "session",
    matches: (target) => target.startsWith(`${SERVER_SOURCE_PREFIX}agent-tools/mcp/`),
  },
  {
    category: "queue",
    matches: (target) => [
      `${SERVER_SOURCE_PREFIX}application-orchestration/services/application-execution-event-dispatch-queue.ts`,
      `${SERVER_SOURCE_PREFIX}application-orchestration/services/application-published-artifact-delivery-queue.ts`,
    ].includes(target),
  },
  {
    category: "publication",
    matches: (target) => target.startsWith(`${SERVER_SOURCE_PREFIX}services/published-artifacts/`)
      || target.startsWith(`${SERVER_SOURCE_PREFIX}application-orchestration/services/application-published-artifact-`),
  },
  {
    category: "engine",
    matches: (target) => target.startsWith(`${SERVER_SOURCE_PREFIX}application-engine/`),
  },
  {
    category: "shutdown",
    matches: (target) => target === `${SERVER_SOURCE_PREFIX}application-platform/runtime/application-run-shutdown-coordinator.ts`,
  },
  {
    category: "runtime-builder",
    matches: (target) => target.startsWith(`${SERVER_SOURCE_PREFIX}application-platform/runtime/`)
      && target !== APPLICATION_RUNTIME_CONTRACT,
  },
];

const afb001ForbiddenTargetCategory = (
  relativeTarget: string,
  edge: ImportEdge,
  allowAvailabilityErrorContract: boolean,
): string | null => {
  if (relativeTarget === APPLICATION_RUNTIME_CONTRACT) return null;
  if (allowAvailabilityErrorContract
    && relativeTarget === `${SERVER_SOURCE_PREFIX}application-orchestration/services/application-availability-service.ts`
    && edge.importedNames?.length === 1
    && edge.importedNames[0] === "ApplicationUnavailableError") return null;
  return AFB_001_FORBIDDEN_TARGET_RULES.find((rule) => rule.matches(relativeTarget))?.category ?? null;
};

const isApplicationRuntimeImplementation = (relativeTarget: string): boolean =>
  relativeTarget !== APPLICATION_RUNTIME_CONTRACT
  && ([
    `${SERVER_SOURCE_PREFIX}application-platform/`,
    `${SERVER_SOURCE_PREFIX}application-orchestration/`,
    `${SERVER_SOURCE_PREFIX}application-engine/`,
    `${SERVER_SOURCE_PREFIX}application-storage/`,
    `${SERVER_SOURCE_PREFIX}agent-execution/runtime/`,
    `${SERVER_SOURCE_PREFIX}agent-tools/mcp/`,
    `${SERVER_SOURCE_PREFIX}services/published-artifacts/`,
  ].some((prefix) => relativeTarget.startsWith(prefix)));

const isStudioPresentationTarget = (relativeTarget: string): boolean =>
  relativeTarget.startsWith("autobyteus-web/components/applications/")
  || relativeTarget.startsWith("autobyteus-web/utils/application/")
  || relativeTarget === "autobyteus-web/composables/useRuntimeScopedModelSelection.ts";

const DIRECT_GLOBAL_CALLEES: readonly DirectGlobalCallee[] = [
  {
    symbol: "AgentRunManager.getInstance",
    exportName: "AgentRunManager",
    member: "getInstance",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts",
  },
  {
    symbol: "AgentTeamRunManager.getInstance",
    exportName: "AgentTeamRunManager",
    member: "getInstance",
    moduleSuffix: "autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts",
  },
  {
    symbol: "AgentToolMcpSessionService.getInstance",
    exportName: "AgentToolMcpSessionService",
    member: "getInstance",
    moduleSuffix: "autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts",
  },
  {
    symbol: "getAgentToolMcpSessionService",
    exportName: "getAgentToolMcpSessionService",
    moduleSuffix: "autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts",
  },
  {
    symbol: "getGeneralProcessPublishedArtifactPublisher",
    exportName: "getGeneralProcessPublishedArtifactPublisher",
    moduleSuffix: "autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts",
  },
  {
    symbol: "createGeneralProcessPublishedArtifactPublisher",
    exportName: "createGeneralProcessPublishedArtifactPublisher",
    moduleSuffix: "autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts",
  },
  {
    symbol: "createGeneralProcessPublishedArtifactRelayService",
    exportName: "createGeneralProcessPublishedArtifactRelayService",
    moduleSuffix: "autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts",
  },
];

const CONSTRUCTION_OBLIGATIONS: readonly ConstructionObligation[] = [
  {
    family: "publication-resource",
    symbol: "AgentRunResourceManager",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts",
    kind: "new",
    requiredInputs: ["sessionScope", "runFileChangeService", "publishedArtifactRelayService", "memoryRecorder"].map(
      (path) => ({ kind: "object-property" as const, argumentIndex: 0, path }),
    ),
  },
  {
    family: "publication-resource",
    symbol: "AgentRunActivationRegistry",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts",
    kind: "new",
    requiredInputs: [{ kind: "positional", argumentIndex: 0, label: "agentRunResourceManager" }],
  },
  {
    family: "publication-resource",
    symbol: "PublishedArtifactPublicationService",
    moduleSuffix: "autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts",
    kind: "new",
    requiredInputs: ["activeRunReader", "publishedArtifactRelayService", "projectionStore", "snapshotStore"].map(
      (path) => ({ kind: "object-property" as const, argumentIndex: 0, path }),
    ),
  },
  {
    family: "publication-resource",
    symbol: "PublishedArtifactProjectionService",
    moduleSuffix: "autobyteus-server-ts/src/run-history/services/published-artifact-projection-service.ts",
    kind: "new",
    requiredInputs: ["activeRunReader", "metadataService", "projectionStore", "snapshotStore"].map(
      (path) => ({ kind: "object-property" as const, argumentIndex: 0, path }),
    ),
  },
  {
    family: "run",
    symbol: "AgentRunManager",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts",
    kind: "new",
    requiredInputs: ["autoByteusBackendFactory", "codexBackendFactory", "claudeBackendFactory", "activationRegistry", "memoryRecorder"].map(
      (path) => ({ kind: "object-property" as const, argumentIndex: 0, path }),
    ),
  },
  {
    family: "run",
    symbol: "AgentRunIdentityAllocator",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts",
    kind: "new",
    requiredInputs: ["agentDefinitionService", "agentRunManager", "agentRunMetadataService", "teamRunExecutionTreeLocationService", "memoryDir"].map(
      (path) => ({ kind: "object-property" as const, argumentIndex: 0, path }),
    ),
  },
  {
    family: "run",
    symbol: "AgentRunProvisioningService",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts",
    kind: "new",
    requiredInputs: ["agentRunManager", "metadataService", "historyCatalogService", "workspaceManager", "agentRunIdentityAllocator"].map((path) => ({
      kind: "object-property" as const,
      argumentIndex: 1,
      path,
    })),
  },
  {
    family: "run",
    symbol: "StandaloneAgentRunLifecycleService",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts",
    kind: "new",
    requiredInputs: ["agentRunManager", "metadataService", "historyCatalogService", "workspaceManager", "tokenUsageReadiness"].map((path) => ({
      kind: "object-property" as const,
      argumentIndex: 1,
      path,
    })),
  },
  {
    family: "run",
    symbol: "AgentRunService",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts",
    kind: "new",
    requiredInputs: ["agentRunManager", "metadataService", "historyCatalogService", "workspaceManager", "agentRunIdentityAllocator", "provisioningService", "lifecycleService"].map((path) => ({
      kind: "object-property" as const,
      argumentIndex: 1,
      path,
    })),
  },
  {
    family: "session-provider",
    symbol: "ApplicationAgentToolsSessionFactory.createApplicationSessionManager",
    kind: "method",
    requiredInputs: [
      { kind: "object-property", argumentIndex: 0, path: "scope" },
      { kind: "object-property", argumentIndex: 0, path: "executionCapabilities.publishedArtifactPublisher" },
      { kind: "object-property", argumentIndex: 0, path: "assertExecutionCapabilitiesReady" },
    ],
  },
  {
    family: "session-provider",
    symbol: "AutoByteusAgentRunBackendFactory",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts",
    kind: "new",
    requiredInputs: [{ kind: "object-property", argumentIndex: 0, path: "agentDefinitionService" }],
  },
  {
    family: "session-provider",
    symbol: "CodexAgentRunBackendFactory",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts",
    kind: "new",
    requiredInputs: [{ kind: "positional", argumentIndex: 1, label: "codexThreadBootstrapper" }],
  },
  {
    family: "session-provider",
    symbol: "ClaudeAgentRunBackendFactory",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts",
    kind: "new",
    requiredInputs: [
      { kind: "positional", argumentIndex: 0, label: "claudeSessionManager" },
      { kind: "positional", argumentIndex: 1, label: "claudeSessionBootstrapper" },
    ],
  },
  {
    family: "session-provider",
    symbol: "CodexThreadBootstrapper",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts",
    kind: "new",
    requiredInputs: [
      { kind: "positional", argumentIndex: 2, label: "agentDefinitionService" },
      { kind: "positional", argumentIndex: 5, label: "agentToolsSessionManager" },
    ],
  },
  {
    family: "session-provider",
    symbol: "ClaudeSessionManager",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts",
    kind: "new",
    requiredInputs: [{ kind: "positional", argumentIndex: 2, label: "agentToolsSessionManager" }],
  },
  {
    family: "session-provider",
    symbol: "ClaudeSessionBootstrapper",
    moduleSuffix: "autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts",
    kind: "new",
    requiredInputs: [{ kind: "positional", argumentIndex: 2, label: "agentDefinitionService" }],
  },
  {
    family: "team-context",
    symbol: "MemberTeamContextBuilder",
    moduleSuffix: "autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts",
    kind: "new",
    requiredInputs: [{ kind: "positional", argumentIndex: 0, label: "agentTeamDefinitionService" }],
  },
  {
    family: "team-context",
    symbol: "MixedTeamRunBackendFactory",
    moduleSuffix: "autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts",
    kind: "new",
    requiredInputs: ["createTeamManager"].map((path) => ({
      kind: "object-property" as const,
      argumentIndex: 0,
      path,
    })),
  },
  {
    family: "team-context",
    symbol: "MixedTeamManager",
    moduleSuffix: "autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts",
    kind: "new",
    requiredInputs: [
      "subTeamRunFactory",
      "agentRunManager",
      "agentToolMcpSessionManager",
      "memoryLocationService",
      "activityInspector",
      "memberTeamContextBuilder",
      "workspaceManager",
      "taskRootResolver",
      "publish",
      "deliverInterAgentMessage",
      "acceptPlatformBinding",
    ].map(
      (path) => ({ kind: "object-property" as const, argumentIndex: 1, path }),
    ),
  },
  {
    family: "team-context",
    symbol: "AgentTeamRunManager",
    moduleSuffix: "autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts",
    kind: "new",
    requiredInputs: ["memoryDir", "mixedTeamRunBackendFactory", "executionTreeStore", "taskRecordsStore", "communicationStore"].map((path) => ({
      kind: "object-property" as const,
      argumentIndex: 0,
      path,
    })),
  },
  {
    family: "team-context",
    symbol: "TeamRunHistoryCatalogService",
    moduleSuffix: "autobyteus-server-ts/src/run-history/services/team-run-history-catalog-service.ts",
    kind: "new",
    requiredInputs: [{ kind: "object-property", argumentIndex: 1, path: "teamRunManager" }],
  },
  {
    family: "team-context",
    symbol: "TeamRunService",
    moduleSuffix: "autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts",
    kind: "new",
    requiredInputs: [
      "agentTeamRunManager",
      "teamDefinitionService",
      "agentRunIdentityAllocator",
      "teamRunIdentityAllocator",
      "teamRunHistoryCatalogService",
      "workspaceManager",
      "memoryDir",
      "memoryLocationService",
      "tokenUsageReadiness",
    ].map((path) => ({ kind: "object-property" as const, argumentIndex: 0, path })),
  },
];

const normalizePath = (path: string): string => path.split(sep).join("/");

const pathIsInside = (candidate: string, parent: string): boolean => {
  const relativePath = relative(parent, candidate);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
};

const canonicalPackageName = (specifier: string): string => {
  if (specifier.startsWith("@")) {
    return specifier.split("/").slice(0, 2).join("/");
  }
  return specifier.split("/")[0] ?? specifier;
};

const isNullOrUndefined = (node: ts.Expression | undefined): boolean =>
  !node
  || node.kind === ts.SyntaxKind.NullKeyword
  || (ts.isIdentifier(node) && node.text === "undefined")
  || ts.isVoidExpression(node);

const propertyNameText = (name: ts.PropertyName): string | null => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
};

const objectPropertyValue = (
  object: ts.ObjectLiteralExpression,
  pathParts: readonly string[],
): ts.Expression | undefined => {
  const [head, ...rest] = pathParts;
  if (!head) {
    return object;
  }
  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property) || !property.name || propertyNameText(property.name) !== head) {
      continue;
    }
    let value: ts.Expression | undefined;
    if (ts.isPropertyAssignment(property)) {
      value = property.initializer;
    } else if (ts.isShorthandPropertyAssignment(property)) {
      value = property.name;
    } else if (ts.isMethodDeclaration(property) && ts.isIdentifier(property.name)) {
      value = property.name;
    }
    if (rest.length === 0) {
      return value;
    }
    if (!value || !ts.isObjectLiteralExpression(value)) {
      return undefined;
    }
    return objectPropertyValue(value, rest);
  }
  return undefined;
};

const objectContainsSpread = (object: ts.ObjectLiteralExpression): boolean =>
  object.properties.some((property) => {
    if (ts.isSpreadAssignment(property)) {
      return true;
    }
    return ts.isPropertyAssignment(property)
      && ts.isObjectLiteralExpression(property.initializer)
      && objectContainsSpread(property.initializer);
  });

const scriptKindFor = (filePath: string, language?: string): ts.ScriptKind => {
  const normalizedLanguage = language?.toLowerCase();
  if (normalizedLanguage === "ts") return ts.ScriptKind.TS;
  if (normalizedLanguage === "tsx") return ts.ScriptKind.TSX;
  if (normalizedLanguage === "js") return ts.ScriptKind.JS;
  if (normalizedLanguage === "jsx") return ts.ScriptKind.JSX;
  switch (extname(filePath)) {
    case ".tsx": return ts.ScriptKind.TSX;
    case ".js":
    case ".mjs":
    case ".cjs": return ts.ScriptKind.JS;
    case ".jsx": return ts.ScriptKind.JSX;
    default: return ts.ScriptKind.TS;
  }
};

const walkSourceFiles = (root: string): string[] => {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", "dist", ".build", ".nuxt"].includes(entry.name)) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (SOURCE_EXTENSIONS.has(extname(entry.name)) && !entry.name.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  };
  visit(root);
  return files.sort();
};

const readJson = (filePath: string): Record<string, unknown> =>
  JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;

const loadTsConfig = (configPath: string, projectRoot: string): ts.CompilerOptions => {
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) {
    throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, "\n"));
  }
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, projectRoot, undefined, configPath);
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"));
  }
  return parsed.options;
};

class ApplicationFrameworkBoundaryChecker {
  readonly repositoryRoot: string;
  readonly serverRoot: string;
  readonly webRoot: string;
  readonly briefRoot: string;
  readonly socraticRoot: string;
  readonly templatesRoot: string;
  private readonly profileCache = new Map<ProjectProfileName, ProjectProfile>();

  constructor(repositoryRoot: string) {
    this.repositoryRoot = realpathSync(repositoryRoot);
    this.serverRoot = join(this.repositoryRoot, "autobyteus-server-ts");
    this.webRoot = join(this.repositoryRoot, "autobyteus-web");
    this.briefRoot = join(this.repositoryRoot, "applications/brief-studio");
    this.socraticRoot = join(this.repositoryRoot, "applications/socratic-math-teacher");
    this.templatesRoot = join(this.repositoryRoot, "autobyteus-application-devkit/templates");
  }

  checkCurrentTree(assertOccurrences = true): CheckResult {
    const governedFiles = this.discoverGovernedFiles();
    const violations: BoundaryViolation[] = [];
    const constructionCounts = new Map<string, number>();
    const vueFiles = new Set<string>();

    for (const [policy, files] of governedFiles) {
      for (const importer of files) {
        if (extname(importer) === ".vue") vueFiles.add(importer);
        const profile = this.profileFor(importer);
        const parsedResult = this.parseImporter(importer, profile, policy);
        violations.push(...parsedResult.violations);
        for (const parsed of parsedResult.sources) {
          for (const edge of parsed.edges) {
            const resolution = this.resolveSpecifier(edge.specifier, parsed.resolutionOrigin, profile);
            const violation = this.evaluateImport(
              policy,
              profile,
              parsed.diagnosticImporter,
              parsed.resolutionOrigin,
              edge,
              resolution,
            );
            if (violation) violations.push(violation);
          }
          if (policy === "AFB-004") {
            const constructionResult = this.evaluateApplicationConstruction(profile, parsed);
            violations.push(...constructionResult.violations);
            for (const occurrence of constructionResult.occurrences) {
              constructionCounts.set(
                occurrence.obligation.symbol,
                (constructionCounts.get(occurrence.obligation.symbol) ?? 0) + 1,
              );
            }
            violations.push(...this.evaluateDirectGlobalCalls(profile, parsed));
          }
        }
      }
    }

    if (assertOccurrences) {
      const expectedImporter = join(
        this.serverRoot,
        "src/application-platform/runtime/create-application-run-services.ts",
      );
      for (const obligation of CONSTRUCTION_OBLIGATIONS) {
        const count = constructionCounts.get(obligation.symbol) ?? 0;
        if (count !== 1) {
          violations.push(this.violation({
            policy: "AFB-004",
            profile: this.profileFor(expectedImporter),
            importer: expectedImporter,
            line: 1,
            column: 1,
            subject: obligation.symbol,
            reason: `CURRENT_TREE_OCCURRENCE_MISMATCH expected=1 actual=${count}`,
          }));
        }
      }
    }

    return {
      violations,
      governedFiles,
      constructionCounts,
      vueFiles: [...vueFiles].sort(),
      templateProfiles: this.discoverTemplateProfiles(),
    };
  }

  checkOneFile(importer: string, policy: AfbPolicyId): BoundaryViolation[] {
    const canonicalImporter = realpathSync(importer);
    const profile = this.profileFor(canonicalImporter);
    const result = this.parseImporter(canonicalImporter, profile, policy);
    const violations = [...result.violations];
    for (const parsed of result.sources) {
      for (const edge of parsed.edges) {
        const resolution = this.resolveSpecifier(edge.specifier, parsed.resolutionOrigin, profile);
        const violation = this.evaluateImport(
          policy,
          profile,
          parsed.diagnosticImporter,
          parsed.resolutionOrigin,
          edge,
          resolution,
        );
        if (violation) violations.push(violation);
      }
      if (policy === "AFB-004") {
        violations.push(...this.evaluateApplicationConstruction(profile, parsed).violations);
        violations.push(...this.evaluateDirectGlobalCalls(profile, parsed));
      }
    }
    return violations;
  }

  extractSpecifiers(importer: string): string[] {
    const canonicalImporter = realpathSync(importer);
    const profile = this.profileFor(canonicalImporter);
    const result = this.parseImporter(
      canonicalImporter,
      profile,
      this.policiesFor(canonicalImporter)[0] ?? "AFB-005",
    );
    if (result.violations.length > 0) throw new Error(result.violations.map(formatViolation).join("\n"));
    return result.sources.flatMap((source) => source.edges.map((edge) => edge.specifier));
  }

  assertNamedAssemblySelections(): void {
    const assemblyFiles = [
      join(this.serverRoot, "src/compositions/build-studio-server.ts"),
      join(this.serverRoot, "src/standalone-application-host/start-standalone-application-host.ts"),
    ];
    for (const importer of assemblyFiles) {
      const source = readFileSync(importer, "utf8");
      expect(source).toContain("getGeneralProcessPublishedArtifactPublisher");
      expect(source).toContain("createGeneralProcessRunSupervisor");
    }
    const applicationConstruction = join(
      this.serverRoot,
      "src/application-platform/runtime/create-application-run-services.ts",
    );
    const source = readFileSync(applicationConstruction, "utf8");
    expect(source).not.toContain("getGeneralProcessPublishedArtifactPublisher");
    expect(source).not.toContain("createGeneralProcessPublishedArtifactPublisher");
    expect(source).not.toContain("createGeneralProcessPublishedArtifactRelayService");
    expect(source).not.toContain("createGeneralProcessRunSupervisor");
  }

  private discoverGovernedFiles(): Map<AfbPolicyId, string[]> {
    const result = new Map<AfbPolicyId, string[]>();
    const add = (policy: AfbPolicyId, files: string[]): void => {
      result.set(policy, [...new Set(files)].sort());
    };

    add("AFB-001", [
      ...walkSourceFiles(join(this.serverRoot, "src/api/rest")),
      ...walkSourceFiles(join(this.serverRoot, "src/api/websocket")),
      ...walkSourceFiles(join(this.serverRoot, "src/standalone-application-host/api")),
      join(this.serverRoot, "src/standalone-application-host/services/standalone-application-bootstrap-service.ts"),
    ].filter(existsSync));

    const webFiles = [
      ...walkSourceFiles(join(this.webRoot, "components/applications")),
      ...walkSourceFiles(join(this.webRoot, "utils/application")),
      join(this.webRoot, "composables/useRuntimeScopedModelSelection.ts"),
    ].filter((file) => existsSync(file) && !this.isTestFile(file));
    add("AFB-002", [
      ...walkSourceFiles(join(this.serverRoot, "src/api/graphql")),
      ...webFiles,
    ]);

    add("AFB-003", [
      ...walkSourceFiles(join(this.serverRoot, "src/application-packages")),
      ...walkSourceFiles(join(this.serverRoot, "src/application-bundles")),
    ]);

    add("AFB-004", [
      ...walkSourceFiles(join(this.serverRoot, "src/application-platform/runtime")),
      join(this.serverRoot, "src/agent-tools/mcp/application-agent-tool-mcp-session-scope.ts"),
      join(this.serverRoot, "src/agent-tools/mcp/scoped-agent-tool-mcp-session-manager.ts"),
      join(this.serverRoot, "src/agent-tools/mcp/providers/publish-artifacts-mcp-adapter-provider.ts"),
    ].filter(existsSync));

    const applicationFiles = [
      ...walkSourceFiles(this.frontendRootFor(this.briefRoot)),
      ...walkSourceFiles(join(this.briefRoot, "backend-src")),
      ...walkSourceFiles(this.frontendRootFor(this.socraticRoot)),
      ...walkSourceFiles(join(this.socraticRoot, "backend-src")),
    ];
    for (const profileName of this.discoverTemplateProfiles()) {
      const templateName = profileName.slice("devkit-template:".length);
      applicationFiles.push(...walkSourceFiles(join(this.templatesRoot, templateName, "src")));
    }
    add("AFB-005", applicationFiles);
    return result;
  }

  private policiesFor(importer: string): AfbPolicyId[] {
    const result: AfbPolicyId[] = [];
    for (const [policy, files] of this.discoverGovernedFiles()) {
      if (files.includes(importer)) result.push(policy);
    }
    return result;
  }

  private isTestFile(file: string): boolean {
    const normalized = normalizePath(file);
    return normalized.includes("/__tests__/") || /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(normalized);
  }

  private frontendRootFor(applicationRoot: string): string {
    const configPath = join(applicationRoot, "autobyteus-app.config.mjs");
    const config = readFileSync(configPath, "utf8");
    const match = config.match(/frontendDir\s*:\s*["']([^"']+)["']/);
    if (!match?.[1]) throw new Error(`Missing source.frontendDir in ${configPath}`);
    return join(applicationRoot, match[1]);
  }

  private discoverTemplateProfiles(): `devkit-template:${string}`[] {
    if (!existsSync(this.templatesRoot)) return [];
    return readdirSync(this.templatesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) =>
        existsSync(join(this.templatesRoot, entry.name, "autobyteus-app.config.mjs"))
        && existsSync(join(this.templatesRoot, entry.name, "package.json")))
      .map((entry) => `devkit-template:${entry.name}` as const)
      .sort();
  }

  private profileFor(importer: string): ProjectProfile {
    importer = realpathSync(importer);
    let name: ProjectProfileName;
    if (pathIsInside(importer, this.serverRoot)) name = "server";
    else if (pathIsInside(importer, this.webRoot)) name = "studio-web";
    else if (pathIsInside(importer, join(this.briefRoot, "backend-src"))) name = "brief-backend";
    else if (pathIsInside(importer, this.frontendRootFor(this.briefRoot))) name = "brief-frontend";
    else if (pathIsInside(importer, join(this.socraticRoot, "backend-src"))) name = "socratic-backend";
    else if (pathIsInside(importer, this.frontendRootFor(this.socraticRoot))) name = "socratic-frontend";
    else {
      const templateRoot = readdirSync(this.templatesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .find((templateName) => pathIsInside(importer, join(this.templatesRoot, templateName, "src")));
      if (!templateRoot) throw new Error(`No governed project profile for ${importer}`);
      name = `devkit-template:${templateRoot}`;
    }

    const cached = this.profileCache.get(name);
    if (cached) return cached;
    let profile: ProjectProfile;
    if (name === "server") {
      profile = {
        name,
        projectRoot: this.serverRoot,
        manifestPath: join(this.serverRoot, "package.json"),
        compilerOptions: loadTsConfig(join(this.serverRoot, "tsconfig.json"), this.serverRoot),
      };
    } else if (name === "studio-web") {
      const configPath = join(this.webRoot, "tsconfig.json");
      const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
      if (loaded.error) throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, "\n"));
      profile = {
        name,
        projectRoot: this.webRoot,
        manifestPath: join(this.webRoot, "package.json"),
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.NodeNext,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
          allowJs: true,
        },
      };
    } else if (name.endsWith("-backend")) {
      const projectRoot = name.startsWith("brief") ? this.briefRoot : this.socraticRoot;
      profile = {
        name,
        projectRoot,
        manifestPath: join(projectRoot, "package.json"),
        compilerOptions: loadTsConfig(join(projectRoot, "tsconfig.backend.json"), projectRoot),
      };
    } else {
      const projectRoot = name === "brief-frontend"
        ? this.briefRoot
        : name === "socratic-frontend"
          ? this.socraticRoot
          : join(this.templatesRoot, name.slice("devkit-template:".length));
      if (name.startsWith("devkit-template:")) {
        readFileSync(join(projectRoot, "autobyteus-app.config.mjs"), "utf8");
      } else {
        this.frontendRootFor(projectRoot);
      }
      profile = {
        name,
        projectRoot,
        manifestPath: join(projectRoot, "package.json"),
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.NodeNext,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
          allowJs: true,
        },
      };
    }
    this.profileCache.set(name, profile);
    return profile;
  }

  private resolveSpecifier(specifier: string, importer: string, profile: ProjectProfile): Resolution {
    const withoutNodePrefix = specifier.replace(/^node:/, "");
    if (specifier.startsWith("node:") || NODE_BUILTINS.has(withoutNodePrefix)) {
      return { kind: "builtin", packageName: withoutNodePrefix };
    }

    let governedBase: string | null = null;
    if (profile.name === "studio-web") {
      const alias = specifier.match(/^(~|@|~~|@@)(?:\/(.*))?$/);
      if (alias) governedBase = join(profile.projectRoot, alias[2] ?? "");
    }
    if (specifier.startsWith(".")) governedBase = resolve(dirname(importer), specifier);
    else if (isAbsolute(specifier)) governedBase = specifier;
    else if (specifier.startsWith("#")) {
      const target = this.resolveManifestImport(specifier, profile);
      if (!target) return { kind: "unresolved" };
      governedBase = target;
    }

    if (governedBase) {
      const resolvedSource = this.resolveSourceCandidate(governedBase);
      return resolvedSource ? { kind: "source", resolvedPath: resolvedSource } : { kind: "unresolved" };
    }

    if (profile.name !== "server" && !specifier.startsWith(".")) {
      return { kind: "bare", packageName: canonicalPackageName(specifier) };
    }

    const resolution = ts.resolveModuleName(
      specifier,
      importer,
      profile.compilerOptions,
      ts.sys,
    ).resolvedModule;
    if (resolution?.resolvedFileName) {
      const resolvedPath = existsSync(resolution.resolvedFileName)
        ? realpathSync(resolution.resolvedFileName)
        : resolve(resolution.resolvedFileName);
      if (pathIsInside(resolvedPath, this.repositoryRoot) && !normalizePath(resolvedPath).includes("/node_modules/")) {
        return { kind: "source", resolvedPath };
      }
    }
    return { kind: "bare", packageName: canonicalPackageName(specifier) };
  }

  private resolveManifestImport(specifier: string, profile: ProjectProfile): string | null {
    const manifest = readJson(profile.manifestPath);
    const imports = manifest.imports;
    if (!imports || typeof imports !== "object" || Array.isArray(imports)) return null;
    const entries = Object.entries(imports as Record<string, unknown>);
    for (const [key, rawTarget] of entries) {
      let wildcard = "";
      if (key.includes("*")) {
        const [prefix, suffix = ""] = key.split("*");
        if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
        wildcard = specifier.slice(prefix.length, specifier.length - suffix.length);
      } else if (key !== specifier) continue;
      const selectTarget = (value: unknown): string | null => {
        if (typeof value === "string") return value;
        if (!value || typeof value !== "object" || Array.isArray(value)) return null;
        const record = value as Record<string, unknown>;
        return selectTarget(record.import ?? record.default ?? Object.values(record)[0]);
      };
      const target = selectTarget(rawTarget);
      if (!target?.startsWith("./")) return null;
      return resolve(profile.projectRoot, target.replace("*", wildcard));
    }
    return null;
  }

  private resolveSourceCandidate(base: string): string | null {
    const candidates = new Set<string>([base]);
    const extension = extname(base);
    if ([".js", ".jsx", ".mjs", ".cjs"].includes(extension)) {
      const stem = base.slice(0, -extension.length);
      for (const next of [".ts", ".tsx", extension, ".vue"]) candidates.add(`${stem}${next}`);
    } else if (!extension) {
      for (const next of [".vue", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
        candidates.add(`${base}${next}`);
        candidates.add(join(base, `index${next}`));
      }
    }
    for (const candidate of candidates) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return realpathSync(candidate);
    }
    return null;
  }

  private parseImporter(
    importer: string,
    profile: ProjectProfile,
    policy: AfbPolicyId,
  ): { sources: ParsedSource[]; violations: BoundaryViolation[] } {
    if (extname(importer) !== ".vue") {
      return this.parseScript(importer, readFileSync(importer, "utf8"), profile, policy, 0);
    }
    const source = readFileSync(importer, "utf8");
    const result = parseVueSfc(source, { filename: importer });
    if (result.errors.length > 0) {
      return {
        sources: [],
        violations: [this.violation({
          policy,
          profile,
          importer,
          line: 1,
          column: 1,
          subject: "<vue-sfc>",
          reason: `SOURCE_PARSE_ERROR ${String(result.errors[0])}`,
        })],
      };
    }
    const sources: ParsedSource[] = [];
    const violations: BoundaryViolation[] = [];
    for (const block of [result.descriptor.script, result.descriptor.scriptSetup]) {
      if (!block) continue;
      const language = (block.lang ?? "js").toLowerCase();
      if (!["ts", "tsx", "js", "jsx"].includes(language)) {
        violations.push(this.violation({
          policy,
          profile,
          importer,
          line: block.loc.start.line,
          column: block.loc.start.column,
          subject: `<script lang=${language}>`,
          reason: "UNSUPPORTED_SCRIPT_LANGUAGE",
        }));
        continue;
      }
      let blockSource = block.content;
      let sourceName = importer;
      if (block.src) {
        const externalSourceEdge: ImportEdge = {
          specifier: block.src,
          line: block.loc.start.line,
          column: block.loc.start.column,
        };
        const resolution = this.resolveSpecifier(block.src, importer, profile);
        if (resolution.kind !== "source") {
          violations.push(this.violation({
            policy,
            profile,
            importer,
            line: block.loc.start.line,
            column: block.loc.start.column,
            subject: block.src,
            reason: "UNRESOLVED_GOVERNED_IMPORT",
          }));
          continue;
        }
        const externalSourceViolation = this.evaluateImport(
          policy,
          profile,
          importer,
          importer,
          externalSourceEdge,
          resolution,
        );
        if (externalSourceViolation) {
          violations.push(externalSourceViolation);
          continue;
        }
        sourceName = resolution.resolvedPath;
        blockSource = readFileSync(sourceName, "utf8");
      }
      const parsed = this.parseScript(
        sourceName,
        blockSource,
        profile,
        policy,
        block.src ? 0 : Math.max(0, block.loc.start.line - 1),
        importer,
        language,
      );
      sources.push(...parsed.sources);
      violations.push(...parsed.violations);
    }
    return { sources, violations };
  }

  private parseScript(
    sourceName: string,
    source: string,
    profile: ProjectProfile,
    policy: AfbPolicyId,
    lineOffset: number,
    diagnosticImporter = sourceName,
    language?: string,
  ): { sources: ParsedSource[]; violations: BoundaryViolation[] } {
    const sourceFile = ts.createSourceFile(
      sourceName,
      source,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(sourceName, language),
    );
    const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
    if (parseDiagnostics.length > 0) {
      const position = sourceFile.getLineAndCharacterOfPosition(parseDiagnostics[0]?.start ?? 0);
      return {
        sources: [],
        violations: [this.violation({
          policy,
          profile,
          importer: diagnosticImporter,
          sourceOrigin: sourceName,
          line: position.line + 1 + lineOffset,
          column: position.character + 1,
          subject: "<source>",
          reason: `SOURCE_PARSE_ERROR ${ts.flattenDiagnosticMessageText(parseDiagnostics[0]!.messageText, "\n")}`,
        })],
      };
    }

    const edges: ImportEdge[] = [];
    const bindings = new Map<string, ImportBinding>();
    const addEdge = (literal: ts.StringLiteralLike, importedNames?: readonly string[]): void => {
      const position = sourceFile.getLineAndCharacterOfPosition(literal.getStart(sourceFile));
      edges.push({
        specifier: literal.text,
        line: position.line + 1 + lineOffset,
        column: position.character + 1,
        importedNames,
      });
    };

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteralLike(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        const importedNames = [
          ...(clause?.name ? ["default"] : []),
          ...(clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings) ? ["*"] : []),
          ...(clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
            ? clause.namedBindings.elements.map((element) => element.propertyName?.text ?? element.name.text)
            : []),
        ];
        addEdge(statement.moduleSpecifier, importedNames);
        const resolution = this.resolveSpecifier(statement.moduleSpecifier.text, sourceName, profile);
        if (clause?.name) bindings.set(clause.name.text, { kind: "named", exportedName: "default", resolution });
        if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          bindings.set(clause.namedBindings.name.text, { kind: "namespace", resolution });
        } else if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            bindings.set(element.name.text, {
              kind: "named",
              exportedName: element.propertyName?.text ?? element.name.text,
              resolution,
            });
          }
        }
      } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteralLike(statement.moduleSpecifier)) {
        addEdge(statement.moduleSpecifier);
      } else if (ts.isImportEqualsDeclaration(statement)
        && ts.isExternalModuleReference(statement.moduleReference)
        && statement.moduleReference.expression
        && ts.isStringLiteralLike(statement.moduleReference.expression)) {
        addEdge(statement.moduleReference.expression);
        bindings.set(statement.name.text, {
          kind: "namespace",
          resolution: this.resolveSpecifier(statement.moduleReference.expression.text, sourceName, profile),
        });
      }
    }

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)
        && (node.expression.kind === ts.SyntaxKind.ImportKeyword
          || (ts.isIdentifier(node.expression) && node.expression.text === "require"))
        && node.arguments.length === 1
        && ts.isStringLiteralLike(node.arguments[0]!)) {
        addEdge(node.arguments[0]!);
      }
      if (ts.isImportTypeNode(node)
        && ts.isLiteralTypeNode(node.argument)
        && ts.isStringLiteralLike(node.argument.literal)) {
        addEdge(node.argument.literal);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return {
      sources: [{ diagnosticImporter, resolutionOrigin: sourceName, sourceFile, lineOffset, edges, bindings }],
      violations: [],
    };
  }

  private evaluateImport(
    policy: AfbPolicyId,
    profile: ProjectProfile,
    importer: string,
    sourceOrigin: string,
    edge: ImportEdge,
    resolution: Resolution,
  ): BoundaryViolation | null {
    if (resolution.kind === "unresolved") {
      return this.violation({
        policy,
        profile,
        importer,
        sourceOrigin,
        line: edge.line,
        column: edge.column,
        subject: edge.specifier,
        reason: "UNRESOLVED_GOVERNED_IMPORT",
      });
    }

    if (policy === "AFB-001" && resolution.kind === "source") {
      const relativeTarget = normalizePath(relative(this.repositoryRoot, resolution.resolvedPath));
      const category = afb001ForbiddenTargetCategory(relativeTarget, edge, true);
      if (category) {
        return this.importViolation(
          policy,
          profile,
          importer,
          sourceOrigin,
          edge,
          resolution,
          `PRIVATE_RUNTIME_IMPORT category=${category}`,
        );
      }
    }

    if (policy === "AFB-002") {
      if (resolution.kind === "bare"
        && pathIsInside(importer, this.webRoot)
        && ["autobyteus-server-ts", "autobyteus"].includes(resolution.packageName)) {
        return this.importViolation(policy, profile, importer, sourceOrigin, edge, resolution, "HOST_IMPLEMENTATION_IMPORT");
      }
      if (resolution.kind === "source") {
        const relativeTarget = normalizePath(relative(this.repositoryRoot, resolution.resolvedPath));
        if (pathIsInside(importer, this.serverRoot)
          && isApplicationRuntimeImplementation(relativeTarget)) {
          return this.importViolation(policy, profile, importer, sourceOrigin, edge, resolution, "PRIVATE_RUNTIME_IMPORT");
        }
        if (pathIsInside(importer, this.webRoot)
          && (isApplicationRuntimeImplementation(relativeTarget)
            || relativeTarget.startsWith("autobyteus-server-ts/src/application-packages/")
            || relativeTarget.startsWith("autobyteus-server-ts/src/application-bundles/"))) {
          return this.importViolation(policy, profile, importer, sourceOrigin, edge, resolution, "HOST_IMPLEMENTATION_IMPORT");
        }
      }
    }

    if (policy === "AFB-003" && resolution.kind === "source") {
      const relativeTarget = normalizePath(relative(this.repositoryRoot, resolution.resolvedPath));
      const importerRelative = normalizePath(relative(this.repositoryRoot, importer));
      const exactException = importerRelative.endsWith(
        "autobyteus-server-ts/src/application-packages/services/application-catalog-refresh-coordinator.ts",
      ) && relativeTarget.endsWith(
        "autobyteus-server-ts/src/application-platform/runtime/application-catalog-reconciliation-service.ts",
      );
      const forbiddenPrefixes = [
        "autobyteus-server-ts/src/api/",
        "autobyteus-server-ts/src/compositions/",
        "autobyteus-server-ts/src/standalone-application-host/",
      ];
      if (!exactException
        && (forbiddenPrefixes.some((prefix) => relativeTarget.startsWith(prefix))
          || isStudioPresentationTarget(relativeTarget)
          || isApplicationRuntimeImplementation(relativeTarget))) {
        return this.importViolation(policy, profile, importer, sourceOrigin, edge, resolution, "OUTWARD_OWNER_IMPORT");
      }
    }

    if (policy === "AFB-005") {
      if (resolution.kind === "source") {
        if (!pathIsInside(resolution.resolvedPath, profile.projectRoot)) {
          return this.importViolation(policy, profile, importer, sourceOrigin, edge, resolution, "PROJECT_ESCAPE_IMPORT");
        }
      } else if (resolution.kind === "bare") {
        const forbiddenPackages = new Set([
          "autobyteus-server-ts",
          "autobyteus",
          "electron",
          "@autobyteus/application-devkit",
        ]);
        if (forbiddenPackages.has(resolution.packageName)) {
          return this.importViolation(policy, profile, importer, sourceOrigin, edge, resolution, "HOST_RUNTIME_PACKAGE_IMPORT");
        }
        if (!this.manifestDeclares(profile.manifestPath, resolution.packageName)) {
          return this.importViolation(policy, profile, importer, sourceOrigin, edge, resolution, "UNDECLARED_LIBRARY_IMPORT");
        }
      }
    }
    return null;
  }

  private manifestDeclares(manifestPath: string, packageName: string): boolean {
    const manifest = readJson(manifestPath);
    return ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].some((field) => {
      const dependencies = manifest[field];
      return dependencies && typeof dependencies === "object" && !Array.isArray(dependencies)
        && Object.hasOwn(dependencies, packageName);
    });
  }

  private evaluateDirectGlobalCalls(profile: ProjectProfile, parsed: ParsedSource): BoundaryViolation[] {
    const violations: BoundaryViolation[] = [];
    const allowedAssemblyFiles = new Set([
      normalizePath(join(this.serverRoot, "src/compositions/build-studio-server.ts")),
      normalizePath(join(this.serverRoot, "src/standalone-application-host/start-standalone-application-host.ts")),
    ]);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const match = this.matchDirectCallee(node.expression, parsed);
        if (match && !allowedAssemblyFiles.has(normalizePath(parsed.diagnosticImporter))) {
          const position = parsed.sourceFile.getLineAndCharacterOfPosition(node.expression.getStart(parsed.sourceFile));
          violations.push(this.violation({
            policy: "AFB-004",
            profile,
            importer: parsed.diagnosticImporter,
            sourceOrigin: parsed.resolutionOrigin,
            line: position.line + 1 + parsed.lineOffset,
            column: position.character + 1,
            subject: match.symbol,
            resolvedDependency: match.moduleSuffix,
            reason: "DIRECT_GLOBAL_DEFAULT_CALL",
          }));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed.sourceFile);
    return violations;
  }

  private matchDirectCallee(
    expression: ts.LeftHandSideExpression,
    parsed: ParsedSource,
  ): DirectGlobalCallee | null {
    for (const candidate of DIRECT_GLOBAL_CALLEES) {
      if (candidate.member) {
        if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== candidate.member) continue;
        const binding = this.resolveExpressionBinding(expression.expression, parsed);
        if (binding && binding.exportedName === candidate.exportName
          && this.resolutionEndsWith(binding.resolution, candidate.moduleSuffix)) return candidate;
      } else {
        const binding = this.resolveExpressionBinding(expression, parsed);
        if (binding && binding.exportedName === candidate.exportName
          && this.resolutionEndsWith(binding.resolution, candidate.moduleSuffix)) return candidate;
      }
    }
    return null;
  }

  private resolveExpressionBinding(
    expression: ts.Expression,
    parsed: ParsedSource,
  ): { exportedName: string; resolution: Resolution } | null {
    if (ts.isIdentifier(expression)) {
      const binding = parsed.bindings.get(expression.text);
      if (binding?.kind === "named" && binding.exportedName) {
        return { exportedName: binding.exportedName, resolution: binding.resolution };
      }
      return null;
    }
    if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
      const binding = parsed.bindings.get(expression.expression.text);
      if (binding?.kind === "namespace") {
        return { exportedName: expression.name.text, resolution: binding.resolution };
      }
    }
    return null;
  }

  private resolutionEndsWith(resolution: Resolution, suffix: string): boolean {
    return resolution.kind === "source"
      && normalizePath(resolution.resolvedPath).endsWith(normalizePath(suffix));
  }

  private evaluateApplicationConstruction(
    profile: ProjectProfile,
    parsed: ParsedSource,
  ): { violations: BoundaryViolation[]; occurrences: ConstructionOccurrence[] } {
    const violations: BoundaryViolation[] = [];
    const occurrences: ConstructionOccurrence[] = [];
    const visit = (node: ts.Node): void => {
      const obligation = this.matchConstruction(node, parsed);
      if (obligation) {
        const occurrence = { obligation, node: node as ts.NewExpression | ts.CallExpression, parsed };
        occurrences.push(occurrence);
        violations.push(...this.evaluateConstructionOccurrence(profile, occurrence));
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed.sourceFile);
    return { violations, occurrences };
  }

  private matchConstruction(node: ts.Node, parsed: ParsedSource): ConstructionObligation | null {
    if (ts.isNewExpression(node)) {
      const binding = this.resolveExpressionBinding(node.expression, parsed);
      if (!binding) return null;
      return CONSTRUCTION_OBLIGATIONS.find((obligation) =>
        obligation.kind === "new"
        && obligation.symbol === binding.exportedName
        && obligation.moduleSuffix
        && this.resolutionEndsWith(binding.resolution, obligation.moduleSuffix)) ?? null;
    }
    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "createApplicationSessionManager"
      && normalizePath(parsed.diagnosticImporter).endsWith(
        "autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts",
      )) {
      return CONSTRUCTION_OBLIGATIONS.find((obligation) => obligation.kind === "method") ?? null;
    }
    return null;
  }

  private evaluateConstructionOccurrence(
    profile: ProjectProfile,
    occurrence: ConstructionOccurrence,
  ): BoundaryViolation[] {
    const violations: BoundaryViolation[] = [];
    const argumentsList = occurrence.node.arguments ? [...occurrence.node.arguments] : [];
    for (const required of occurrence.obligation.requiredInputs) {
      const position = occurrence.parsed.sourceFile.getLineAndCharacterOfPosition(
        occurrence.node.getStart(occurrence.parsed.sourceFile),
      );
      if (required.kind === "positional") {
        const argument = argumentsList[required.argumentIndex];
        if (!argument || ts.isSpreadElement(argument) || isNullOrUndefined(argument)) {
          const reason = !argument
            ? argumentsList.some(ts.isSpreadElement) ? "OPAQUE_SPREAD_REQUIRED_INJECTION" : "MISSING_REQUIRED_INJECTION"
            : ts.isSpreadElement(argument) ? "OPAQUE_SPREAD_REQUIRED_INJECTION"
              : argument.kind === ts.SyntaxKind.NullKeyword ? "NULL_REQUIRED_INJECTION" : "UNDEFINED_REQUIRED_INJECTION";
          violations.push(this.violation({
            policy: "AFB-004",
            profile,
            importer: occurrence.parsed.diagnosticImporter,
            sourceOrigin: occurrence.parsed.resolutionOrigin,
            line: position.line + 1 + occurrence.parsed.lineOffset,
            column: position.character + 1,
            subject: `${occurrence.obligation.symbol}.argument[${required.argumentIndex}](${required.label})`,
            resolvedDependency: occurrence.obligation.moduleSuffix,
            reason,
          }));
        }
        continue;
      }
      const argument = argumentsList[required.argumentIndex];
      if (!argument || !ts.isObjectLiteralExpression(argument)) {
        violations.push(this.violation({
          policy: "AFB-004",
          profile,
          importer: occurrence.parsed.diagnosticImporter,
          sourceOrigin: occurrence.parsed.resolutionOrigin,
          line: position.line + 1 + occurrence.parsed.lineOffset,
          column: position.character + 1,
          subject: `${occurrence.obligation.symbol}.argument[${required.argumentIndex}].${required.path}`,
          resolvedDependency: occurrence.obligation.moduleSuffix,
          reason: argument && ts.isSpreadElement(argument)
            ? "OPAQUE_SPREAD_REQUIRED_INJECTION"
            : "INLINE_OBJECT_REQUIRED",
        }));
        continue;
      }
      const value = objectPropertyValue(argument, required.path.split("."));
      if (!value || isNullOrUndefined(value)) {
        const reason = !value
          ? objectContainsSpread(argument) ? "OPAQUE_SPREAD_REQUIRED_INJECTION" : "MISSING_REQUIRED_INJECTION"
          : value.kind === ts.SyntaxKind.NullKeyword ? "NULL_REQUIRED_INJECTION" : "UNDEFINED_REQUIRED_INJECTION";
        violations.push(this.violation({
          policy: "AFB-004",
          profile,
          importer: occurrence.parsed.diagnosticImporter,
          sourceOrigin: occurrence.parsed.resolutionOrigin,
          line: position.line + 1 + occurrence.parsed.lineOffset,
          column: position.character + 1,
          subject: `${occurrence.obligation.symbol}.argument[${required.argumentIndex}].${required.path}`,
          resolvedDependency: occurrence.obligation.moduleSuffix,
          reason,
        }));
      }
    }
    return violations;
  }

  private importViolation(
    policy: AfbPolicyId,
    profile: ProjectProfile,
    importer: string,
    sourceOrigin: string,
    edge: ImportEdge,
    resolution: Resolution,
    reason: string,
  ): BoundaryViolation {
    return this.violation({
      policy,
      profile,
      importer,
      sourceOrigin,
      line: edge.line,
      column: edge.column,
      subject: edge.specifier,
      resolvedDependency: resolution.kind === "source"
        ? normalizePath(relative(this.repositoryRoot, resolution.resolvedPath))
        : resolution.kind === "unresolved" ? undefined : resolution.packageName,
      reason,
    });
  }

  private violation(input: {
    policy: AfbPolicyId;
    profile: ProjectProfile;
    importer: string;
    sourceOrigin?: string;
    line: number;
    column: number;
    subject: string;
    resolvedDependency?: string;
    reason: string;
  }): BoundaryViolation {
    return {
      policy: input.policy,
      profile: input.profile.name,
      importer: normalizePath(relative(this.repositoryRoot, input.importer)),
      sourceOrigin: input.sourceOrigin
        ? normalizePath(relative(this.repositoryRoot, input.sourceOrigin))
        : undefined,
      line: input.line,
      column: input.column,
      subject: input.subject,
      resolvedDependency: input.resolvedDependency,
      reason: input.reason,
      correction: CORRECTIONS[input.policy],
    };
  }
}

const formatViolation = (violation: BoundaryViolation): string =>
  `[${violation.policy}] profile=${violation.profile} importer=${violation.importer}:${violation.line}:${violation.column}`
  + (violation.sourceOrigin && violation.sourceOrigin !== violation.importer
    ? ` source=${violation.sourceOrigin}`
    : "")
  + ` subject=${violation.subject}`
  + ` resolved=${violation.resolvedDependency ?? "N/A"}`
  + ` reason=${violation.reason}`
  + ` correction=${violation.correction}`;

type Sr013AstOccurrence = Readonly<{
  file: string;
  sourceFile: ts.SourceFile;
  node: ts.NewExpression | ts.CallExpression;
}>;

const sr013SourceFiles = (): string[] => [
  ...walkSourceFiles(join(REPOSITORY_ROOT, "autobyteus-server-ts/src")),
  ...walkSourceFiles(join(REPOSITORY_ROOT, "autobyteus-server-ts/tests")),
].filter((file) => /\.[cm]?tsx?$/.test(file));

const sr013RelativePath = (file: string): string =>
  normalizePath(relative(REPOSITORY_ROOT, file));

const sr013NewOccurrences = (symbol: string): Sr013AstOccurrence[] => {
  const occurrences: Sr013AstOccurrence[] = [];
  for (const file of sr013SourceFiles()) {
    const sourceFile = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const aliases = new Set([symbol]);
    const namespaces = new Set<string>();
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)
        || !statement.importClause
        || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const bindings = statement.importClause.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const binding of bindings.elements) {
          if ((binding.propertyName?.text ?? binding.name.text) === symbol) {
            aliases.add(binding.name.text);
          }
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        namespaces.add(bindings.name.text);
      }
    }
    const visit = (node: ts.Node): void => {
      if (ts.isNewExpression(node)) {
        const direct = ts.isIdentifier(node.expression)
          && aliases.has(node.expression.text);
        const namespaced = ts.isPropertyAccessExpression(node.expression)
          && ts.isIdentifier(node.expression.expression)
          && namespaces.has(node.expression.expression.text)
          && node.expression.name.text === symbol;
        if (direct || namespaced) occurrences.push({ file, sourceFile, node });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return occurrences;
};

const sr013UnwrapExpression = (expression: ts.Expression): ts.Expression => {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
};

const sr013BuilderCalls = (): Sr013AstOccurrence[] => {
  const occurrences: Sr013AstOccurrence[] = [];
  for (const file of sr013SourceFiles()) {
    const sourceFile = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression)
        && node.expression.name.text === "build"
        && node.arguments[0]) {
        const argument = sr013UnwrapExpression(node.arguments[0]);
        if (ts.isObjectLiteralExpression(argument)
          && objectPropertyValue(argument, ["teamContext"])
          && objectPropertyValue(argument, ["agentNode"])) {
          occurrences.push({ file, sourceFile, node });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return occurrences;
};

const sr013OccurrencePaths = (occurrences: readonly Sr013AstOccurrence[]): string[] =>
  occurrences.map((occurrence) => sr013RelativePath(occurrence.file)).sort();

const sr013RequiredObjectProperty = (
  occurrence: Sr013AstOccurrence,
  argumentIndex: number,
  propertyName: string,
): ts.Expression => {
  const rawArgument = occurrence.node.arguments?.[argumentIndex];
  const argument = rawArgument ? sr013UnwrapExpression(rawArgument) : undefined;
  expect(ts.isObjectLiteralExpression(argument), `${sr013RelativePath(occurrence.file)} argument ${argumentIndex}`).toBe(true);
  const value = objectPropertyValue(argument as ts.ObjectLiteralExpression, [propertyName]);
  expect(value, `${sr013RelativePath(occurrence.file)}.${propertyName}`).toBeDefined();
  expect(isNullOrUndefined(value!), `${sr013RelativePath(occurrence.file)}.${propertyName}`).toBe(false);
  return value!;
};

const temporaryRoots: string[] = [];

const writeFixture = (root: string, relativePath: string, content: string): string => {
  const filePath = join(root, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
};

const createFixtureRepository = (): string => {
  const root = mkdtempSync(join(tmpdir(), "application-framework-boundaries-"));
  temporaryRoots.push(root);
  writeFixture(root, "autobyteus-server-ts/package.json", JSON.stringify({ name: "autobyteus-server-ts", type: "module" }));
  writeFixture(root, "autobyteus-server-ts/tsconfig.json", JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", allowJs: true } }));
  writeFixture(root, "autobyteus-web/package.json", JSON.stringify({ name: "autobyteus", dependencies: { vue: "*", "@autobyteus/application-sdk-contracts": "*" } }));
  writeFixture(root, "autobyteus-web/tsconfig.json", JSON.stringify({ extends: "./.nuxt/tsconfig.json" }));
  for (const application of ["brief-studio", "socratic-math-teacher"]) {
    const appRoot = `applications/${application}`;
    writeFixture(root, `${appRoot}/package.json`, JSON.stringify({
      name: `fixture-${application}`,
      type: "module",
      dependencies: {
        "@autobyteus/application-backend-sdk": "*",
        "@autobyteus/application-frontend-sdk": "*",
        ...(application === "brief-studio" ? { "declared-lib": "*" } : {}),
      },
    }));
    writeFixture(root, `${appRoot}/autobyteus-app.config.mjs`, "export default { source: { frontendDir: 'frontend-src', backendDir: 'backend-src' } };\n");
    writeFixture(root, `${appRoot}/tsconfig.backend.json`, JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext" } }));
    mkdirSync(join(root, appRoot, "frontend-src"), { recursive: true });
    mkdirSync(join(root, appRoot, "backend-src"), { recursive: true });
  }
  writeFixture(root, "autobyteus-application-devkit/templates/basic/package.json", JSON.stringify({
    name: "fixture-template",
    type: "module",
    dependencies: { "template-lib": "*" },
  }));
  writeFixture(root, "autobyteus-application-devkit/templates/basic/autobyteus-app.config.mjs", "export default { source: { frontendDir: 'src/frontend', backendDir: 'src/backend' } };\n");
  mkdirSync(join(root, "autobyteus-application-devkit/templates/basic/src"), { recursive: true });
  return root;
};

const relativeModuleSpecifier = (fromFile: string, targetFile: string): string => {
  let specifier = normalizePath(relative(dirname(fromFile), targetFile)).replace(/\.ts$/, ".js");
  if (!specifier.startsWith(".")) specifier = `./${specifier}`;
  return specifier;
};

interface ObjectTree {
  [key: string]: string | ObjectTree;
}

const buildObjectTree = (
  paths: readonly string[],
  selectedPath?: string,
  selectedValue?: string,
): ObjectTree => {
  const root: ObjectTree = {};
  for (const path of paths) {
    const parts = path.split(".");
    let cursor = root;
    for (const [index, part] of parts.entries()) {
      if (index === parts.length - 1) {
        cursor[part] = path === selectedPath ? selectedValue ?? part : part;
      } else {
        const existing = cursor[part];
        if (!existing || typeof existing === "string") cursor[part] = {};
        cursor = cursor[part] as ObjectTree;
      }
    }
  }
  return root;
};

const renderObjectTree = (tree: ObjectTree, includeSpread = false): string => {
  const properties = Object.entries(tree).map(([key, value]) =>
    `${key}: ${typeof value === "string" ? value : renderObjectTree(value)}`);
  if (includeSpread) properties.push("...opaque");
  return `{ ${properties.join(", ")} }`;
};

const constructionSnippet = (
  obligation: ConstructionObligation,
  mutation?: { required: RequiredInput; kind: "omitted" | "null" | "undefined" | "spread" },
): string => {
  const positional = obligation.requiredInputs.filter((required): required is Extract<RequiredInput, { kind: "positional" }> => required.kind === "positional");
  const objectInputs = obligation.requiredInputs.filter((required): required is Extract<RequiredInput, { kind: "object-property" }> => required.kind === "object-property");
  const maxIndex = Math.max(-1, ...obligation.requiredInputs.map((required) => required.argumentIndex));
  const args = Array.from({ length: maxIndex + 1 }, () => "undefined");

  for (const required of positional) args[required.argumentIndex] = required.label;
  const byArgument = new Map<number, Extract<RequiredInput, { kind: "object-property" }>[]>();
  for (const required of objectInputs) {
    const group = byArgument.get(required.argumentIndex) ?? [];
    group.push(required);
    byArgument.set(required.argumentIndex, group);
  }
  for (const [argumentIndex, inputs] of byArgument) {
    const selected = mutation?.required.kind === "object-property"
      && mutation.required.argumentIndex === argumentIndex ? mutation : undefined;
    const selectedPath = selected && selected.required.kind === "object-property"
      ? selected.required.path
      : undefined;
    const paths = inputs
      .filter((required) => !(selected?.kind === "omitted" || selected?.kind === "spread") || required.path !== selectedPath)
      .map((required) => required.path);
    const tree = buildObjectTree(
      paths,
      selected && ["null", "undefined"].includes(selected.kind) ? selectedPath : undefined,
      selected?.kind,
    );
    args[argumentIndex] = renderObjectTree(tree, selected?.kind === "spread");
  }

  if (mutation?.required.kind === "positional") {
    const index = mutation.required.argumentIndex;
    if (mutation.kind === "omitted") {
      args.splice(index);
    } else if (mutation.kind === "spread") {
      args.splice(0, args.length, "...opaque");
    } else {
      args[index] = mutation.kind;
    }
  }

  const call = obligation.kind === "method"
    ? `input.agentToolsSessionFactory.createApplicationSessionManager(${args.join(", ")});`
    : `new Target(${args.join(", ")});`;
  return `const opaque = {}; const input = { agentToolsSessionFactory: { createApplicationSessionManager: (_value: unknown) => ({}) } };\n${call}\n`;
};

const installConstructionTarget = (
  root: string,
  obligation: ConstructionObligation,
): { importer: string; importLine: string } => {
  const importer = join(root, "autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts");
  if (obligation.kind === "method") return { importer, importLine: "" };
  const target = join(root, obligation.moduleSuffix!);
  writeFixture(root, normalizePath(relative(root, target)), `export class ${obligation.symbol} {}\n`);
  return {
    importer,
    importLine: `import { ${obligation.symbol} as Target } from ${JSON.stringify(relativeModuleSpecifier(importer, target))};\n`,
  };
};

afterEach(() => {
  while (temporaryRoots.length > 0) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe("application framework architecture boundaries", () => {
  it("keeps the complete current TS/JS/Vue tree inside AFB-001 through AFB-005", () => {
    const checker = new ApplicationFrameworkBoundaryChecker(REPOSITORY_ROOT);
    const result = checker.checkCurrentTree();
    expect(result.violations.map(formatViolation)).toEqual([]);
    expect(result.vueFiles).toHaveLength(11);
    expect(result.templateProfiles).toEqual(["devkit-template:basic"]);
    expect([...result.constructionCounts.entries()].sort()).toEqual(
      CONSTRUCTION_OBLIGATIONS.map((obligation) => [obligation.symbol, 1] as const).sort(),
    );
    checker.assertNamedAssemblySelections();
  });

  it("keeps required tool registration behind the single lifecycle readiness owner", () => {
    type ToolSpec = Readonly<{
      key?: string;
      name?: string;
      modulePath: string;
      exportName: string;
    }>;
    const sourceFiles = [
      ...walkSourceFiles(join(REPOSITORY_ROOT, "autobyteus-server-ts/src")),
      ...walkSourceFiles(join(REPOSITORY_ROOT, "autobyteus-ts/src")),
    ].filter((filePath) => [".ts", ".js", ".mjs"].includes(extname(filePath)));
    const namedCalls: Array<{ filePath: string; name: string }> = [];
    const identifierLocations: Array<{ filePath: string; name: string }> = [];
    for (const filePath of sourceFiles) {
      const sourceFile = ts.createSourceFile(
        filePath,
        readFileSync(filePath, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node): void => {
        if (ts.isIdentifier(node)) {
          identifierLocations.push({ filePath, name: node.text });
        }
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          const name = ts.isIdentifier(expression)
            ? expression.text
            : ts.isPropertyAccessExpression(expression)
              ? expression.name.text
              : null;
          if (name) namedCalls.push({ filePath, name });
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    const collectSpecs = (filePath: string): ToolSpec[] => {
      const sourceFile = ts.createSourceFile(
        filePath,
        readFileSync(filePath, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      const specs: ToolSpec[] = [];
      const visit = (node: ts.Node): void => {
        if (ts.isObjectLiteralExpression(node)) {
          const values = new Map<string, string>();
          for (const property of node.properties) {
            if (
              ts.isPropertyAssignment(property)
              && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
              && ts.isStringLiteral(property.initializer)
            ) {
              values.set(property.name.text, property.initializer.text);
            }
          }
          const modulePath = values.get("modulePath");
          const exportName = values.get("exportName");
          if (modulePath && exportName) {
            specs.push({
              key: values.get("key"),
              name: values.get("name"),
              modulePath,
              exportName,
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
      return specs;
    };

    expect(namedCalls.filter(({ name }) => name === "registerTools")).toEqual([]);
    expect(namedCalls.filter(({ name }) => name === "registerProvisionedSearchTool")).toEqual([]);
    expect(identifierLocations.filter(({ name }) => name === "loadAllAgentTools")).toEqual([]);

    const readinessPath = join(
      REPOSITORY_ROOT,
      "autobyteus-server-ts/src/startup/agent-tool-loader.ts",
    );
    expect(collectSpecs(readinessPath)).toEqual([
      { key: "core", name: undefined, modulePath: "autobyteus-ts/tools/register-tools.js", exportName: "registerTools" },
      { key: "browser", name: undefined, modulePath: "../agent-tools/browser/register-browser-tools.js", exportName: "registerBrowserTools" },
      { key: "task_delegation", name: undefined, modulePath: "../agent-tools/task-delegation/register-task-delegation-tools.js", exportName: "registerTaskDelegationTools" },
      { key: "agent_communication", name: undefined, modulePath: "../agent-tools/agent-communication/register-agent-communication-tools.js", exportName: "registerAgentCommunicationTools" },
      { key: "published_artifact", name: undefined, modulePath: "../agent-tools/published-artifacts/register-published-artifact-tools.js", exportName: "registerPublishedArtifactTools" },
      { key: "media", name: undefined, modulePath: "../agent-tools/media/register-media-tools.js", exportName: "registerMediaTools" },
      { key: "search", name: undefined, modulePath: "../agent-tools/search/register-search-tool.js", exportName: "registerProvisionedSearchTool" },
    ]);
    expect(collectSpecs(join(
      REPOSITORY_ROOT,
      "autobyteus-server-ts/src/startup/background-runner.ts",
    ))).toEqual([
      { key: undefined, name: "Cache Pre-loading", modulePath: "./cache-preloader.js", exportName: "runCachePreloading" },
      { key: undefined, name: "MCP Tool Registration", modulePath: "./mcp-loader.js", exportName: "runMcpToolRegistration" },
      { key: undefined, name: "Memory Sync Worker", modulePath: "./memory-sync-worker-loader.js", exportName: "loadMemorySyncWorker" },
    ]);

    const serverRuntimePath = join(
      REPOSITORY_ROOT,
      "autobyteus-server-ts/src/server-runtime.ts",
    );
    expect(identifierLocations.filter(({ filePath, name }) =>
      filePath === serverRuntimePath && name === "registerProvisionedSearchTool",
    )).toEqual([]);
    const forbiddenCoreOwnerFiles = [
      "autobyteus-server-ts/src/agent-tools/search/register-search-tool.ts",
      "autobyteus-ts/src/agent/factory/agent-factory.ts",
    ].map((relativePath) => join(REPOSITORY_ROOT, relativePath));
    expect(identifierLocations.filter(({ filePath, name }) =>
      forbiddenCoreOwnerFiles.includes(filePath) && name === "registerTools",
    )).toEqual([]);
  });

  it("extracts every governed import form without reading comments or arbitrary strings", () => {
    const root = createFixtureRepository();
    const importer = writeFixture(root, "applications/brief-studio/backend-src/import-forms.ts", `
      import "./static.js";
      export * from "./exported.js";
      const required = require("./required.js");
      const dynamic = import("./dynamic.js");
      type Imported = import("./type-only.js").Imported;
      // import "./comment.js";
      const text = "import('./string.js')";
    `);
    for (const name of ["static", "exported", "required", "dynamic", "type-only"]) {
      writeFixture(root, `applications/brief-studio/backend-src/${name}.ts`, "export {};\n");
    }
    const checker = new ApplicationFrameworkBoundaryChecker(root);
    expect(checker.extractSpecifiers(importer).sort()).toEqual([
      "./dynamic.js",
      "./exported.js",
      "./required.js",
      "./static.js",
      "./type-only.js",
    ]);
  });

  it("enforces every named AFB-001 private runtime category while retaining exact inputs", () => {
    const root = createFixtureRepository();
    writeFixture(root, "autobyteus-server-ts/src/application-platform/runtime/application-platform-runtime-contracts.ts", "export type Contract = {};\n");
    writeFixture(root, "autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts", "export type ApplicationBundleService = {};\n");
    writeFixture(root, "autobyteus-server-ts/src/application-orchestration/services/application-availability-service.ts", `
      export class ApplicationUnavailableError extends Error {}
      export class ApplicationAvailabilityService {}
    `);
    const allowedContract = writeFixture(root, "autobyteus-server-ts/src/api/rest/allowed.ts", "import type { Contract } from '../../application-platform/runtime/application-platform-runtime-contracts.js';\n");
    const allowedSubject = writeFixture(root, "autobyteus-server-ts/src/api/rest/allowed-subject.ts", "import type { ApplicationBundleService } from '../../application-bundles/services/application-bundle-service.js';\n");
    const allowedAvailabilityError = writeFixture(root, "autobyteus-server-ts/src/api/rest/allowed-availability-error.ts", "import { ApplicationUnavailableError } from '../../application-orchestration/services/application-availability-service.js';\n");

    const forbiddenTargets = [
      ["runtime-builder", "application-platform/runtime/build-application-platform-runtime.ts"],
      ["lifecycle", "application-platform/runtime/application-platform-lifecycle.ts"],
      ["stores", "application-orchestration/stores/application-run-binding-store.ts"],
      ["recovery", "application-orchestration/services/application-orchestration-recovery-service.ts"],
      ["run", "application-orchestration/services/application-run-binding-launch-service.ts"],
      ["session", "agent-tools/mcp/scoped-agent-tool-mcp-session-manager.ts"],
      ["publication", "application-orchestration/services/application-published-artifact-delivery-service.ts"],
      ["engine", "application-engine/services/application-engine-controller.ts"],
      ["queue", "application-orchestration/services/application-execution-event-dispatch-queue.ts"],
      ["shutdown", "application-platform/runtime/application-run-shutdown-coordinator.ts"],
    ] as const;
    for (const [category, target] of forbiddenTargets) {
      const targetPath = writeFixture(
        root,
        `autobyteus-server-ts/src/${target}`,
        "export const forbidden = true;\n",
      );
      const importer = join(root, `autobyteus-server-ts/src/api/rest/forbidden-${category}.ts`);
      writeFixture(
        root,
        `autobyteus-server-ts/src/api/rest/forbidden-${category}.ts`,
        `import { forbidden } from ${JSON.stringify(relativeModuleSpecifier(importer, targetPath))};\n`,
      );
    }
    writeFixture(
      root,
      "autobyteus-server-ts/src/api/rest/forbidden-availability.ts",
      "import { ApplicationAvailabilityService } from '../../application-orchestration/services/application-availability-service.js';\n",
    );

    const checker = new ApplicationFrameworkBoundaryChecker(root);
    for (const allowed of [allowedContract, allowedSubject, allowedAvailabilityError]) {
      expect(checker.checkOneFile(allowed, "AFB-001").map(formatViolation)).toEqual([]);
    }
    const diagnostics = checker.checkCurrentTree(false)
      .violations.map(formatViolation);
    expect(diagnostics).toHaveLength(forbiddenTargets.length + 1);
    for (const category of [...forbiddenTargets.map(([name]) => name), "availability"]) {
      expect(diagnostics).toContainEqual(expect.stringContaining(
        `[AFB-001] profile=server importer=autobyteus-server-ts/src/api/rest/forbidden-${category}.ts`,
      ));
      expect(diagnostics).toContainEqual(expect.stringContaining(
        `reason=PRIVATE_RUNTIME_IMPORT category=${category} correction=`,
      ));
    }
  });

  it("enforces each GraphQL and Studio presentation direction in AFB-002", () => {
    const root = createFixtureRepository();
    writeFixture(root, "autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts", "export type Registry = {};\n");
    writeFixture(root, "autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts", "export const bundle = true;\n");
    writeFixture(root, "autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts", "export const runtime = true;\n");
    const allowedGraphql = writeFixture(root, "autobyteus-server-ts/src/api/graphql/allowed.ts", "import type { Registry } from '../../application-packages/services/application-package-registry-service.js';\n");
    writeFixture(root, "autobyteus-server-ts/src/api/graphql/forbidden-runtime.ts", "import { runtime } from '../../application-engine/services/application-engine-controller.js';\n");
    writeFixture(root, "autobyteus-web/utils/application/local.ts", "export const local = true;\n");
    const allowedLocal = writeFixture(root, "autobyteus-web/components/applications/Allowed.vue", "<script setup lang='ts'>\nimport { local } from '~/utils/application/local'\n</script>\n");
    const allowedSdk = writeFixture(root, "autobyteus-web/components/applications/AllowedSdk.vue", "<script setup lang='ts'>\nimport type { ApplicationRuntimeBootstrap } from '@autobyteus/application-sdk-contracts'\n</script>\n");
    const studioTargets = [
      ["package", "autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts"],
      ["bundle", "autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts"],
      ["runtime", "autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts"],
    ] as const;
    for (const [category, target] of studioTargets) {
      const importer = join(root, `autobyteus-web/components/applications/Forbidden-${category}.vue`);
      const targetPath = join(root, target);
      writeFixture(
        root,
        `autobyteus-web/components/applications/Forbidden-${category}.vue`,
        `<script setup lang='ts'>\nimport ${JSON.stringify(relativeModuleSpecifier(importer, targetPath))}\n</script>\n`,
      );
    }

    const checker = new ApplicationFrameworkBoundaryChecker(root);
    expect(checker.checkOneFile(allowedGraphql, "AFB-002").map(formatViolation)).toEqual([]);
    expect(checker.checkOneFile(allowedLocal, "AFB-002").map(formatViolation)).toEqual([]);
    expect(checker.checkOneFile(allowedSdk, "AFB-002").map(formatViolation)).toEqual([]);
    const diagnostics = checker.checkCurrentTree(false)
      .violations.map(formatViolation);
    expect(diagnostics).toHaveLength(studioTargets.length + 1);
    expect(diagnostics).toContainEqual(expect.stringContaining(
      "[AFB-002] profile=server importer=autobyteus-server-ts/src/api/graphql/forbidden-runtime.ts",
    ));
    for (const [category] of studioTargets) {
      expect(diagnostics).toContainEqual(expect.stringContaining(
        `[AFB-002] profile=studio-web importer=autobyteus-web/components/applications/Forbidden-${category}.vue`,
      ));
    }
  });

  it("enforces every AFB-003 outward owner direction and only the reconciliation seam", () => {
    const root = createFixtureRepository();
    writeFixture(root, "autobyteus-server-ts/src/application-packages/types.ts", "export type Package = {};\n");
    const allowedDomain = writeFixture(root, "autobyteus-server-ts/src/application-packages/allowed.ts", "import type { Package } from './types.js';\n");
    const allowedStore = writeFixture(root, "autobyteus-server-ts/src/application-packages/stores/allowed-store.ts", "import type { Package } from '../types.js';\n");
    const allowedReader = writeFixture(root, "autobyteus-server-ts/src/application-packages/readers/allowed-reader.ts", "import type { Package } from '../types.js';\n");
    const allowedCommand = writeFixture(root, "autobyteus-server-ts/src/application-packages/services/allowed-command.ts", "import type { Package } from '../types.js';\n");
    writeFixture(root, "autobyteus-server-ts/src/application-bundles/types.ts", "export type Bundle = {};\n");
    const allowedBundleProvider = writeFixture(root, "autobyteus-server-ts/src/application-bundles/providers/allowed-provider.ts", "import type { Bundle } from '../types.js';\n");
    writeFixture(root, "autobyteus-server-ts/src/api/rest/application.ts", "export const api = true;\n");
    writeFixture(root, "autobyteus-web/utils/application/presentation.ts", "export const presentation = true;\n");
    writeFixture(root, "autobyteus-server-ts/src/compositions/build-studio-server.ts", "export const build = () => {};\n");
    writeFixture(root, "autobyteus-server-ts/src/standalone-application-host/services/host.ts", "export const host = true;\n");
    writeFixture(root, "autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts", "export const runtime = true;\n");
    writeFixture(root, "autobyteus-server-ts/src/application-platform/runtime/application-catalog-reconciliation-service.ts", "export type Reconcile = {};\n");
    const allowedReconciliation = writeFixture(root, "autobyteus-server-ts/src/application-packages/services/application-catalog-refresh-coordinator.ts", "import type { Reconcile } from '../../application-platform/runtime/application-catalog-reconciliation-service.js';\n");

    const forbiddenTargets = [
      ["api", "autobyteus-server-ts/src/api/rest/application.ts"],
      ["presentation", "autobyteus-web/utils/application/presentation.ts"],
      ["assembly", "autobyteus-server-ts/src/compositions/build-studio-server.ts"],
      ["standalone", "autobyteus-server-ts/src/standalone-application-host/services/host.ts"],
      ["runtime", "autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts"],
    ] as const;
    for (const [category, target] of forbiddenTargets) {
      const importer = join(root, `autobyteus-server-ts/src/application-bundles/forbidden-${category}.ts`);
      writeFixture(
        root,
        `autobyteus-server-ts/src/application-bundles/forbidden-${category}.ts`,
        `import ${JSON.stringify(relativeModuleSpecifier(importer, join(root, target)))};\n`,
      );
    }

    const checker = new ApplicationFrameworkBoundaryChecker(root);
    for (const allowed of [
      allowedDomain,
      allowedStore,
      allowedReader,
      allowedCommand,
      allowedBundleProvider,
      allowedReconciliation,
    ]) {
      expect(checker.checkOneFile(allowed, "AFB-003").map(formatViolation)).toEqual([]);
    }
    const diagnostics = checker.checkCurrentTree(false)
      .violations.map(formatViolation);
    expect(diagnostics).toHaveLength(forbiddenTargets.length);
    for (const [category] of forbiddenTargets) {
      expect(diagnostics).toContainEqual(expect.stringContaining(
        `[AFB-003] profile=server importer=autobyteus-server-ts/src/application-bundles/forbidden-${category}.ts`,
      ));
    }
    for (const diagnostic of diagnostics) {
      expect(diagnostic).toContain("resolved=");
      expect(diagnostic).toContain("correction=");
    }
  });

  it("fails closed for malformed Vue and unresolved governed source", () => {
    const root = createFixtureRepository();
    const malformed = writeFixture(root, "autobyteus-web/components/applications/Malformed.vue", "<script setup lang='ts'>\nconst =\n</script>\n");
    const unsupported = writeFixture(root, "autobyteus-web/components/applications/Unsupported.vue", "<script setup lang='coffee'>\nvalue = true\n</script>\n");
    const external = writeFixture(root, "autobyteus-web/components/applications/External.vue", "<script src='./missing-script.ts'></script>\n");
    const unresolved = writeFixture(root, "applications/brief-studio/frontend-src/unresolved.js", "import './missing.js';\n");
    const checker = new ApplicationFrameworkBoundaryChecker(root);
    expect(checker.checkOneFile(malformed, "AFB-002").map(formatViolation)[0]).toMatch(
      /\[AFB-002\].*profile=studio-web.*SOURCE_PARSE_ERROR.*correction=/,
    );
    expect(checker.checkOneFile(unsupported, "AFB-002").map(formatViolation)[0]).toMatch(
      /\[AFB-002\].*profile=studio-web.*UNSUPPORTED_SCRIPT_LANGUAGE.*correction=/,
    );
    expect(checker.checkOneFile(external, "AFB-002").map(formatViolation)[0]).toMatch(
      /\[AFB-002\].*profile=studio-web.*missing-script\.ts.*UNRESOLVED_GOVERNED_IMPORT.*correction=/,
    );
    expect(checker.checkOneFile(unresolved, "AFB-005").map(formatViolation)[0]).toMatch(
      /\[AFB-005\].*profile=brief-frontend.*subject=\.\/missing\.js.*UNRESOLVED_GOVERNED_IMPORT.*correction=/,
    );
  });

  it("resolves Vue external-script imports from that script while keeping SFC-owned diagnostics", () => {
    const root = createFixtureRepository();
    const sfc = writeFixture(
      root,
      "autobyteus-web/components/applications/ExternalResolved.vue",
      "<script lang='ts' src='./external/script.ts'></script>\n",
    );
    const externalScript = join(
      root,
      "autobyteus-web/components/applications/external/script.ts",
    );
    const allowedLocal = writeFixture(
      root,
      "autobyteus-web/components/applications/external/local.ts",
      "export const local = true;\n",
    );
    const forbiddenRuntime = writeFixture(
      root,
      "autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts",
      "export const runtime = true;\n",
    );
    writeFixture(
      root,
      "autobyteus-web/components/applications/external/script.ts",
      `import { local } from ${JSON.stringify(relativeModuleSpecifier(externalScript, allowedLocal))};\n`
        + `import { runtime } from ${JSON.stringify(relativeModuleSpecifier(externalScript, forbiddenRuntime))};\n`,
    );

    const diagnostics = new ApplicationFrameworkBoundaryChecker(root).checkOneFile(sfc, "AFB-002")
      .map(formatViolation);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toContain(
      "[AFB-002] profile=studio-web importer=autobyteus-web/components/applications/ExternalResolved.vue",
    );
    expect(diagnostics[0]).toContain(
      "source=autobyteus-web/components/applications/external/script.ts",
    );
    expect(diagnostics[0]).toContain("resolved=autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts");
    expect(diagnostics[0]).toContain("reason=HOST_IMPLEMENTATION_IMPORT");
    expect(diagnostics[0]).not.toContain("UNRESOLVED_GOVERNED_IMPORT");
  });

  it("governs Vue external-script targets under AFB-002 and AFB-005", () => {
    const root = createFixtureRepository();
    const hostRuntime = writeFixture(
      root,
      "autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts",
      "export const runtime = true;\n",
    );

    writeFixture(
      root,
      "autobyteus-web/components/applications/external/allowed.ts",
      "export const allowed = true;\n",
    );
    const allowedStudioSfc = writeFixture(
      root,
      "autobyteus-web/components/applications/AllowedExternal.vue",
      "<script lang='ts' src='./external/allowed.ts'></script>\n",
    );
    const forbiddenStudioSfcPath = join(
      root,
      "autobyteus-web/components/applications/ForbiddenExternal.vue",
    );
    const forbiddenStudioSpecifier = relativeModuleSpecifier(forbiddenStudioSfcPath, hostRuntime);
    const forbiddenStudioSfc = writeFixture(
      root,
      "autobyteus-web/components/applications/ForbiddenExternal.vue",
      `<script lang='ts' src=${JSON.stringify(forbiddenStudioSpecifier)}></script>\n`,
    );

    writeFixture(
      root,
      "applications/brief-studio/frontend-src/external/allowed.ts",
      "export const allowed = true;\n",
    );
    const allowedBriefSfc = writeFixture(
      root,
      "applications/brief-studio/frontend-src/AllowedExternal.vue",
      "<script lang='ts' src='./external/allowed.ts'></script>\n",
    );
    const forbiddenBriefSfcPath = join(
      root,
      "applications/brief-studio/frontend-src/ForbiddenExternal.vue",
    );
    const forbiddenBriefSpecifier = relativeModuleSpecifier(forbiddenBriefSfcPath, hostRuntime);
    const forbiddenBriefSfc = writeFixture(
      root,
      "applications/brief-studio/frontend-src/ForbiddenExternal.vue",
      `<script lang='ts' src=${JSON.stringify(forbiddenBriefSpecifier)}></script>\n`,
    );

    const checker = new ApplicationFrameworkBoundaryChecker(root);
    expect(checker.checkOneFile(allowedStudioSfc, "AFB-002").map(formatViolation)).toEqual([]);
    expect(checker.checkOneFile(allowedBriefSfc, "AFB-005").map(formatViolation)).toEqual([]);

    const studioDiagnostics = checker.checkOneFile(forbiddenStudioSfc, "AFB-002").map(formatViolation);
    expect(studioDiagnostics).toHaveLength(1);
    expect(studioDiagnostics[0]).toContain(
      "[AFB-002] profile=studio-web importer=autobyteus-web/components/applications/ForbiddenExternal.vue",
    );
    expect(studioDiagnostics[0]).toContain(`subject=${forbiddenStudioSpecifier}`);
    expect(studioDiagnostics[0]).toContain(
      "resolved=autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts",
    );
    expect(studioDiagnostics[0]).toContain("reason=HOST_IMPLEMENTATION_IMPORT");

    const briefDiagnostics = checker.checkOneFile(forbiddenBriefSfc, "AFB-005").map(formatViolation);
    expect(briefDiagnostics).toHaveLength(1);
    expect(briefDiagnostics[0]).toContain(
      "[AFB-005] profile=brief-frontend importer=applications/brief-studio/frontend-src/ForbiddenExternal.vue",
    );
    expect(briefDiagnostics[0]).toContain(`subject=${forbiddenBriefSpecifier}`);
    expect(briefDiagnostics[0]).toContain(
      "resolved=autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts",
    );
    expect(briefDiagnostics[0]).toContain("reason=PROJECT_ESCAPE_IMPORT");
  });

  it("resolves package imports only from the owning manifest", () => {
    const root = createFixtureRepository();
    const manifestPath = join(root, "applications/brief-studio/package.json");
    const manifest = readJson(manifestPath);
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, imports: { "#domain/*": "./backend-src/domain/*.ts" } }));
    writeFixture(root, "applications/brief-studio/backend-src/domain/value.ts", "export const value = true;\n");
    const allowed = writeFixture(root, "applications/brief-studio/backend-src/manifest-import.ts", "import { value } from '#domain/value';\n");
    const rejected = writeFixture(root, "applications/socratic-math-teacher/backend-src/manifest-import.ts", "import '#domain/value';\n");
    const checker = new ApplicationFrameworkBoundaryChecker(root);
    expect(checker.checkOneFile(allowed, "AFB-005").map(formatViolation)).toEqual([]);
    expect(checker.checkOneFile(rejected, "AFB-005").map(formatViolation)[0]).toMatch(
      /\[AFB-005\].*profile=socratic-backend.*subject=#domain\/value.*UNRESOLVED_GOVERNED_IMPORT.*correction=/,
    );
  });

  it("uses each AFB-005 importer's own manifest and project root", () => {
    const root = createFixtureRepository();
    writeFixture(root, "applications/brief-studio/backend-src/allowed.ts", "import 'declared-lib'; import 'node:path';\n");
    writeFixture(root, "applications/socratic-math-teacher/backend-src/undeclared.ts", "import 'declared-lib';\n");
    writeFixture(root, "autobyteus-application-devkit/templates/basic/src/allowed.ts", "import 'template-lib'; import 'node:fs';\n");
    writeFixture(root, "autobyteus-server-ts/src/index.ts", "export {};\n");
    writeFixture(root, "applications/brief-studio/backend-src/escape.ts", "import '../../../autobyteus-server-ts/src/index.js';\n");
    writeFixture(root, "applications/brief-studio/frontend-src/forbidden.js", "import 'autobyteus-server-ts/runtime';\n");

    const diagnostics = new ApplicationFrameworkBoundaryChecker(root).checkCurrentTree(false).violations.map(formatViolation);
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining("profile=socratic-backend importer=applications/socratic-math-teacher/backend-src/undeclared.ts"),
      expect.stringContaining("profile=brief-backend importer=applications/brief-studio/backend-src/escape.ts"),
      expect.stringContaining("profile=brief-frontend importer=applications/brief-studio/frontend-src/forbidden.js"),
    ]));
    expect(diagnostics.join("\n")).toContain("UNDECLARED_LIBRARY_IMPORT");
    expect(diagnostics.join("\n")).toContain("PROJECT_ESCAPE_IMPORT");
    expect(diagnostics.join("\n")).toContain("HOST_RUNTIME_PACKAGE_IMPORT");
  });

  it("resolves named aliases and namespace members for every direct AFB-004 callee", () => {
    const root = createFixtureRepository();
    const runtimeFile = join(root, "autobyteus-server-ts/src/application-platform/runtime/direct-defaults.ts");
    const statements: string[] = [];
    DIRECT_GLOBAL_CALLEES.forEach((callee, index) => {
      const target = join(root, callee.moduleSuffix);
      writeFixture(
        root,
        normalizePath(relative(root, target)),
        callee.member
          ? `export class ${callee.exportName} { static ${callee.member}() {} }\n`
          : `export const ${callee.exportName} = () => {};\n`,
      );
      const specifier = relativeModuleSpecifier(runtimeFile, target);
      if (index % 2 === 0) {
        statements.push(`import { ${callee.exportName} as Alias${index} } from ${JSON.stringify(specifier)};`);
        statements.push(callee.member ? `Alias${index}.${callee.member}();` : `Alias${index}();`);
      } else {
        statements.push(`import * as Namespace${index} from ${JSON.stringify(specifier)};`);
        statements.push(callee.member
          ? `Namespace${index}.${callee.exportName}.${callee.member}();`
          : `Namespace${index}.${callee.exportName}();`);
      }
    });
    statements.push("class AgentRunManager { static getInstance() {} }", "AgentRunManager.getInstance();");
    writeFixture(root, normalizePath(relative(root, runtimeFile)), statements.join("\n"));
    const diagnostics = new ApplicationFrameworkBoundaryChecker(root).checkOneFile(runtimeFile, "AFB-004").map(formatViolation);
    expect(diagnostics).toHaveLength(DIRECT_GLOBAL_CALLEES.length);
    for (const callee of DIRECT_GLOBAL_CALLEES) {
      expect(diagnostics.join("\n")).toContain(`subject=${callee.symbol}`);
    }
  });

  it("accepts only the two named assembly roots as general-process selection exemptions", () => {
    const root = createFixtureRepository();
    const target = join(root, "autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts");
    writeFixture(root, normalizePath(relative(root, target)), "export const getGeneralProcessPublishedArtifactPublisher = () => ({});\n");
    const files = [
      "autobyteus-server-ts/src/compositions/build-studio-server.ts",
      "autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts",
      "autobyteus-server-ts/src/application-platform/runtime/forbidden.ts",
    ];
    const checker = new ApplicationFrameworkBoundaryChecker(root);
    const diagnostics: string[] = [];
    files.forEach((relativePath) => {
      const importer = join(root, relativePath);
      const specifier = relativeModuleSpecifier(importer, target);
      writeFixture(root, relativePath, `import { getGeneralProcessPublishedArtifactPublisher as selectPublisher } from ${JSON.stringify(specifier)};\nselectPublisher();\n`);
      diagnostics.push(...checker.checkOneFile(importer, "AFB-004").map(formatViolation));
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toContain("importer=autobyteus-server-ts/src/application-platform/runtime/forbidden.ts");
  });

  it("accepts complete construction shapes and rejects every omission, null, undefined, and opaque spread", () => {
    for (const obligation of CONSTRUCTION_OBLIGATIONS) {
      const root = createFixtureRepository();
      const { importer, importLine } = installConstructionTarget(root, obligation);
      const checker = new ApplicationFrameworkBoundaryChecker(root);
      writeFixture(root, normalizePath(relative(root, importer)), importLine + constructionSnippet(obligation));
      expect(checker.checkOneFile(importer, "AFB-004").map(formatViolation), obligation.symbol).toEqual([]);

      for (const required of obligation.requiredInputs) {
        for (const kind of ["omitted", "null", "undefined", "spread"] as const) {
          writeFixture(
            root,
            normalizePath(relative(root, importer)),
            importLine + constructionSnippet(obligation, { required, kind }),
          );
          const diagnostics = checker.checkOneFile(importer, "AFB-004").map(formatViolation);
          const subject = required.kind === "positional"
            ? `${obligation.symbol}.argument[${required.argumentIndex}](${required.label})`
            : `${obligation.symbol}.argument[${required.argumentIndex}].${required.path}`;
          expect(diagnostics.join("\n"), `${obligation.symbol} ${subject} ${kind}`).toContain(`subject=${subject}`);
          expect(diagnostics.join("\n")).toContain(
            "[AFB-004] profile=server importer=autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts",
          );
          expect(diagnostics.join("\n")).toContain("resolved=");
          expect(diagnostics.join("\n")).toContain("reason=");
          expect(diagnostics.join("\n")).toContain("correction=Inject the named application-scoped dependency");
        }
      }
    }
  }, 30_000);

  it("preserves deliberately process-scoped Codex positions zero and two", () => {
    const root = createFixtureRepository();
    const obligation = CONSTRUCTION_OBLIGATIONS.find((candidate) => candidate.symbol === "CodexAgentRunBackendFactory")!;
    const { importer, importLine } = installConstructionTarget(root, obligation);
    const checker = new ApplicationFrameworkBoundaryChecker(root);
    for (const expression of [
      "new Target(undefined, codexThreadBootstrapper);",
      "new Target(undefined, codexThreadBootstrapper, undefined);",
    ]) {
      writeFixture(root, normalizePath(relative(root, importer)), `${importLine}const codexThreadBootstrapper = {};\n${expression}\n`);
      expect(checker.checkOneFile(importer, "AFB-004").map(formatViolation)).toEqual([]);
    }
  });

  it("guards the exact SR-011 host definition and public/general run authority", () => {
    const serverSourceRoot = join(REPOSITORY_ROOT, "autobyteus-server-ts/src");
    const readServerSource = (relativePath: string): string =>
      readFileSync(join(serverSourceRoot, relativePath), "utf8");

    expect(existsSync(join(
      serverSourceRoot,
      "application-platform/runtime/create-application-definition-services.ts",
    ))).toBe(false);
    expect(existsSync(join(
      serverSourceRoot,
      "application-platform/definitions/create-bundle-backed-definition-services.ts",
    ))).toBe(true);

    const bundleFactoryCallers = walkSourceFiles(serverSourceRoot)
      .filter((file) => !file.endsWith("create-bundle-backed-definition-services.ts"))
      .filter((file) => readFileSync(file, "utf8").includes("createBundleBackedDefinitionServices("))
      .map((file) => normalizePath(relative(REPOSITORY_ROOT, file)))
      .sort();
    expect(bundleFactoryCallers).toEqual([
      "autobyteus-server-ts/src/application-platform/launch-configuration/application-standalone-package-validator.ts",
      "autobyteus-server-ts/src/compositions/host-definition-services.ts",
    ]);

    for (const relativePath of [
      "compositions/build-studio-server.ts",
      "standalone-application-host/start-standalone-application-host.ts",
    ]) {
      const source = readServerSource(relativePath);
      const hostDefinitions = source.indexOf("createHostDefinitionServices({");
      const agentTools = source.indexOf("createAgentToolsMcpRuntime({", hostDefinitions);
      const generalRuns = source.indexOf("createGeneralProcessRunSupervisor({", agentTools);
      const applicationAssembly = relativePath.startsWith("compositions/")
        ? source.indexOf("createStudioApplicationServices({", generalRuns)
        : source.indexOf("buildApplicationPlatformRuntime({", generalRuns);
      expect(hostDefinitions, relativePath).toBeGreaterThanOrEqual(0);
      expect(agentTools, relativePath).toBeGreaterThan(hostDefinitions);
      expect(generalRuns, relativePath).toBeGreaterThan(agentTools);
      expect(applicationAssembly, relativePath).toBeGreaterThan(generalRuns);
      const supervisorInput = source.slice(generalRuns, applicationAssembly);
      expect(supervisorInput).toContain("appConfig:");
      expect(supervisorInput).toContain("agentDefinitionService:");
      expect(supervisorInput).toContain("agentTeamDefinitionService:");
      expect(supervisorInput).toContain("agentToolsSessionManager:");
    }
    const studioComposition = readServerSource("compositions/build-studio-server.ts");
    const studioApplicationAssembly = studioComposition.slice(
      studioComposition.indexOf("const createStudioApplicationServices"),
      studioComposition.indexOf("export const buildStudioServer"),
    );
    expect(studioApplicationAssembly).toContain("buildApplicationPlatformRuntime({");
    expect(studioApplicationAssembly).toContain(
      "agentDefinitionService: input.definitions.agentDefinitionService",
    );
    expect(studioApplicationAssembly).toContain(
      "agentTeamDefinitionService: input.definitions.agentTeamDefinitionService",
    );
    const generalSupervisor = readServerSource(
      "agent-execution/runtime/general-process-run-supervisor.ts",
    );
    for (const requiredConstruction of [
      "agentDefinitionService: input.agentDefinitionService",
      "new MemberTeamContextBuilder(\n        input.agentTeamDefinitionService",
      "teamDefinitionService: input.agentTeamDefinitionService",
      "agentRunIdentityAllocator,",
      "agentToolMcpSessionManager: input.agentToolsSessionManager",
      "taskRootResolver: callbacks.taskRootResolver",
      "bindProcessAgentRunService(agentRunService)",
      "bindProcessTeamRunService(teamRunService)",
    ]) {
      expect(generalSupervisor).toContain(requiredConstruction);
    }
    expect(generalSupervisor).toMatch(
      /new CodexThreadBootstrapper\([\s\S]*?input\.agentDefinitionService,[\s\S]*?input\.agentToolsSessionManager,[\s\S]*?\)/,
    );
    expect(generalSupervisor).toMatch(
      /new ClaudeSessionManager\([\s\S]*?input\.agentToolsSessionManager,[\s\S]*?\)/,
    );
    expect(generalSupervisor).toMatch(
      /new ClaudeSessionBootstrapper\([\s\S]*?input\.agentDefinitionService,[\s\S]*?\)/,
    );

    const publicAgentRun = readServerSource("api/graphql/types/agent-run.ts");
    const publicTeamRun = readServerSource("api/graphql/types/agent-team-run.ts");
    expect(publicAgentRun).toContain("getStudioAgentRunService");
    expect(publicAgentRun).not.toMatch(/\bgetAgentRunService\b/);
    expect(publicAgentRun).not.toContain("AgentRunManager");
    expect(publicTeamRun).toContain("getStudioTeamRunService");
    expect(publicTeamRun).not.toMatch(/\bgetTeamRunService\b/);

    for (const migration of [
      "app-data-migrations/migrations/run-history-index-v2-migration.ts",
      "app-data-migrations/migrations/team-run-history-index-v2-migration.ts",
    ]) {
      const source = readServerSource(migration);
      expect(source, migration).toContain("DefinitionPersistenceProvider");
      expect(source, migration).not.toMatch(/DefinitionService\.getInstance\s*\(/);
    }
    const cachePreloader = readServerSource("startup/cache-preloader.ts");
    expect(cachePreloader).not.toContain("AgentDefinitionService");
    expect(cachePreloader).not.toContain("AgentTeamDefinitionService");

    const definitionGetterOccurrences = walkSourceFiles(serverSourceRoot).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const count = [...source.matchAll(/\b(?:AgentDefinitionService|AgentTeamDefinitionService)\.getInstance\s*\(/g)].length;
      return Array.from(
        { length: count },
        () => normalizePath(relative(REPOSITORY_ROOT, file)),
      );
    }).sort();
    expect(definitionGetterOccurrences).toEqual([
      "autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts",
      "autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts",
      "autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts",
      "autobyteus-server-ts/src/agent-execution/compaction/memory-compactor-agent-launch-resolver.ts",
      "autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts",
      "autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts",
      "autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts",
      "autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts",
      "autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts",
      "autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts",
      "autobyteus-server-ts/src/agent-tools/agent-management/create-agent-definition.ts",
      "autobyteus-server-ts/src/agent-tools/agent-management/delete-agent-definition.ts",
      "autobyteus-server-ts/src/agent-tools/agent-management/get-agent-definition.ts",
      "autobyteus-server-ts/src/agent-tools/agent-management/list-agent-definitions.ts",
      "autobyteus-server-ts/src/agent-tools/agent-management/update-agent-definition.ts",
      "autobyteus-server-ts/src/agent-tools/agent-team-management/create-agent-team-definition.ts",
      "autobyteus-server-ts/src/agent-tools/agent-team-management/delete-agent-team-definition.ts",
      "autobyteus-server-ts/src/agent-tools/agent-team-management/get-agent-team-definition.ts",
      "autobyteus-server-ts/src/agent-tools/agent-team-management/list-agent-team-definitions.ts",
      "autobyteus-server-ts/src/agent-tools/agent-team-management/update-agent-team-definition.ts",
      "autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts",
      "autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts",
      "autobyteus-server-ts/src/external-channel/services/channel-binding-team-definition-options-service.ts",
      "autobyteus-server-ts/src/run-history/services/agent-run-history-catalog-service.ts",
      "autobyteus-server-ts/src/skill-improvement/services/retrospective-skill-improver-agent-settings-resolver.ts",
      "autobyteus-server-ts/src/skill-improvement/services/skill-improvement-target-context-resolver.ts",
    ].sort());

    const ambientRunServiceImports = walkSourceFiles(serverSourceRoot).flatMap((file) => {
      const sourceFile = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const imported: string[] = [];
      for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement)
          || !ts.isStringLiteral(statement.moduleSpecifier)
          || !/(?:agent-run-service|team-run-service)\.js$/.test(statement.moduleSpecifier.text)) continue;
        const bindings = statement.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) continue;
        for (const binding of bindings.elements) {
          const exported = binding.propertyName?.text ?? binding.name.text;
          if (exported === "getAgentRunService" || exported === "getTeamRunService") {
            imported.push(`${normalizePath(relative(REPOSITORY_ROOT, file))}:${exported}`);
          }
        }
      }
      return imported;
    }).sort();
    expect(ambientRunServiceImports).toEqual([
      "autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts:getAgentRunService",
      "autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts:getAgentRunService",
      "autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:getAgentRunService",
      "autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:getTeamRunService",
      "autobyteus-server-ts/src/external-channel/runtime/channel-run-output-delivery-runtime.ts:getAgentRunService",
      "autobyteus-server-ts/src/external-channel/runtime/channel-run-output-delivery-runtime.ts:getTeamRunService",
      "autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts:getTeamRunService",
      "autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:getTeamRunService",
      "autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts:getTeamRunService",
      "autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:getAgentRunService",
      "autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:getTeamRunService",
      "autobyteus-server-ts/src/skill-improvement/services/improver-session/skill-improvement-improver-session-service.ts:getAgentRunService",
    ].sort());
  });

  it("guards the exact SR-013 root-bound task construction inventory", () => {
    const managerOccurrences = sr013NewOccurrences("MixedTeamManager");
    expect(sr013OccurrencePaths(managerOccurrences)).toEqual([
      "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
      "autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts",
      "autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts",
    ].sort());
    const productionManagerResolverValues = new Map([
      [
        "autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts",
        "input.callbacks.taskRootResolver",
      ],
      [
        "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
        "callbacks.taskRootResolver",
      ],
      [
        "autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts",
        "callbacks.taskRootResolver",
      ],
    ]);
    for (const occurrence of managerOccurrences) {
      const value = sr013RequiredObjectProperty(occurrence, 1, "taskRootResolver");
      const expectedValue = productionManagerResolverValues.get(
        sr013RelativePath(occurrence.file),
      );
      if (expectedValue) {
        expect(value.getText(occurrence.sourceFile)).toBe(expectedValue);
      }
    }

    const factoryOccurrences = sr013NewOccurrences("MixedTeamRunBackendFactory");
    expect(sr013OccurrencePaths(factoryOccurrences)).toEqual([
      "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
      "autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts",
      "autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts",
      "autobyteus-server-ts/tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts",
      "autobyteus-server-ts/tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts",
      "autobyteus-server-ts/tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts",
    ].sort());

    const builderOccurrences = sr013BuilderCalls();
    expect(sr013OccurrencePaths(builderOccurrences)).toEqual([
      "autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts",
      "autobyteus-server-ts/tests/integration/application-backend/brief-package-team-prompt.integration.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/member-team-context-builder.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/member-team-context-builder.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/member-team-context-builder.test.ts",
      "autobyteus-server-ts/tests/unit/agent-team-execution/member-team-context-builder.test.ts",
    ].sort());
    for (const occurrence of builderOccurrences) {
      sr013RequiredObjectProperty(occurrence, 0, "taskRootResolver");
    }

    const memberContextOccurrences = sr013NewOccurrences("MemberTeamContext");
    expect(sr013OccurrencePaths(memberContextOccurrences)).toEqual([
      "autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts",
      "autobyteus-server-ts/tests/fixtures/current-team-run-fixtures.ts",
      "autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts",
      "autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts",
      "autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts",
    ].sort());
    for (const occurrence of memberContextOccurrences) {
      sr013RequiredObjectProperty(occurrence, 0, "taskRootResolver");
    }

    const contextOnlyFactoryTest = readFileSync(
      join(REPOSITORY_ROOT, "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts"),
      "utf8",
    );
    const contextOnlyFactoryPattern = new RegExp(
      `${["new", "MixedTeamRunBackendFactory"].join(" ")}\\s*\\(`,
      "g",
    );
    expect(contextOnlyFactoryTest.match(contextOnlyFactoryPattern)).toHaveLength(2);
    expect(contextOnlyFactoryTest).not.toMatch(/\.(?:createBackend|restoreBackend|createBackendForNode)\s*\(/);

    const factoryFile = join(
      REPOSITORY_ROOT,
      "autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts",
    );
    const factorySource = ts.createSourceFile(
      factoryFile,
      readFileSync(factoryFile, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const factoryClass = factorySource.statements.find(
      (statement): statement is ts.ClassDeclaration =>
        ts.isClassDeclaration(statement)
        && statement.name?.text === "MixedTeamRunBackendFactory",
    )!;
    for (const methodName of ["createBackend", "restoreBackend"]) {
      const method = factoryClass.members.find(
        (member): member is ts.MethodDeclaration =>
          ts.isMethodDeclaration(member)
          && ts.isIdentifier(member.name)
          && member.name.text === methodName,
      )!;
      const callbacks = method.parameters[2]!;
      expect(callbacks.name.getText(factorySource)).toBe("callbacks");
      expect(callbacks.questionToken).toBeUndefined();
      expect(callbacks.initializer).toBeUndefined();
      expect(callbacks.type?.getText(factorySource)).toBe("MixedTeamRunCallbacks");
    }

    const forbiddenImports: string[] = [];
    const forbiddenIdentifiers: string[] = [];
    const taskExecutionRoots = [
      join(REPOSITORY_ROOT, "autobyteus-server-ts/src/agent-tools/task-delegation"),
      join(REPOSITORY_ROOT, "autobyteus-server-ts/src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.ts"),
      join(REPOSITORY_ROOT, "autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts"),
      join(REPOSITORY_ROOT, "autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts"),
      join(REPOSITORY_ROOT, "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts"),
    ];
    for (const file of taskExecutionRoots.flatMap((entry) =>
      statSync(entry).isDirectory() ? walkSourceFiles(entry) : [entry])) {
      const sourceFile = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node): void => {
        if (ts.isImportDeclaration(node)
          && ts.isStringLiteral(node.moduleSpecifier)
          && node.moduleSpecifier.text.includes("team-run-service")) {
          const bindings = node.importClause?.namedBindings;
          const importsAmbientAccessor = bindings
            && ts.isNamedImports(bindings)
            && bindings.elements.some(
              (binding) => (binding.propertyName?.text ?? binding.name.text) === "getTeamRunService",
            );
          if (importsAmbientAccessor) forbiddenImports.push(sr013RelativePath(file));
        }
        if (ts.isIdentifier(node) && node.text === "noopCallbacks") {
          forbiddenIdentifiers.push(sr013RelativePath(file));
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
    expect(forbiddenImports).toEqual([]);
    expect(forbiddenIdentifiers).toEqual([]);
  }, 15_000);
});
