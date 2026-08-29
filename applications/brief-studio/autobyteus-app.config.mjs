/** @type {import('@autobyteus/application-devkit').ApplicationDevkitConfig} */
export default {
  source: {
    frontendDir: "frontend-src",
    backendDir: "backend-src",
    agentsDir: "agents",
    agentTeamsDir: "agent-teams",
  },
  output: { packageRoot: "dist/importable-package" },
  standalone: { enabled: true },
  frontend: { entryPoint: "app.js", entryHtml: "index.html" },
  backend: {
    entryPoint: "index.ts",
    targetRuntimeSemver: ">=22 <23",
    supportedExposures: {
      queries: false,
      commands: false,
      routes: false,
      graphql: true,
      notifications: true,
      eventHandlers: true,
      webSockets: false,
    },
    migrationsDir: "migrations",
    assetsDir: "assets",
  },
};
