/** @type {import('@autobyteus/application-devkit').ApplicationDevkitConfig} */
export default {
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
    supportedExposures: {
      queries: true,
      commands: true,
      routes: true,
      graphql: true,
      notifications: true,
      eventHandlers: false,
    },
    migrationsDir: 'migrations',
    assetsDir: 'assets',
  },
};
