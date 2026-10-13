// Implementation-scoped source/config/prompt proof. Run from this task's worktree root.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const ts = require(process.cwd() + '/autobyteus-server-ts/node_modules/typescript');
const root = process.cwd();
const base = 'b238f2bf20624d80a70bdf75c321a36180f15fdc';
const packageRoot = path.resolve('autobyteus-server-ts');
const target = 'autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts';
const historical = file => cp.execFileSync('git', ['show', base + ':' + file], {encoding: 'utf8'});
const source = fs.readFileSync(target, 'utf8');
const original = historical(target);
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
function promptFixture(text) {
  const file = ts.createSourceFile(target, text, ts.ScriptTarget.Latest, true);
  let expression;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'composeSharedCarpenterPrompt') {
      const prop = node.arguments[0].properties.find(p => p.name?.getText(file) === 'agentDefinition');
      expression = prop.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(expression);
  const object = ts.isNewExpression(expression) ? expression.arguments[0] : expression;
  assert.ok(ts.isObjectLiteralExpression(object));
  const fields = Object.fromEntries(object.properties.map(p => {
    assert.ok(ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer));
    return [p.name.getText(file), p.initializer.text];
  }));
  return {fields, expression: expression.getText(file), constructed: ts.isNewExpression(expression)};
}
const before = promptFixture(original), after = promptFixture(source);
assert.deepEqual(after.fields, before.fields);
assert.equal(before.constructed, false);
assert.equal(after.constructed, true);
let normalized = source.replace(after.expression, before.expression)
  .replace('import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";\n', '')
  .replace('        status: snapshot.status,\n', '        status: snapshot.status,\n        canInterrupt: snapshot.can_interrupt === true,\n')
  .replace(' * Optional scoped typecheck (this file and normal imports, inherited build compiler policy):\n * pnpm -C autobyteus-server-ts typecheck:claude-interrupt-resume-e2e\n * Run server prebuild first for shared outputs/Prisma. Any compiler diagnostic fails;\n * a clean scoped result is not a repository-wide test-typecheck or live-provider pass.\n', '');
const originalCloseObservation = '    const socket = harness.socket;\n    if (!socket || socket.readyState === WebSocket.CLOSED) return;\n    if (socket.readyState === WebSocket.CONNECTING) socket.terminate();\n    else socket.close();\n    try {\n      await waitForCondition(() => socket.readyState === WebSocket.CLOSED, "owned websocket closes");\n    } finally {\n      if (socket.readyState !== WebSocket.CLOSED) socket.terminate();\n    }';
const revisedCloseObservation = '    const socket = harness.socket;\n    if (!socket) return;\n    const socketClosed = (): boolean => socket.readyState === WebSocket.CLOSED;\n    if (socketClosed()) return;\n    if (socket.readyState === WebSocket.CONNECTING) socket.terminate();\n    else socket.close();\n    try {\n      await waitForCondition(socketClosed, "owned websocket closes");\n    } finally {\n      if (!socketClosed()) socket.terminate();\n    }';
assert.equal(source.split(revisedCloseObservation).length - 1, 1);
normalized = normalized.replace(revisedCloseObservation, originalCloseObservation);
assert.equal(normalized, original, 'Only the exact SR-002/SR-003 authorized source edits may differ.');
const oldPackage = JSON.parse(historical('autobyteus-server-ts/package.json'));
const currentPackage = JSON.parse(fs.readFileSync('autobyteus-server-ts/package.json', 'utf8'));
const scopedCommand = currentPackage.scripts['typecheck:claude-interrupt-resume-e2e'];
assert.equal(scopedCommand, 'pnpm prepare:shared && tsc -p tsconfig.claude-interrupt-resume-e2e.json --noEmit');
assert.equal(currentPackage.devDependencies['@types/ws'], '8.18.1');
const originalShape = structuredClone(currentPackage);
delete originalShape.scripts['typecheck:claude-interrupt-resume-e2e'];
delete originalShape.devDependencies['@types/ws'];
assert.deepEqual(originalShape, oldPackage);
assert.equal(JSON.parse(fs.readFileSync(path.join(packageRoot, 'node_modules/@types/ws/package.json'))).version, '8.18.1');
const addedLockBlock = "      '@types/ws':\n        specifier: 8.18.1\n        version: 8.18.1\n";
assert.equal(fs.readFileSync('pnpm-lock.yaml', 'utf8').replace(addedLockBlock, ''), historical('pnpm-lock.yaml'));
function config(name) {
  const file = path.join(packageRoot, name);
  const read = ts.readConfigFile(file, ts.sys.readFile);
  assert.equal(read.error, undefined);
  const result = ts.parseJsonConfigFileContent(read.config, ts.sys, packageRoot, undefined, file);
  assert.deepEqual(result.errors, []);
  return result;
}
const build = config('tsconfig.build.json'), scoped = config('tsconfig.claude-interrupt-resume-e2e.json');
assert.deepEqual(scoped.fileNames, [path.resolve(target)]);
const policy = options => Object.fromEntries(Object.entries(options)
  .filter(([key]) => !['rootDir', 'noEmit', 'configFilePath'].includes(key)));
