import fs from 'node:fs';
import path from 'node:path';

export type LiveE2eScenarioMode = 'REAL_DIRECT_SECRET' | 'REAL_GATEWAY';

export const LIVE_E2E_SCENARIO_MODES = {
  'openai.llm': 'REAL_DIRECT_SECRET',
  'openai.agent-flow': 'REAL_GATEWAY',
  'serper.search': 'REAL_DIRECT_SECRET',
  'openai.audio': 'REAL_DIRECT_SECRET',
  'openai.image': 'REAL_DIRECT_SECRET',
  'gemini.audio': 'REAL_DIRECT_SECRET',
  'gemini.image': 'REAL_DIRECT_SECRET',
  'anthropic.claude-agent-sdk': 'REAL_DIRECT_SECRET',
  'autobyteus.remote-llm': 'REAL_DIRECT_SECRET',
  'autobyteus.remote-audio': 'REAL_DIRECT_SECRET',
  'autobyteus.remote-image': 'REAL_DIRECT_SECRET',
} as const satisfies Record<string, LiveE2eScenarioMode>;

export type LiveE2eScenarioId = keyof typeof LIVE_E2E_SCENARIO_MODES;

export const assertLiveE2eScenarioMode = (
  scenarioId: string,
  mode: LiveE2eScenarioMode,
): LiveE2eScenarioId => {
  const expectedMode = LIVE_E2E_SCENARIO_MODES[
    scenarioId as LiveE2eScenarioId
  ] as LiveE2eScenarioMode | undefined;
  if (!expectedMode) {
    throw new Error(`LIVE_E2E_SCENARIO_EXECUTOR_MISSING:${scenarioId}`);
  }
  if (mode !== expectedMode) {
    throw new Error(
      `LIVE_E2E_SCENARIO_MODE_MISMATCH:${scenarioId}:${expectedMode}:${mode}`,
    );
  }
  return scenarioId as LiveE2eScenarioId;
};

export type LiveE2eScenario = {
  mode: LiveE2eScenarioMode;
  requiredSecrets: string[];
  model?: string;
  hosts?: string[];
  expectedCapabilities?: string[];
  runtimeAuthMode?: 'managed-secret';
  googleSetupMode?: 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT';
};

export type LiveE2eManifest = {
  version: 1;
  backend: {
    kind: 'local-store';
    databaseFile: string;
    keyFile: string;
    accessMode: 'READ_ONLY';
  };
  scenarios: Record<string, LiveE2eScenario>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringArray = (value: unknown, field: string, allowEmpty = false): string[] => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`LIVE_E2E_CONFIG_INVALID:${field}`);
  }
  const strings = value.map((entry) => typeof entry === 'string' ? entry.trim() : '');
  if (strings.some((entry) => entry.length === 0)) {
    throw new Error(`LIVE_E2E_CONFIG_INVALID:${field}`);
  }
  return strings;
};

const optionalString = (value: unknown, field: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`LIVE_E2E_CONFIG_INVALID:${field}`);
  }
  return value.trim();
};

