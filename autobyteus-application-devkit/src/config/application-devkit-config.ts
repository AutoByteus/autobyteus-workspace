import type { ApplicationBackendSupportedExposures } from '@autobyteus/application-sdk-contracts';

export type ApplicationDevkitSourceConfig = {
  frontendDir?: string | null;
  backendDir?: string | null;
  agentsDir?: string | null;
  agentTeamsDir?: string | null;
};

export type ApplicationDevkitOutputConfig = {
  packageRoot?: string | null;
};

export type ApplicationDevkitFrontendConfig = {
  entryPoint?: string | null;
  entryHtml?: string | null;
};

export type ApplicationDevkitBackendConfig = {
  entryPoint?: string | null;
  targetRuntimeSemver?: string | null;
  supportedExposures?: Partial<ApplicationBackendSupportedExposures> | null;
  migrationsDir?: string | null;
  assetsDir?: string | null;
};

export type ApplicationDevkitDevConfig = {
  port?: number | null;
};

export type ApplicationDevkitConfig = {
  source?: ApplicationDevkitSourceConfig | null;
  output?: ApplicationDevkitOutputConfig | null;
  frontend?: ApplicationDevkitFrontendConfig | null;
  backend?: ApplicationDevkitBackendConfig | null;
  dev?: ApplicationDevkitDevConfig | null;
};

export type ResolvedApplicationDevkitConfig = {
  source: {
    frontendDir: string;
    backendDir: string;
    agentsDir: string;
    agentTeamsDir: string;
  };
  output: {
    packageRoot: string;
  };
  frontend: {
    entryPoint: string;
    entryHtml: string;
  };
  backend: {
    entryPoint: string;
    targetRuntimeSemver: string;
    supportedExposures: ApplicationBackendSupportedExposures;
    migrationsDir: string | null;
    assetsDir: string | null;
  };
  dev: {
    port: number;
  };
};

const DEFAULT_SUPPORTED_EXPOSURES: ApplicationBackendSupportedExposures = {
  queries: false,
  commands: false,
  routes: false,
  graphql: false,
  notifications: false,
  eventHandlers: false,
};

export const DEFAULT_APPLICATION_DEVKIT_CONFIG: ResolvedApplicationDevkitConfig = {
  source: {
    frontendDir: 'src/frontend',
    backendDir: 'src/backend',
    agentsDir: 'src/agents',
    agentTeamsDir: 'src/agent-teams',
  },
  output: {
    packageRoot: 'dist/importable-package',
  },
  frontend: {
    entryPoint: 'app.ts',
    entryHtml: 'index.html',
  },
  backend: {
    entryPoint: 'index.ts',
    targetRuntimeSemver: '>=22 <23',
    supportedExposures: DEFAULT_SUPPORTED_EXPOSURES,
    migrationsDir: 'migrations',
    assetsDir: 'assets',
  },
  dev: {
    port: 43124,
  },
};

const readOptionalString = (
  value: string | null | undefined,
  fallback: string | null,
): string | null => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

const readPort = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 65535) {
    return fallback;
  }
  return value;
};

export const resolveApplicationDevkitConfig = (
  config: ApplicationDevkitConfig | null | undefined,
): ResolvedApplicationDevkitConfig => {
  const defaults = DEFAULT_APPLICATION_DEVKIT_CONFIG;
  const supportedExposures = {
    ...defaults.backend.supportedExposures,
    ...(config?.backend?.supportedExposures ?? {}),
  };

  return {
    source: {
      frontendDir: readOptionalString(config?.source?.frontendDir, defaults.source.frontendDir)!,
      backendDir: readOptionalString(config?.source?.backendDir, defaults.source.backendDir)!,
      agentsDir: readOptionalString(config?.source?.agentsDir, defaults.source.agentsDir)!,
      agentTeamsDir: readOptionalString(config?.source?.agentTeamsDir, defaults.source.agentTeamsDir)!,
    },
    output: {
      packageRoot: readOptionalString(config?.output?.packageRoot, defaults.output.packageRoot)!,
    },
    frontend: {
      entryPoint: readOptionalString(config?.frontend?.entryPoint, defaults.frontend.entryPoint)!,
      entryHtml: readOptionalString(config?.frontend?.entryHtml, defaults.frontend.entryHtml)!,
    },
    backend: {
      entryPoint: readOptionalString(config?.backend?.entryPoint, defaults.backend.entryPoint)!,
      targetRuntimeSemver: readOptionalString(
        config?.backend?.targetRuntimeSemver,
        defaults.backend.targetRuntimeSemver,
      )!,
      supportedExposures: {
        queries: Boolean(supportedExposures.queries),
        commands: Boolean(supportedExposures.commands),
        routes: Boolean(supportedExposures.routes),
        graphql: Boolean(supportedExposures.graphql),
        notifications: Boolean(supportedExposures.notifications),
        eventHandlers: Boolean(supportedExposures.eventHandlers),
      },
      migrationsDir: readOptionalString(config?.backend?.migrationsDir, defaults.backend.migrationsDir),
      assetsDir: readOptionalString(config?.backend?.assetsDir, defaults.backend.assetsDir),
    },
    dev: {
      port: readPort(config?.dev?.port, defaults.dev.port),
    },
  };
};

export const defineApplicationDevkitConfig = <TConfig extends ApplicationDevkitConfig>(
  config: TConfig,
): TConfig => config;
