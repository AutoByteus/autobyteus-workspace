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

const governedConstructorOccurrences = (
  path: string,
): Array<{ symbol: "AgentRunManager" | "MixedTeamManager" | "MixedAgentMemberHandle"; node: ts.CallExpression | ts.NewExpression }> => {
  const found: Array<{
    symbol: "AgentRunManager" | "MixedTeamManager" | "MixedAgentMemberHandle";
    node: ts.CallExpression | ts.NewExpression;
  }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const symbol = node.expression.text;
      if (symbol === "AgentRunManager" || symbol === "MixedTeamManager" ||
        symbol === "MixedAgentMemberHandle") found.push({ symbol, node });
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
  "autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts",
];
const MIXED_MANAGER_TESTS = [
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts",
];
const MIXED_HANDLE_TESTS = [
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-native-activation.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts",
  "autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts",
];

const requiredReleaserInitializer = (
  node: ts.CallExpression | ts.NewExpression,
  sourceFile: ts.SourceFile,
): string | null => {
  const symbol = ts.isNewExpression(node) && ts.isIdentifier(node.expression)
    ? node.expression.text
    : "AgentRunManager";
  const argument = node.arguments[symbol === "MixedTeamManager" ? 1 : 0];
  if (!argument || !ts.isObjectLiteralExpression(argument)) return null;
  const property = argument.properties.find((candidate): candidate is ts.PropertyAssignment =>
    ts.isPropertyAssignment(candidate)
    && ((ts.isIdentifier(candidate.name) && candidate.name.text === "agentToolMcpRunSessionReleaser")
      || (ts.isStringLiteral(candidate.name)
        && candidate.name.text === "agentToolMcpRunSessionReleaser")),
  );
  return property?.initializer.getText(sourceFile) ?? null;
};

const validateSyntheticReleaser = (snippet: string): boolean => {
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
      const initializer = requiredReleaserInitializer(node, sourceFile);
      if (initializer && !/^(?:null|undefined)$/.test(initializer)
        && !/\bas\s+(?:any|never)\b/.test(initializer)
        && !/(?:getAgentTool|getInstance|sessionManager)/.test(initializer)) valid = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return valid;
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
      expect(occurrences(source, "createAgentToolsMcpHost()"), path).toBe(1);
      expect(occurrences(source, "createProcessAgentProviderFactoryBuilder({"), path)
        .toBe(1);
      expect(source).toContain("createProcessAgentProviderFactoryBuilder({\n      workspaceManager,");
      expect(source).toMatch(/createGeneralProcessRunSupervisor\(\{[\s\S]*?workspaceManager,[\s\S]*?agentProviderFactoryBuilder,[\s\S]*?agentToolMcpSessionAuthority:/);
      expect(source).toMatch(/buildApplicationPlatformRuntime\(\{[\s\S]*?agentToolMcpSessionAuthorities:[\s\S]*?agentProviderFactoryBuilder,[\s\S]*?workspaceManager,/);
      expect(source).toContain("agentToolsMcpHost.routeDependencies");
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

  it("propagates only the issuer or run-session releaser through governed execution files", () => {
    const issuerFiles = [
      "agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts",
      "agent-execution/backends/claude/session/claude-session-manager.ts",
      "agent-execution/backends/claude/session/claude-session.ts",
      "agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts",
    ];
    const releaserFiles = [
      "agent-execution/services/agent-run-manager.ts",
      "agent-execution/services/agent-run-resource-manager.ts",
      "agent-team-execution/backends/mixed/mixed-team-manager.ts",
      "agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts",
      "agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts",
      "agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts",
    ];
    for (const relativePath of issuerFiles) {
      const source = read(join(SRC, relativePath));
      expect(source, relativePath).toMatch(
        /AgentToolMcpSessionIssuer|agentToolMcpSessionIssuer|sessionIssuer/,
      );
      expect(source, relativePath).not.toMatch(/AgentToolsMcpHost|ScopedAgentToolMcpSessionAuthority|AgentToolMcpSessionManager|getAgentToolMcpSessionService/);
    }
    for (const relativePath of releaserFiles) {
      const source = read(join(SRC, relativePath));
      expect(source, relativePath).toContain("AgentToolMcpRunSessionReleaser");
      expect(source, relativePath).not.toMatch(/AgentToolsMcpHost|ScopedAgentToolMcpSessionAuthority|AgentToolMcpSessionManager|getAgentToolMcpSessionService/);
    }
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

  it("fails closed on the exact direct-constructor test sets and narrow fixture property", () => {
    const actual = new Map<string, Set<string>>([
      ["AgentRunManager", new Set()],
      ["MixedTeamManager", new Set()],
      ["MixedAgentMemberHandle", new Set()],
    ]);
    for (const path of typescriptFiles(TESTS)) {
      if (path === THIS_FILE) continue;
      const sourceFile = parse(path);
      for (const occurrence of governedConstructorOccurrences(path)) {
        const relativePath = relativeRoot(path);
        actual.get(occurrence.symbol)!.add(relativePath);
        const initializer = requiredReleaserInitializer(occurrence.node, sourceFile);
        expect(initializer, `${relativePath}:${occurrence.symbol}`).not.toBeNull();
        expect(initializer, `${relativePath}:${occurrence.symbol}`).not.toMatch(
          /^(?:null|undefined)$|\bas\s+(?:any|never)\b|getAgentTool|getInstance|sessionManager/,
        );
        expect(read(path), relativePath).toContain(
          "agent-tool-mcp-run-session-releaser-fixtures.js",
        );
      }
    }
    expect([...actual.get("AgentRunManager")!].sort()).toEqual([...AGENT_MANAGER_TESTS].sort());
    expect([...actual.get("MixedTeamManager")!].sort()).toEqual([...MIXED_MANAGER_TESTS].sort());
    expect([...actual.get("MixedAgentMemberHandle")!].sort()).toEqual([...MIXED_HANDLE_TESTS].sort());
  });

  it("rejects synthetic omission, null, undefined, casts, ambient getters, and broad substitutes", () => {
    for (const invalid of [
      "new AgentRunManager({})",
      "new AgentRunManager({ agentToolMcpRunSessionReleaser: null })",
      "new MixedTeamManager(ctx, { agentToolMcpRunSessionReleaser: undefined })",
      "new MixedAgentMemberHandle({ agentToolMcpRunSessionReleaser: missing as never })",
      "new AgentRunManager({ agentToolMcpRunSessionReleaser: getAgentToolMcpRunSessionReleaser() })",
      "new AgentRunManager({ agentToolMcpRunSessionReleaser: sessionManager })",
    ]) expect(validateSyntheticReleaser(invalid), invalid).toBe(false);
    expect(validateSyntheticReleaser(
      "new AgentRunManager({ agentToolMcpRunSessionReleaser: recording.releaser })",
    )).toBe(true);
  });
});
