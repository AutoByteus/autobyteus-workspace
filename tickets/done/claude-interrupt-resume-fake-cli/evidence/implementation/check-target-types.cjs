// Focused implementation check, not global test typecheck or executable sign-off.
// Run from the task worktree root with `node <this file>`.
const ts = require(process.cwd() + '/autobyteus-server-ts/node_modules/typescript');
const path = require('node:path');
const cp = require('node:child_process');
const root = process.cwd();
const relativeTarget = 'autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts';
const target = path.resolve(relativeTarget);
const configFile = path.resolve('autobyteus-server-ts/tsconfig.build.json');
const read = ts.readConfigFile(configFile, ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configFile));
const options = {...config.options, rootDir: root, noEmit: true,
  typeRoots: [path.resolve('autobyteus-server-ts/node_modules/@types')]};
const before = cp.execFileSync('git', ['show', '84dea6def4:' + relativeTarget], {encoding: 'utf8'});
function diagnostics(baseline) {
  const host = ts.createCompilerHost(options);
  const get = host.getSourceFile.bind(host);
  host.getSourceFile = (file, lang, ...rest) => path.resolve(file) === target && baseline
    ? ts.createSourceFile(file, before, lang, true) : get(file, lang, ...rest);
  return ts.getPreEmitDiagnostics(ts.createProgram([target], options, host)).map(d => ({
    file: d.file ? path.relative(root, d.file.fileName) : null,
    line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : null,
    code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
  }));
}
const current = diagnostics(false), baseline = diagnostics(true);
const signature = d => JSON.stringify([d.file, d.code, d.message]);
const prior = new Set(baseline.map(signature));
const introduced = current.filter(d => !prior.has(signature(d)));
console.log(JSON.stringify({scope: 'single file/import graph under build policy', baseline, current, introduced}, null, 2));
// Exit 0 means no introduced diagnostics, not a clean/global test typecheck.
process.exitCode = introduced.length ? 1 : 0;