assert.deepEqual(policy(scoped.options), policy(build.options));
assert.equal(scoped.options.rootDir, packageRoot);
assert.equal(scoped.options.noEmit, true);
// Match the actual package-local tsc cwd; do not add type-root/compiler overrides.
const originalCwd = process.cwd();
let program, diagnostics;
try {
  process.chdir(packageRoot);
  program = ts.createProgram(scoped.fileNames, scoped.options);
  diagnostics = ts.getPreEmitDiagnostics(program);
} finally { process.chdir(originalCwd); }
assert.deepEqual(diagnostics, []); // Total diagnostics: no filtering or baseline exemption.
const files = program.getSourceFiles().map(f => f.fileName);
assert.ok(files.includes(path.resolve(target)));
assert.ok(files.includes(path.join(packageRoot, 'src/agent-definition/domain/models.ts')));
assert.ok(files.includes(path.join(packageRoot, 'src/agent-execution/services/agent-run-status-projection-service.ts')));
assert.ok(files.some(f => f.includes('/@types/ws/') && f.endsWith('.d.ts')));
assert.deepEqual(files.filter(f => f.startsWith(packageRoot + '/tests/') && f.endsWith('.test.ts')), [path.resolve(target)]);
fs.writeFileSync(path.join(__dirname, 'scoped-graph-files.txt'), files.join('\n') + '\n');
const checker = program.getTypeChecker(), callbacks = [];
function inspect(node) {
  if (ts.isArrowFunction(node) && ts.isCallExpression(node.parent) &&
      ts.isPropertyAccessExpression(node.parent.expression) && ['on', 'once'].includes(node.parent.expression.name.text)) {
    for (const param of node.parameters) {
      if (!['data', 'raw', 'error'].includes(param.name.getText())) continue;
      const type = checker.getTypeAtLocation(param);
      assert.equal(Boolean(type.flags & ts.TypeFlags.Any), false);
      callbacks.push({parameter: param.name.getText(), type: checker.typeToString(type)});
    }
  }
  ts.forEachChild(node, inspect);
}
inspect(program.getSourceFile(path.resolve(target)));
assert.ok(callbacks.some(c => c.parameter === 'data' && c.type === 'RawData'));
assert.ok(callbacks.some(c => c.parameter === 'raw' && c.type === 'RawData'));
assert.ok(callbacks.some(c => c.parameter === 'error' && c.type === 'Error'));
// Compile only the real prompt/constructor runtime dependency graph into private temp ESM.
// This executes their actual source, not a substitute renderer or widened fixture contract.
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-prompt-equality-'));
  const emitted = new Set();
  try {
    fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"module"}\n');
    function emit(relative) {
      if (emitted.has(relative)) return;
      emitted.add(relative);
      const text = fs.readFileSync(path.join(root, relative), 'utf8');
      const js = ts.transpileModule(text, {fileName: relative,
        compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022}}).outputText;
      const output = path.join(temp, relative.replace(/\.ts$/, '.js'));
      fs.mkdirSync(path.dirname(output), {recursive: true});
      fs.writeFileSync(output, js);
      const parsed = ts.createSourceFile(output, js, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      for (const statement of parsed.statements) {
        if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) || !statement.moduleSpecifier) continue;
        const specifier = statement.moduleSpecifier.text;
        if (specifier.startsWith('node:')) continue;
        assert.ok(specifier.startsWith('.') && specifier.endsWith('.js'), specifier);
        emit(path.normalize(path.join(path.dirname(relative), specifier)).replace(/\.js$/, '.ts'));
      }
      return output;
    }
    const models = emit('autobyteus-server-ts/src/agent-definition/domain/models.ts');
    const composer = emit('autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts');
    const { AgentDefinition } = await import(pathToFileURL(models).href);
    const { composeSharedCarpenterPrompt } = await import(pathToFileURL(composer).href);
    const priorPrompt = composeSharedCarpenterPrompt({agentDefinition: before.fields});
    const currentPrompt = composeSharedCarpenterPrompt({agentDefinition: new AgentDefinition(after.fields)});
    assert.equal(currentPrompt, priorPrompt);
    console.log(JSON.stringify({base, preservedSourceExceptAuthorizedEdits: true,
      originalSourceSHA256: sha(original), currentSourceSHA256: sha(source),
      runtimeDependenciesAndExistingScriptsUnchanged: true, lockDiff: 'server importer only, 3 added lines',
      declaredWsVersion: '8.18.1', soleRoot: scoped.fileNames, graphFileCount: files.length,
      totalDiagnostics: diagnostics.length, inheritedCompilerPolicyUnchanged: true, inferredCallbacks: callbacks,
      promptEqual: true, promptSHA256: sha(currentPrompt), prompt: currentPrompt,
      emittedPromptModules: [...emitted], temporaryPromptModulesRemovedOnExit: true}, null, 2));
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
})().catch(error => { console.error(error); process.exitCode = 1; });
