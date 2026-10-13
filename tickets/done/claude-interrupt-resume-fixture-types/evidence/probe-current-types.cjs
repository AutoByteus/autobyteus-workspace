// Investigation probe: same single-file/import-graph build policy as supplied helper.
// Exit 0 means zero diagnostics; not no-introduced-diagnostics or repo-wide test proof.
const ts = require(process.cwd() + '/autobyteus-server-ts/node_modules/typescript');
const path = require('node:path');
const root = process.cwd();
const configPath = path.resolve('autobyteus-server-ts/tsconfig.build.json');
const read = ts.readConfigFile(configPath, ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configPath));
const options = { ...config.options, rootDir: root, noEmit: true, typeRoots: [path.resolve('autobyteus-server-ts/node_modules/@types')] };
const target = path.resolve('autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts');
const errors = [...(read.error ? [read.error] : []), ...config.errors, ...ts.getPreEmitDiagnostics(ts.createProgram([target], options))];
const diagnostics = errors.map(d => ({file: d.file ? path.relative(root, d.file.fileName) : null, line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : null, code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, '\n')}));
console.log(JSON.stringify({ scope: 'single target file and its imported graph, existing build compiler policy', diagnosticCount: diagnostics.length, diagnostics }, null, 2));
process.exitCode = diagnostics.length ? 1 : 0;
