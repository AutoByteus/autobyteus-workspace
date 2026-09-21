import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(THIS_FILE), "../../..");
const SERVER = join(ROOT, "autobyteus-server-ts");
const SRC = join(SERVER, "src");
const TESTS = join(SERVER, "tests");
const relativeRoot = (path: string) => relative(ROOT, path).split("\\").join("/");
const read = (path: string) => readFileSync(path, "utf8");
const occurrences = (source: string, value: string) => source.split(value).length - 1;

const listFiles = (root: string): string[] => readdirSync(root).flatMap((name) => {
  const path = join(root, name);
  return statSync(path).isDirectory() ? listFiles(path) : [path];
});
const typescriptFiles = (root: string) => listFiles(root).filter((path) =>
  /\.(?:ts|tsx)$/.test(path),
);

const parse = (path: string) => ts.createSourceFile(
  path,
  read(path),
  ts.ScriptTarget.Latest,
  true,
  path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
);

type GovernedConstructorSymbol =
  | "AgentRunManager"
  | "FlatTeamRunBackendFactory"
  | "FlatTeamExecutionManager"
  | "MixedAgentMemberHandle";

const governedConstructorOccurrences = (
  path: string,
): Array<{ symbol: GovernedConstructorSymbol; node: ts.CallExpression | ts.NewExpression }> => {
  const found: Array<{
    symbol: GovernedConstructorSymbol;
    node: ts.CallExpression | ts.NewExpression;
  }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const symbol = node.expression.text;
      if (symbol === "AgentRunManager" || symbol === "FlatTeamRunBackendFactory" ||
        symbol === "FlatTeamExecutionManager" || symbol === "MixedAgentMemberHandle") {
        found.push({ symbol, node });
      }
    }
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === "AgentRunManager"
      && node.expression.name.text === "initializeProcessInstance"
    ) found.push({ symbol: "AgentRunManager", node });
    ts.forEachChild(node, visit);
  };
  visit(parse(path));
  return found;
};

const AGENT_MANAGER_TESTS = [
  "autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts",
  "autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts",
  "autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts",
];
const AGENT_RUN_TESTS = [
  "autobyteus-server-ts/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts",
  "autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts",
  "autobyteus-server-ts/tests/integration/agent-execution/compaction/recursive-memory-compactor-leaf.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts",
  "autobyteus-server-ts/tests/unit/agent-execution/agent-run.test.ts",
  "autobyteus-server-ts/tests/unit/agent-memory/agent-run-memory-recorder.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts",
  "autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts",
  "autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts",
];
const ROOT_TEAM_RUN_TESTS = [
  "autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/root-team-run-termination.test.ts",
  "autobyteus-server-ts/tests/unit/application-orchestration/application-team-input-root-dispatch.test.ts",
];
const TASK_DELEGATION_SERVICE_TESTS = [
  "autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-current-invariants.test.ts",
];
const AGENT_MANAGER_FIELDS = [
  "autoByteusBackendFactory",
  "codexBackendFactory",
  "claudeBackendFactory",
  "activationRegistry",
  "memoryRecorder",
  "providerInputNormalizer",
  "agentToolMcpRunSessionDeactivator",
] as const;
const AGENT_TEAM_MANAGER_FIELDS = [
  "memoryDir",
  "mixedTeamRunBackendFactory",
  "taskExecutionIdentity",
  "modelSelectionValidator",
] as const;
const AGENT_RUN_SERVICE_TESTS = [
  "autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts",
  "autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts",
  "autobyteus-server-ts/tests/unit/agent-execution/agent-run-create-service.test.ts",
  "autobyteus-server-ts/tests/unit/agent-execution/agent-run-lifecycle-observation.test.ts",
  "autobyteus-server-ts/tests/unit/agent-execution/agent-run-restore-service.test.ts",
  "autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts",
  "autobyteus-server-ts/tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts",
] as const;
const MIXED_MANAGER_TESTS = [
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts",
];
const MIXED_BACKEND_FACTORY_TESTS = [
  "autobyteus-server-ts/tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts",
];
const MIXED_HANDLE_TESTS = [
  "autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-native-activation.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts",
];
const AGENT_TEAM_MANAGER_CONSTRUCTION_TESTS = [
  "autobyteus-server-ts/tests/unit/agent-team-execution/team-run-model-selection-save.test.ts",
  "autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts",
  "autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/agent-team-run-manager-lifecycle.test.ts",
];
const AGENT_TEAM_MANAGER_INITIALIZATION_TESTS = [
  "autobyteus-server-ts/tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts",
];

