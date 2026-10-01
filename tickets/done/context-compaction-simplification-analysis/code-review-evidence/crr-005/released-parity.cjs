// Reviewer-only replay: execute released source from git, never overwrite durable fixtures.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const req = require('node:module').createRequire(process.cwd() + '/autobyteus-ts/package.json');
const ts = req('typescript');
const fixture = JSON.parse(fs.readFileSync('autobyteus-ts/tests/fixtures/memory/released-native-snapshot-shapes.json','utf8'));
const cache = new Map();
const hashes = {};
function load(file) {
  file = file.replace(/\.js$/, '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  const source = cp.execFileSync('git', ['show', fixture.base + ':' + file], {encoding:'utf8'});
  hashes[file] = crypto.createHash('sha256').update(source).digest('hex');
  const module = {exports:{}}; cache.set(file,module);
  const js = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',js)(id => id.startsWith('.') ? load(path.posix.join(path.posix.dirname(file),id)) : req(id),module,module.exports);
  return module.exports;
}
const Released = load('autobyteus-ts/src/memory/working-context-snapshot-serializer.ts').WorkingContextSnapshotSerializer;
const moduleFrozen = {exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('autobyteus-ts/src/memory/migration/native-working-context-snapshot-shapes.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(req,moduleFrozen,moduleFrozen.exports);
const Frozen = moduleFrozen.exports.ReleasedNativeSnapshotV5Codec;
const mismatches = fixture.cases.flatMap(c => {const r=Released.validate(c.payload),f=Frozen.validate(c.payload);return r===c.valid&&f===r?[]:[{name:c.name,recorded:c.valid,released:r,frozen:f}];});
const sourceMismatches=Object.entries(fixture.sources).filter(([p,h])=>crypto.createHash('sha256').update(cp.execFileSync('git',['show',fixture.base+':'+p])).digest('hex')!==h).map(([p])=>p);
const result={base:fixture.base,cases:fixture.cases.length,mismatches,sourceHashCount:Object.keys(fixture.sources).length,sourceMismatches,executedSourceHashes:hashes};
fs.writeFileSync(__dirname+'/released-parity.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cases:result.cases,mismatches,sourceHashCount:result.sourceHashCount,sourceMismatches}));
if(mismatches.length||sourceMismatches.length)process.exitCode=1;
