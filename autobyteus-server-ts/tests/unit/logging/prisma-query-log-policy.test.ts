import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type PackageManifest = {
  version: string;
  dependencies?: Record<string, string>;
  exports: { '.': { import: string; require: string } };
};

type ProbeFormat = 'esm' | 'cjs';
type ProbeScenario =
  | 'import-only'
  | 'default'
  | 'environment'
  | 'typed-true'
  | 'typed-false'
  | 'conflict';

type ProbeResult = {
  constructorCount: number;
  logKinds: string[] | null;
  connectCalls: number;
  queryCalls: number;
  conflictCode: string | null;
  unexpectedEnvironmentKeyCount: number;
};

const requireFromTest = createRequire(import.meta.url);
const packageJsonPath = requireFromTest.resolve('repository_prisma/package.json');
const packageRoot = path.dirname(packageJsonPath);
const manifest = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageManifest;
const entrypoints: Record<ProbeFormat, string> = {
  esm: path.resolve(packageRoot, manifest.exports['.'].import),
  cjs: path.resolve(packageRoot, manifest.exports['.'].require),
};

const mockStateBody = `
const stateKey = Symbol.for('autobyteus.repository-prisma-policy-probe');
const state = globalThis[stateKey] ??= {
  constructors: [], connectCalls: 0, queryCalls: 0
};
class SyntheticPrismaClient {
  constructor(options = {}) {
    state.constructors.push({ logKinds: Array.isArray(options.log) ? [...options.log] : null });
    this.policyProbe = 'AVAILABLE';
  }
  $connect() { state.connectCalls += 1; throw new Error('SYNTHETIC_CONNECT_FORBIDDEN'); }
  $disconnect() { throw new Error('SYNTHETIC_DISCONNECT_FORBIDDEN'); }
  $queryRawUnsafe() { state.queryCalls += 1; throw new Error('SYNTHETIC_QUERY_FORBIDDEN'); }
}`;

const esmLoaderSource = `
const mockSource = ${JSON.stringify(`${mockStateBody}\nexport { SyntheticPrismaClient as PrismaClient };\nexport const Prisma = { ModelName: {} };`)};
const mockUrl = \`data:text/javascript,\${encodeURIComponent(mockSource)}\`;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@prisma/client') return { url: mockUrl, shortCircuit: true };
  return nextResolve(specifier, context);
}`;

const cjsPreloadSource = `
const Module = require('node:module');
${mockStateBody}
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@prisma/client') {
    return { PrismaClient: SyntheticPrismaClient, Prisma: { ModelName: {} } };
  }
  return originalLoad.call(this, request, parent, isMain);
};`;

const sharedProbeBody = `
const stateKey = Symbol.for('autobyteus.repository-prisma-policy-probe');
const forbiddenEnvironmentName = /^(?:HOME|USERPROFILE|NODE_OPTIONS|NODE_PATH|DATABASE_URL(?:_TEST)?|DOTENV_CONFIG_.*|.*(?:API_KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL).*)$/i;
const state = () => globalThis[stateKey] ?? { constructors: [], connectCalls: 0, queryCalls: 0 };
const bindWithoutConnect = (packageApi, target) => {
  process.env.DATABASE_URL = target;
  try { void packageApi.rootPrismaClient.policyProbe; } finally { delete process.env.DATABASE_URL; }
};
const emit = (conflictCode = null) => {
  const current = state();
  const latest = current.constructors.at(-1) ?? null;
  const result = {
    constructorCount: current.constructors.length,
    logKinds: latest?.logKinds ?? null,
    connectCalls: current.connectCalls,
    queryCalls: current.queryCalls,
    conflictCode,
    unexpectedEnvironmentKeyCount: Object.keys(process.env).filter(
      (name) => name !== 'PRISMA_LOG_QUERIES' && forbiddenEnvironmentName.test(name),
    ).length,
  };
  require('node:fs').writeSync(1, JSON.stringify(result));
  process.exit(0);
};
const run = async (packageApi, scenario) => {
  if (scenario === 'import-only') emit();
  if (scenario === 'default' || scenario === 'environment') {
    bindWithoutConnect(packageApi, 'synthetic:lazy-policy');
    emit();
  }
  if (scenario === 'typed-true' || scenario === 'typed-false') {
    void packageApi.initializePrisma({
      datasourceUrl: 'synthetic:typed-policy',
      logQueries: scenario === 'typed-true',
    });
    emit();
  }
  if (scenario === 'conflict') {
    bindWithoutConnect(packageApi, 'synthetic:conflict-policy');
    let conflictCode = null;
    try {
      await packageApi.initializePrisma({
        datasourceUrl: 'synthetic:conflict-policy',
        logQueries: true,
      });
    } catch (error) {
      conflictCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : null;
    }
    emit(conflictCode);
  }
  throw new Error('UNKNOWN_SYNTHETIC_SCENARIO');
};`;

const esmProbeSource = `
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
globalThis.require = createRequire(import.meta.url);
${sharedProbeBody}
const packageApi = await import(pathToFileURL(process.argv[2]).href);
await run(packageApi, process.argv[3]);`;

const cjsProbeSource = `
${sharedProbeBody}
void (async () => run(require(process.argv[2]), process.argv[3]))();`;