const objectPropertyInitializer = (
  argument: ts.Expression | undefined,
  propertyName: string,
  sourceFile: ts.SourceFile,
): string | null => {
  if (!argument || !ts.isObjectLiteralExpression(argument)) return null;
  const property = argument.properties.find((candidate) =>
    (ts.isPropertyAssignment(candidate) || ts.isShorthandPropertyAssignment(candidate))
    && ((ts.isIdentifier(candidate.name) && candidate.name.text === propertyName)
      || (ts.isStringLiteral(candidate.name) && candidate.name.text === propertyName)),
  );
  if (property && ts.isPropertyAssignment(property)) {
    return property.initializer.getText(sourceFile);
  }
  return property && ts.isShorthandPropertyAssignment(property)
    ? property.name.getText(sourceFile)
    : null;
};

const hasExplicitObjectProperties = (
  argument: ts.Expression | undefined,
  names: readonly string[],
  sourceFile: ts.SourceFile,
): boolean => names.every((name) =>
  isExplicitNarrowInitializer(objectPropertyInitializer(argument, name, sourceFile)),
);

const directNewOccurrences = (
  path: string,
  symbol: string,
): ts.NewExpression[] => {
  const found: ts.NewExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
        node.expression.text === symbol) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(parse(path));
  return found;
};

const requiredDeactivatorInitializer = (
  node: ts.CallExpression | ts.NewExpression,
  sourceFile: ts.SourceFile,
): string | null => {
  const symbol = ts.isNewExpression(node) && ts.isIdentifier(node.expression)
    ? node.expression.text
    : "AgentRunManager";
  const argument = node.arguments[symbol === "FlatTeamExecutionManager" ? 1 : 0];
  return objectPropertyInitializer(
    argument,
    "agentToolMcpRunSessionDeactivator",
    sourceFile,
  );
};

const requiredFactoryCallbackInitializer = (
  node: ts.NewExpression,
  sourceFile: ts.SourceFile,
): string | null => objectPropertyInitializer(
  node.arguments?.[0],
  "createTeamManager",
  sourceFile,
);

const requiredTeamBackendFactoryInitializer = (
  node: ts.CallExpression | ts.NewExpression,
  sourceFile: ts.SourceFile,
): string | null => objectPropertyInitializer(
  node.arguments[0],
  "mixedTeamRunBackendFactory",
  sourceFile,
);

const isExplicitNarrowInitializer = (initializer: string | null): boolean =>
  initializer !== null
  && !/^(?:null|undefined)$/.test(initializer)
  && !/\bas\s+(?:any|never)\b/.test(initializer)
  && !/(?:getAgentTool|getMixedTeam|getInstance|sessionManager)/.test(initializer);

const isExplicitFactoryCallback = (initializer: string | null): boolean =>
  initializer !== null
  && !/^(?:null|undefined)$/.test(initializer)
  && !/^\s*[\w$.]+\s+as\s+(?:any|never)\s*$/.test(initializer)
  && !/(?:getMixedTeam|getInstance|sessionManager)/.test(initializer);

