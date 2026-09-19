import { performance } from 'node:perf_hooks';
import fs from 'node:fs/promises';

const distRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-base/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist';
const memoryDir = '/Users/normy/.autobyteus/server-data/memory';
const readAggregate = {
  calls: 0,
  bytes: 0,
  rawTraceCalls: 0,
  rawTraceBytes: 0,
};
const originalReadFile = fs.readFile.bind(fs);
fs.readFile = async (...args) => {
  const result = await originalReadFile(...args);
  const filePath = String(args[0]);
  const bytes = typeof result === 'string' ? Buffer.byteLength(result) : result.byteLength;
  readAggregate.calls += 1;
  readAggregate.bytes += bytes;
  if (/raw_traces_(active|\d{6,})\.jsonl$/.test(filePath)) {
    readAggregate.rawTraceCalls += 1;
    readAggregate.rawTraceBytes += bytes;
  }
  return result;
};
const rootModule = await import(`${distRoot}/run-history/services/root-run-package-readiness-index.js`);
const contextModule = await import(`${distRoot}/run-history/services/root-package-context-file-validation.js`);
const { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } = rootModule;
const { RootPackageContextFileValidation } = contextModule;

const aggregate = {
  listFamilyEntries: [],
  inspectTeam: [],
  inspectOrg: [],
  contextValidateTeam: [],
  contextValidateOrg: [],
};
const wrap = (proto, name, sink, classify) => {
  const original = proto[name];
  proto[name] = async function (...args) {
    const started = performance.now();
    try { return await original.apply(this, args); }
    finally {
      const durationMs = performance.now() - started;
      if (classify) classify(args, durationMs);
      else sink.push(durationMs);
    }
  };
};
wrap(RootRunPackageReadinessIndex.prototype, 'listFamilyEntries', aggregate.listFamilyEntries);
wrap(RootRunPackageReadinessIndex.prototype, 'inspectTeam', aggregate.inspectTeam);
wrap(RootRunPackageReadinessIndex.prototype, 'inspectOrg', aggregate.inspectOrg);
wrap(RootPackageContextFileValidation.prototype, 'validate', null, (args, durationMs) => {
  (args[0] === 'agent_org' ? aggregate.contextValidateOrg : aggregate.contextValidateTeam).push(durationMs);
});
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    totalMs: Number(sum.toFixed(3)),
    meanMs: Number((values.length ? sum / values.length : 0).toFixed(3)),
    p50Ms: Number((sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.5)] : 0).toFixed(3)),
    p95Ms: Number((sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.95)] : 0).toFixed(3)),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(3)),
  };
};

resetRootRunPackageReadinessIndex(memoryDir);
const index = new RootRunPackageReadinessIndex(memoryDir);
const started = performance.now();
await index.rebuild();
const durationMs = performance.now() - started;
const result = {
  probeKind: 'read-only exact packaged readiness rebuild',
  sourceRevision: '4e84b76a918253da22fd4a382c653cb47744dc6c',
  memoryRootRedacted: true,
  writesOrMutationsRequested: false,
  durationMs: Number(durationMs.toFixed(3)),
  admittedTeamCount: index.listAdmitted('agent_team').length,
  admittedOrgCount: index.listAdmitted('agent_org').length,
  diagnosticCount: index.listDiagnostics().length,
  readAggregate: {
    ...readAggregate,
    mebibytes: Number((readAggregate.bytes / 1024 / 1024).toFixed(3)),
    rawTraceMebibytes: Number((readAggregate.rawTraceBytes / 1024 / 1024).toFixed(3)),
  },
  stageAggregates: Object.fromEntries(
    Object.entries(aggregate).map(([key, values]) => [key, stats(values)]),
  ),
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