describe('repository_prisma installed package policy', () => {
  let harnessRoot: string;
  let emptyCwd: string;
  let esmLoaderPath: string;
  let esmProbePath: string;
  let cjsPreloadPath: string;
  let cjsProbePath: string;

  beforeAll(() => {
    harnessRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repository-prisma-policy-'));
    emptyCwd = path.join(harnessRoot, 'empty-cwd');
    fs.mkdirSync(emptyCwd);
    esmLoaderPath = path.join(harnessRoot, 'synthetic-prisma-loader.mjs');
    esmProbePath = path.join(harnessRoot, 'probe.mjs');
    cjsPreloadPath = path.join(harnessRoot, 'synthetic-prisma-preload.cjs');
    cjsProbePath = path.join(harnessRoot, 'probe.cjs');
    fs.writeFileSync(esmLoaderPath, esmLoaderSource);
    fs.writeFileSync(esmProbePath, esmProbeSource);
    fs.writeFileSync(cjsPreloadPath, cjsPreloadSource);
    fs.writeFileSync(cjsProbePath, cjsProbeSource);
  });

  afterAll(() => {
    fs.rmSync(harnessRoot, { recursive: true, force: true });
  });

  const platformMinimalEnvironment = (queryFlag?: string): NodeJS.ProcessEnv => {
    const environment: NodeJS.ProcessEnv = {};
    if (process.platform === 'win32') {
      for (const name of ['SystemRoot', 'WINDIR', 'ComSpec', 'PATHEXT', 'TEMP', 'TMP']) {
        if (process.env[name]) environment[name] = process.env[name];
      }
    }
    if (queryFlag !== undefined) environment.PRISMA_LOG_QUERIES = queryFlag;
    return environment;
  };

  const runProbe = (
    format: ProbeFormat,
    scenario: ProbeScenario,
    queryFlag?: string,
  ): ProbeResult => {
    const formatArguments = format === 'esm'
      ? ['--no-warnings', '--experimental-loader', esmLoaderPath, esmProbePath]
      : ['--require', cjsPreloadPath, cjsProbePath];
    const output = execFileSync(
      process.execPath,
      [...formatArguments, entrypoints[format], scenario],
      {
        cwd: emptyCwd,
        encoding: 'utf8',
        env: platformMinimalEnvironment(queryFlag),
        shell: false,
        timeout: 10_000,
      },
    );
    return JSON.parse(output) as ProbeResult;
  };

  it('installs exact unpatched 1.0.9 entrypoints without dotenv acquisition code', () => {
    expect(manifest.version).toBe('1.0.9');
    expect(manifest.dependencies).not.toHaveProperty('dotenv');
    for (const entrypoint of Object.values(entrypoints)) {
      expect(path.isAbsolute(entrypoint)).toBe(true);
      const source = fs.readFileSync(entrypoint, 'utf8');
      expect(source).not.toMatch(/dotenv(?:\/config)?/i);
      expect(source).not.toMatch(/["'`]\.env(?:["'`/\\])/i);
    }
  });

  it.each(['esm', 'cjs'] as const)('%s import acquires no Prisma client or datasource', (format) => {
    expect(runProbe(format, 'import-only')).toEqual({
      constructorCount: 0,
      logKinds: null,
      connectCalls: 0,
      queryCalls: 0,
      conflictCode: null,
      unexpectedEnvironmentKeyCount: 0,
    });
  });

  it.each(['esm', 'cjs'] as const)('%s defaults to non-query log kinds', (format) => {
    expect(runProbe(format, 'default')).toMatchObject({
      constructorCount: 1,
      logKinds: ['info', 'warn', 'error'],
      connectCalls: 0,
      queryCalls: 0,
      unexpectedEnvironmentKeyCount: 0,
    });
  });

  it.each(['esm', 'cjs'] as const)('%s honors explicit environment query-log policy only', (format) => {
    expect(runProbe(format, 'environment', ' yes ')).toMatchObject({
      constructorCount: 1,
      logKinds: ['info', 'warn', 'error', 'query'],
      connectCalls: 0,
      queryCalls: 0,
    });
    expect(runProbe(format, 'environment', 'false')).toMatchObject({
      constructorCount: 1,
      logKinds: ['info', 'warn', 'error'],
      connectCalls: 0,
      queryCalls: 0,
    });
  });

  it.each(['esm', 'cjs'] as const)('%s honors typed policy and typed-false precedence', (format) => {
    expect(runProbe(format, 'typed-true')).toMatchObject({
      constructorCount: 1,
      logKinds: ['info', 'warn', 'error', 'query'],
      connectCalls: 0,
      queryCalls: 0,
    });
    expect(runProbe(format, 'typed-false', 'true')).toMatchObject({
      constructorCount: 1,
      logKinds: ['info', 'warn', 'error'],
      connectCalls: 0,
      queryCalls: 0,
    });
  });

  it.each(['esm', 'cjs'] as const)('%s rejects a conflicting post-bind logging policy', (format) => {
    expect(runProbe(format, 'conflict')).toMatchObject({
      constructorCount: 1,
      logKinds: ['info', 'warn', 'error'],
      connectCalls: 0,
      queryCalls: 0,
      conflictCode: 'LOGGING_POLICY_CONFLICT',
    });
  });
});