const agentTeamManagerOccurrences = (
  path: string,
): Array<{ kind: "construct" | "initialize"; node: ts.CallExpression | ts.NewExpression }> => {
  const found: Array<{
    kind: "construct" | "initialize";
    node: ts.CallExpression | ts.NewExpression;
  }> = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "AgentTeamRunManager"
    ) found.push({ kind: "construct", node });
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === "AgentTeamRunManager"
      && node.expression.name.text === "initializeProcessInstance"
    ) found.push({ kind: "initialize", node });
    ts.forEachChild(node, visit);
  };
  visit(parse(path));
  return found;
};

const validateSyntheticDeactivator = (snippet: string): boolean => {
  const sourceFile = ts.createSourceFile(
    "fixture.ts",
    snippet,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let valid = false;
  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node) || ts.isCallExpression(node)) {
      const initializer = requiredDeactivatorInitializer(node, sourceFile);
      if (isExplicitNarrowInitializer(initializer)) valid = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return valid;
};

const validateSyntheticFactoryOptions = (snippet: string): boolean => {
  const sourceFile = ts.createSourceFile(
    "fixture.ts",
    snippet,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let valid = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "FlatTeamRunBackendFactory"
    ) {
      valid = isExplicitFactoryCallback(
        requiredFactoryCallbackInitializer(node, sourceFile),
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return valid;
};

const validateSyntheticTeamManagerOptions = (snippet: string): boolean => {
  const sourceFile = ts.createSourceFile(
    "fixture.ts",
    snippet,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let valid = false;
  for (const occurrence of agentTeamManagerOccurrencesFromSource(sourceFile)) {
    valid = hasExplicitObjectProperties(
      occurrence.node.arguments[0],
      AGENT_TEAM_MANAGER_FIELDS,
      sourceFile,
    );
  }
  return valid;
};

const validateSyntheticAgentManagerOptions = (snippet: string): boolean => {
  const sourceFile = ts.createSourceFile(
    "fixture.ts",
    snippet,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let valid = false;
  const visit = (node: ts.Node): void => {
    const isConstructor = ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
      node.expression.text === "AgentRunManager";
    const isInitializer = ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "AgentRunManager" &&
      node.expression.name.text === "initializeProcessInstance";
    if (isConstructor || isInitializer) {
      valid = hasExplicitObjectProperties(node.arguments[0], AGENT_MANAGER_FIELDS, sourceFile);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return valid;
};

const agentTeamManagerOccurrencesFromSource = (
  sourceFile: ts.SourceFile,
): Array<{ node: ts.CallExpression | ts.NewExpression }> => {
  const found: Array<{ node: ts.CallExpression | ts.NewExpression }> = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "AgentTeamRunManager"
    ) found.push({ node });
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === "AgentTeamRunManager"
      && node.expression.name.text === "initializeProcessInstance"
    ) found.push({ node });
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
};

describe("agent provider composition boundaries", () => {
  it("keeps each supported root on one exact workspace, builder, Host, and authority family", () => {
    for (const path of [
      join(SRC, "compositions/build-studio-server.ts"),
      join(SRC, "standalone-application-host/start-standalone-application-host.ts"),
    ]) {
      const source = read(path);
      expect(occurrences(source, "const workspaceManager = getWorkspaceManager();"), path)
        .toBe(1);
      expect(occurrences(source, "createAgentToolsMcpHost({"), path).toBe(1);
      expect(occurrences(source, "createProcessAgentProviderFactoryBuilder({"), path)
        .toBe(1);
      expect(source).toContain("createProcessAgentProviderFactoryBuilder({\n      workspaceManager,");
      expect(source).toMatch(/createGeneralProcessRunSupervisor\(\{[\s\S]*?workspaceManager,[\s\S]*?agentProviderFactoryBuilder,[\s\S]*?agentToolMcpSessionAuthority:/);
      expect(source).toMatch(/buildApplicationPlatformRuntime\(\{[\s\S]*?agentToolMcpSessionAuthorities:[\s\S]*?agentProviderFactoryBuilder,[\s\S]*?workspaceManager,/);
      expect(source).not.toContain("agentToolsMcpHost.routeDependencies");
      expect(source).not.toContain("registerAgentToolsMcpRoutes");
    }

    const localServer = read(join(SRC, "agent-tools/mcp/agent-tools-mcp-local-server.ts"));
    expect(occurrences(localServer, "registerAgentToolsMcpRoutes("))
      .toBe(1);
    expect(localServer).toContain('this.app.listen({ host: "127.0.0.1", port: 0 })');
  });

  it("keeps application capability injection tight on the tokenless run-session foundation", () => {
    const sessionFiles = [
      "agent-tools/mcp/agent-tool-mcp-session.ts",
      "agent-tools/mcp/agent-tool-mcp-session-authority.ts",
      "agent-tools/mcp/agent-tool-mcp-session-service.ts",
      "agent-tools/mcp/agent-tool-mcp-session-registry.ts",
      "agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts",
      "agent-tools/mcp/agent-tools-mcp-host.ts",
    ].map((relativePath) => read(join(SRC, relativePath))).join("\n");
    expect(sessionFiles).toContain("applicationAgentTools: ApplicationAgentToolCapability | null");
    expect(sessionFiles).toContain("activateForRun");
    expect(sessionFiles).toContain("deactivateForRun");
    expect(sessionFiles).not.toMatch(
      /issueForRun|SessionIssuer|SessionRevoker|SessionReleaser|authorizationHeader|bearerToken|tokenHash|revokeForOwner|releaseForOwner/,
    );

    const providerBuilder = read(join(
      SRC,
      "agent-execution/providers/agent-provider-factory-builder.ts",
    ));
    expect(providerBuilder).toContain(
      "applicationAgentTools: ApplicationAgentToolCapability | null",
    );
    const general = read(join(
      SRC,
      "agent-execution/runtime/general-process-run-supervisor.ts",
    ));
    expect(general).toMatch(
      /createForExecution\(\{[\s\S]*?applicationAgentTools: null,[\s\S]*?\}\)/,
    );
    const applicationKernel = read(join(
      SRC,
      "application-platform/execution/application-execution-scope-kernel-builder.ts",
    ));
    expect(applicationKernel).toMatch(
      /createForExecution\(\{[\s\S]*?applicationAgentTools: input\.applicationAgentTools,[\s\S]*?\}\)/,
    );

    for (const relativePath of [
      "application-orchestration/services/application-catalog-transition-service.ts",
      "application-orchestration/services/application-reentry-service.ts",
      "application-packages/services/application-package-command-service.ts",
    ]) {
      expect(read(join(SRC, relativePath)), relativePath).not.toMatch(
        /AgentToolMcp|activateForRun|deactivateForRun/,
      );
    }
  });

  it("closes retired symbols and provider-specific construction below supported roots", () => {
    const retired = [
      "AgentTools" + "McpRuntime",
      "createAgentTools" + "McpRuntime",
      "ApplicationAgentTool" + "McpSessionScope",
      "ScopedAgentTool" + "McpSessionManager",
      "ApplicationAgentTools" + "SessionFactory",
      "generalProcess" + "SessionManager",
    ];
    const files = [...typescriptFiles(SRC), ...typescriptFiles(TESTS)]
      .filter((path) => path !== THIS_FILE);
    for (const path of files) {
      const source = read(path);
      for (const symbol of retired) expect(source, `${relativeRoot(path)}:${symbol}`)
        .not.toContain(symbol);
    }

    const roots = [
      join(SRC, "agent-execution/runtime/general-process-run-supervisor.ts"),
      join(SRC, "application-platform/execution/application-execution-scope.ts"),
      join(SRC, "application-platform/execution/application-execution-scope-kernel-builder.ts"),
      join(SRC, "compositions/build-studio-server.ts"),
      join(SRC, "standalone-application-host/start-standalone-application-host.ts"),
    ];
    for (const path of roots) {
      expect(read(path), relativeRoot(path)).not.toMatch(
        /new (?:AutoByteusAgentRunBackendFactory|CodexAgentRunBackendFactory|ClaudeAgentRunBackendFactory|CodexThreadBootstrapper|ClaudeSessionManager|ClaudeSessionBootstrapper)|get(?:Codex|Claude).*Factory/,
      );
    }
  });

  it("keeps activation provider-local and deactivation at the AgentRun resource owner", () => {
    const nonOwningLocalFiles = [
      "agent-team-execution/local/flat-team-execution-manager.ts",
      "agent-team-execution/local/registries/configured-agent-execution-registry.ts",
      "agent-team-execution/local/registries/task-agent-execution-registry.ts",
    ];
    for (const relativePath of nonOwningLocalFiles) {
      expect(read(join(SRC, relativePath)), relativePath).not.toMatch(/AgentToolMcp|agentToolMcp/);
    }
    const handle = read(join(SRC, "agent-collaboration/execution/backends/configured-agent-execution-handle.ts"));
    expect(handle).toContain("this.manager.prepareAgentRunTermination(this.agentRun)");
    expect(handle).not.toMatch(/RootTeamRun|AgentOrgRun|ExecutionTreeStore|HistoryIndexStore/);
  });
  it("keeps the application kernel private to its builder and owning scope", () => {
    const allowed = new Set([
      "autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts",
      "autobyteus-server-ts/src/application-platform/execution/application-execution-scope.ts",
    ]);
    for (const path of typescriptFiles(SRC)) {
      const relativePath = relativeRoot(path);
      if (allowed.has(relativePath)) continue;
      expect(read(path), relativePath).not.toContain("ApplicationExecutionScopeKernel");
    }
    const scope = read(join(SRC, "application-platform/execution/application-execution-scope.ts"));
    expect(scope).toContain("private readonly kernel: ApplicationExecutionScopeKernel");
    expect(scope).not.toMatch(/BuiltKernel|buildScope|sessionManager!|bind[A-Z]/);
  });

  it("keeps configured Agent and flat-Team construction inside their owned factories", () => {
    expect(typescriptFiles(SRC)
      .filter((path) => read(path).includes("new ConfiguredAgentExecutionHandle("))
      .map(relativeRoot)).toEqual([
      "autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-factory.ts",
    ]);
    expect(typescriptFiles(SRC)
      .filter((path) => read(path).includes("new FlatTeamExecutionManager("))
      .map(relativeRoot)).toEqual([
      "autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts",
    ]);
  });
  it("keeps AgentTeamRunManager creation explicit and process access lookup-only", () => {
    const production = typescriptFiles(SRC)
      .filter((path) => !path.endsWith("agent-team-run-manager.ts"))
      .filter((path) => /new AgentTeamRunManager\(|AgentTeamRunManager\.initializeProcessInstance\(/.test(read(path)))
      .map(relativeRoot)
      .sort();
    expect(production).toEqual([
      "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
      "autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts",
    ]);
    for (const relativePath of production) {
      const source = read(join(ROOT, relativePath));
      for (const required of ["memoryDir", "flatTeamExecutionFactory", "taskExecutionIdentity", "modelSelectionValidator", "memberExecutionContextBuilder"]) {
        expect(source, `${relativePath}:${required}`).toContain(required);
      }
    }
    const managerSource = read(join(SRC, "agent-team-execution/services/agent-team-run-manager.ts"));
    expect(managerSource).toContain("static getInstance(): AgentTeamRunManager");
    expect(managerSource).not.toMatch(/instance \?\?= new AgentTeamRunManager|getFlatTeamRunBackendFactory/);
  });
  it("binds exactly two production flat-Team factories to complete lifecycle roots", () => {
    const expectedRoots = [
      "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
      "autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts",
    ];
    const actualRoots = typescriptFiles(SRC)
      .filter((path) => read(path).includes("new FlatTeamExecutionFactory("))
      .map(relativeRoot)
      .sort();
    expect(actualRoots).toEqual([...expectedRoots].sort());
    for (const relativePath of expectedRoots) {
      const source = read(join(ROOT, relativePath));
      for (const required of ["agentRunManager", "memoryLocator", "activityInspector", "workspaceManager"]) {
        expect(source, `${relativePath}:${required}`).toContain(required);
      }
    }
    const factory = read(join(SRC, "agent-team-execution/local/flat-team-execution-factory.ts"));
    expect(factory).not.toMatch(/RootTeamRun|AgentOrgRun|ExecutionTreeStore|HistoryIndexStore|registerRoot/);
  });
  it("closes complete Agent manager and AgentRun construction to production roots", () => {
    const productionManagerRoots = typescriptFiles(SRC)
      .filter((path) => governedConstructorOccurrences(path).some((occurrence) => occurrence.symbol === "AgentRunManager"))
      .map(relativeRoot)
      .filter((path) => !path.endsWith("agent-run-manager.ts"))
      .sort();
    expect(productionManagerRoots).toEqual([
      "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
      "autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts",
    ].sort());
    expect(typescriptFiles(SRC)
      .filter((path) => directNewOccurrences(path, "AgentRun").length > 0)
      .map(relativeRoot)).toEqual([
      "autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts",
    ]);
  });
  it("selects one host validator and propagates it to the two exact lifecycle roots", () => {
    const hosts = [
      "autobyteus-server-ts/src/compositions/build-studio-server.ts",
      "autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts",
    ];
    expect(typescriptFiles(SRC)
      .filter((path) => directNewOccurrences(path, "RunModelSelectionService").length > 0)
      .map(relativeRoot)
      .sort()).toEqual([...hosts].sort());
    for (const relativePath of hosts) {
      const path = join(ROOT, relativePath);
      const sourceFile = parse(path);
      const constructions = directNewOccurrences(path, "RunModelSelectionService");
      expect(constructions, relativePath).toHaveLength(1);
      expect(
        isExplicitNarrowInitializer(constructions[0]?.arguments?.[0]?.getText(sourceFile) ?? null),
        `${relativePath}:catalog`,
      ).toBe(true);
      const source = read(path);
      expect(occurrences(source, "modelSelectionValidator,"), relativePath).toBeGreaterThanOrEqual(2);
    }

    const expectedRoots = [
      "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
      "autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts",
    ];
    const lifecycleRoots = typescriptFiles(SRC)
      .filter((path) => directNewOccurrences(path, "StandaloneAgentRunLifecycleService").length > 0)
      .map(relativeRoot)
      .sort();
    expect(lifecycleRoots).toEqual([...expectedRoots].sort());
    for (const relativePath of lifecycleRoots) {
      const path = join(ROOT, relativePath);
      const sourceFile = parse(path);
      for (const occurrence of directNewOccurrences(path, "StandaloneAgentRunLifecycleService")) {
        expect(isExplicitNarrowInitializer(objectPropertyInitializer(
          occurrence.arguments?.[1], "modelSelectionValidator", sourceFile,
        )), `${relativePath}:modelSelectionValidator`).toBe(true);
      }
    }
    for (const relativePath of [
      "autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts",
      "autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts",
      "autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts",
      ...expectedRoots,
    ]) {
      expect(read(join(ROOT, relativePath)), relativePath).not.toContain("getModelCatalogService");
    }
  });

  it("carries one explicit task-identity capability through both subject roots", () => {
    const teamManager = read(join(SRC, "agent-team-execution/services/agent-team-run-manager.ts"));
    expect(teamManager).toContain("taskExecutionIdentity");
    const teamMaterializer = read(join(SRC, "agent-team-execution/services/team-root-materializer.ts"));
    expect(teamMaterializer).toMatch(/new RootTeamRun\(\{[\s\S]*taskExecutionIdentity/);
    const orgBuilder = read(join(SRC, "agent-org-execution/services/agent-org-execution-scope-builder.ts"));
    expect(orgBuilder).toContain("taskExecutionIdentity");
    const identityOwner = read(join(SRC, "agent-team-execution/task-delegation/task-execution-identity-capabilities.ts"));
    expect(identityOwner).toContain("new TaskTeamRunIdentityFactory(agentRuns)");
  });
  it("keeps context translation provider-neutral and all path authority explicit", () => {
    const forbiddenProviderOwners = [
      "agent-customization/processors/prompt/user-input-context-building-processor.ts",
      "agent-execution/backends/codex/thread/codex-user-input-mapper.ts",
      "agent-execution/backends/claude/session/claude-session-manager.ts",
      "agent-execution/backends/claude/session/claude-session-state-input.ts",
      "agent-execution/backends/claude/session/claude-session.ts",
      "agent-execution/domain/agent-run.ts",
      "agent-team-execution/task-delegation/task-delegation-service.ts",
      "agent-team-execution/task-delegation/task-team-run-identity-factory.ts",
    ];
    for (const relativePath of forbiddenProviderOwners) {
      expect(read(join(SRC, relativePath)), relativePath).not.toMatch(
        /ContextFileLocalPathResolver|ContextFileOwnerResolver|TeamRunExecutionTreeLocationService|appConfigProvider/,
      );
    }
    const normalizer = read(join(
      SRC,
      "agent-execution/input/agent-run-provider-input-normalizer.ts",
    ));
    expect(normalizer).not.toMatch(/agent-execution\/backends|RuntimeKind|ProviderFactory/);
    for (const relativePath of [
      "context-files/store/context-file-layout.ts",
      "context-files/services/context-file-local-path-resolver.ts",
      "context-files/services/context-file-owner-resolver.ts",
      "context-files/services/context-file-read-service.ts",
      "context-files/services/context-file-finalization-service.ts",
    ]) expect(read(join(SRC, relativePath)), relativePath)
      .not.toMatch(/appConfigProvider|AgentTeamRunManager\.getInstance/);

    const ownerResolverRoots = typescriptFiles(SRC)
      .filter((path) => directNewOccurrences(path, "ContextFileOwnerResolver").length > 0)
      .map(relativeRoot)
      .sort();
    expect(ownerResolverRoots).toEqual([
      "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
      "autobyteus-server-ts/src/api/rest/context-files.ts",
      "autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts",
    ].sort());
    const localResolverRoots = typescriptFiles(SRC)
      .filter((path) => directNewOccurrences(path, "ContextFileLocalPathResolver").length > 0)
      .map(relativeRoot)
      .sort();
    expect(localResolverRoots).toEqual([
      "autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts",
      "autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts",
    ].sort());
  });

  it("creates one frozen context path value per host and shares it across both roots", () => {
    const hostPaths = [
      "autobyteus-server-ts/src/compositions/build-studio-server.ts",
      "autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts",
    ];
    expect(typescriptFiles(SRC)
      .filter((path) => read(path).includes("createContextFilePathEnvironment({"))
      .map(relativeRoot)
      .sort()).toEqual([...hostPaths].sort());
    for (const relativePath of hostPaths) {
      const source = read(join(ROOT, relativePath));
      expect(occurrences(source, "createContextFilePathEnvironment({"), relativePath).toBe(1);
      expect(occurrences(source, "contextFilePathEnvironment,"), relativePath)
        .toBeGreaterThanOrEqual(2);
    }
    const general = read(join(SRC, "agent-execution/runtime/general-process-run-supervisor.ts"));
    expect(general).not.toMatch(/AppConfig|appConfigProvider|\.getMemoryDir\(|\.getAppDataDir\(|\.getBaseUrl\(/);
    expect(general).toContain("contextFilePathEnvironment: ContextFilePathEnvironment");
  });

  it("rejects retired root-bound execution construction symbols", () => {
    const retired = ["MixedAgentMemberHandle", "FlatTeamRunBackendFactory", "MemberTaskRootResolver"];
    for (const path of typescriptFiles(SRC)) {
      const source = read(path);
      for (const symbol of retired) expect(source, `${relativeRoot(path)}:${symbol}`).not.toContain(symbol);
    }
  });
});