const parseScenario = (id: string, value: unknown): LiveE2eScenario => {
  if (!isRecord(value)) throw new Error(`LIVE_E2E_CONFIG_INVALID:scenarios.${id}`);
  if (value.mode !== 'REAL_DIRECT_SECRET' && value.mode !== 'REAL_GATEWAY') {
    throw new Error(`LIVE_E2E_CONFIG_INVALID:scenarios.${id}.mode`);
  }
  assertLiveE2eScenarioMode(id, value.mode);
  const model = optionalString(value.model, `scenarios.${id}.model`);
  if (id === 'openai.agent-flow' && !model) {
    throw new Error('LIVE_E2E_GATEWAY_CAPABILITY_UNAVAILABLE:openai.agent-flow:model');
  }
  const expectedCapabilities = value.expectedCapabilities === undefined
    ? undefined
    : stringArray(value.expectedCapabilities, `scenarios.${id}.expectedCapabilities`);
  if (id === 'openai.agent-flow' && !expectedCapabilities?.includes('agent-turn')) {
    throw new Error('LIVE_E2E_GATEWAY_CAPABILITY_UNAVAILABLE:openai.agent-flow:agent-turn');
  }
  const runtimeAuthMode = optionalString(value.runtimeAuthMode, `scenarios.${id}.runtimeAuthMode`);
  if (runtimeAuthMode !== undefined && runtimeAuthMode !== 'managed-secret') {
    throw new Error(`LIVE_E2E_CONFIG_INVALID:scenarios.${id}.runtimeAuthMode`);
  }
  const googleSetupMode = optionalString(value.googleSetupMode, `scenarios.${id}.googleSetupMode`);
  if (
    googleSetupMode !== undefined
    && googleSetupMode !== 'AI_STUDIO'
    && googleSetupMode !== 'VERTEX_EXPRESS'
    && googleSetupMode !== 'VERTEX_PROJECT'
  ) throw new Error(`LIVE_E2E_CONFIG_INVALID:scenarios.${id}.googleSetupMode`);

  return {
    mode: value.mode,
    requiredSecrets: stringArray(value.requiredSecrets, `scenarios.${id}.requiredSecrets`),
    ...(model ? { model } : {}),
    ...(value.hosts === undefined ? {} : {
      hosts: stringArray(value.hosts, `scenarios.${id}.hosts`),
    }),
    ...(expectedCapabilities ? { expectedCapabilities } : {}),
    ...(runtimeAuthMode ? { runtimeAuthMode } : {}),
    ...(googleSetupMode ? { googleSetupMode } : {}),
  };
};

export const loadLiveE2eManifest = (configurationPath: string): LiveE2eManifest => {
  const resolvedPath = path.resolve(configurationPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (cause) {
    throw new Error('LIVE_E2E_CONFIG_INVALID:file', { cause });
  }
  if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.backend)) {
    throw new Error('LIVE_E2E_CONFIG_INVALID:root');
  }
  const backend = parsed.backend;
  if (
    backend.kind !== 'local-store'
    || backend.accessMode !== 'READ_ONLY'
    || typeof backend.databaseFile !== 'string'
    || typeof backend.keyFile !== 'string'
    || path.basename(backend.databaseFile) !== backend.databaseFile
    || path.basename(backend.keyFile) !== backend.keyFile
    || backend.databaseFile === backend.keyFile
  ) throw new Error('LIVE_E2E_CONFIG_INVALID:backend');
  if (!isRecord(parsed.scenarios) || Object.keys(parsed.scenarios).length === 0) {
    throw new Error('LIVE_E2E_CONFIG_INVALID:scenarios');
  }
  const scenarios = Object.fromEntries(
    Object.entries(parsed.scenarios).map(([id, scenario]) => [id, parseScenario(id, scenario)]),
  );
  return {
    version: 1,
    backend: {
      kind: 'local-store',
      databaseFile: backend.databaseFile,
      keyFile: backend.keyFile,
      accessMode: 'READ_ONLY',
    },
    scenarios,
  };
};

export const requireTrackedLiveE2eManifestPath = (): string => {
  const value = process.env.AUTOBYTEUS_LIVE_E2E_CONFIG?.trim();
  if (!value) throw new Error('LIVE_E2E_CONFIG_PATH_REQUIRED');
  return path.resolve(value);
};

export const selectedLiveE2eScenarioIds = (manifest: LiveE2eManifest): string[] => {
  const raw = process.env.AUTOBYTEUS_LIVE_E2E_SCENARIOS?.trim();
  if (!raw) return Object.keys(manifest.scenarios);
  const requested = raw.split(',').map((entry) => entry.trim()).filter(Boolean);
  const unknown = requested.filter((id) => !manifest.scenarios[id]);
  if (unknown.length > 0) throw new Error(`LIVE_E2E_SCENARIO_UNKNOWN:${unknown.join(',')}`);
  return requested;
};
