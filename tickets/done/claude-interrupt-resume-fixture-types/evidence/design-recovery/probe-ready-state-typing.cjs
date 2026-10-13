// Solution Designer feasibility probe; virtual compiler-host substitution only.
// Never writes the proposed variant to implementation source; no runtime sign-off.
const ts = require(process.cwd() + '/autobyteus-server-ts/node_modules/typescript');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const workspaceRoot = process.cwd();
const target = path.resolve('autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts');
const configPath = path.resolve('autobyteus-server-ts/tsconfig.claude-interrupt-resume-e2e.json');
const read = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(read.error, undefined);
const config = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configPath));
assert.deepEqual(config.errors, []);
assert.deepEqual(config.fileNames, [target]);
const original = fs.readFileSync(target, 'utf8');
// Emulate the package-local tsc command, including automatic node type resolution.
process.chdir(path.dirname(configPath));
const before = `    if (!socket || socket.readyState === WebSocket.CLOSED) return;
    if (socket.readyState === WebSocket.CONNECTING) socket.terminate();
    else socket.close();
    try {
      await waitForCondition(() => socket.readyState === WebSocket.CLOSED, "owned websocket closes");
    } finally {
      if (socket.readyState !== WebSocket.CLOSED) socket.terminate();
    }`;
const after = `    if (!socket) return;
    const socketClosed = (): boolean => socket.readyState === WebSocket.CLOSED;
    if (socketClosed()) return;
    if (socket.readyState === WebSocket.CONNECTING) socket.terminate();
    else socket.close();
    try {
      await waitForCondition(socketClosed, "owned websocket closes");
    } finally {
      if (!socketClosed()) socket.terminate();
    }`;
assert.equal(original.split(before).length, 2);
const variant = original.replace(before, after);
function compile(text) {
  const host = ts.createCompilerHost(config.options);
  const readFile = host.readFile.bind(host);
  // Preserve compiler-host NodeNext SourceFile metadata; substitute bytes, not parsed AST.
  host.readFile = file => path.resolve(file) === target ? text : readFile(file);
  return ts.getPreEmitDiagnostics(ts.createProgram(config.fileNames, config.options, host)).map(d => ({
    file: d.file ? path.relative(workspaceRoot,d.file.fileName) : null,
    line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line+1 : null,
    code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
}
const current = compile(original), virtualCandidate = compile(variant);
console.log(JSON.stringify({scope:'same scoped config/full graph; default compiler-host parsing retained',current,virtualCandidate,sourceUnchanged:fs.readFileSync(target,'utf8')===original,feasibilityOnly:true},null,2));
assert.equal(current.length,1);assert.equal(current[0].code,2367);
assert.deepEqual(virtualCandidate,[]);
assert.equal(fs.readFileSync(target,'utf8'),original);

