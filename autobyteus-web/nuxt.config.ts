import { defineNuxtConfig, type NuxtConfig } from 'nuxt/config'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { applyElectronConfig } from './nuxt.electron.config'
import {
  PRODUCTION_EMBEDDED_SERVER_BASE_URL,
  PRODUCTION_EMBEDDED_SERVER_WS_BASE_URL,
} from './shared/embeddedServerClientEndpoint'
const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
const isElectronBuild = process.env.BUILD_TARGET === 'electron'
const isTest = process.env.NODE_ENV === 'test' || process.env.NUXT_TEST === 'true' || process.env.VITEST === 'true'
const isMobileWebBuild = process.env.AUTOBYTEUS_MOBILE_WEB_BUILD === 'true'

const ensureClientPrecomputedFile = (serverDir: string): void => {
  const precomputedPath = join(serverDir, 'client.precomputed.mjs')
  if (!existsSync(precomputedPath)) {
    mkdirSync(serverDir, { recursive: true })
    writeFileSync(precomputedPath, 'export default { \"dependencies\": {}, \"entrypoints\": [] }\n')
  }
}

// --- Server URL Configuration ---

function toWsBaseUrl(httpBaseUrl: string): string {
  if (httpBaseUrl.startsWith('https://')) {
    return `wss://${httpBaseUrl.slice('https://'.length)}`
  }
  if (httpBaseUrl.startsWith('http://')) {
    return `ws://${httpBaseUrl.slice('http://'.length)}`
  }
  return httpBaseUrl
}

const defaultBackendNodeBaseUrl = 'http://localhost:8000'
const backendNodeBaseUrlFromEnv =
  process.env.BACKEND_NODE_BASE_URL ||
  process.env.BACKEND_REST_BASE_URL?.replace(/\/rest\/?$/, '') ||
  defaultBackendNodeBaseUrl
// For local and Docker development, the Vite proxy forwards API requests to the backend server.
const backendProxyUrl = backendNodeBaseUrlFromEnv
const backendWsBaseUrl = toWsBaseUrl(backendNodeBaseUrlFromEnv)

let serverUrls = {
  graphqlBaseUrl: '',
  restBaseUrl: '',
  agentWsEndpoint: '',
  teamWsEndpoint: '',
  graphqlWsEndpoint: '',
  transcriptionWsEndpoint: '',
  terminalWsEndpoint: '',
  fileExplorerWsEndpoint: ''
};

let defaultNodeBaseUrl = '';

if (isElectronBuild) {
  defaultNodeBaseUrl = PRODUCTION_EMBEDDED_SERVER_BASE_URL;
  serverUrls = {
    graphqlBaseUrl: `${PRODUCTION_EMBEDDED_SERVER_BASE_URL}/graphql`,
    restBaseUrl: `${PRODUCTION_EMBEDDED_SERVER_BASE_URL}/rest`,
    agentWsEndpoint: `${PRODUCTION_EMBEDDED_SERVER_WS_BASE_URL}/ws/agent`,
    teamWsEndpoint: `${PRODUCTION_EMBEDDED_SERVER_WS_BASE_URL}/ws/agent-team`,
    graphqlWsEndpoint: `${PRODUCTION_EMBEDDED_SERVER_WS_BASE_URL}/graphql`,
    transcriptionWsEndpoint: `${PRODUCTION_EMBEDDED_SERVER_WS_BASE_URL}/transcribe`,
    terminalWsEndpoint: `${PRODUCTION_EMBEDDED_SERVER_WS_BASE_URL}/ws/terminal`,
    fileExplorerWsEndpoint: `${PRODUCTION_EMBEDDED_SERVER_WS_BASE_URL}/ws/file-explorer`
  };
} else if (isDevelopment) {
  defaultNodeBaseUrl = backendProxyUrl;
  serverUrls = {
    graphqlBaseUrl: '/graphql',
    restBaseUrl: '/rest',
    agentWsEndpoint: process.env.BACKEND_AGENT_WS_ENDPOINT || `${backendWsBaseUrl}/ws/agent`,
    teamWsEndpoint: process.env.BACKEND_TEAM_WS_ENDPOINT || `${backendWsBaseUrl}/ws/agent-team`,
    graphqlWsEndpoint: process.env.BACKEND_GRAPHQL_WS_ENDPOINT || `${backendWsBaseUrl}/graphql`,
    transcriptionWsEndpoint: process.env.BACKEND_TRANSCRIPTION_WS_ENDPOINT || `${backendWsBaseUrl}/ws/transcribe`,
    terminalWsEndpoint: process.env.BACKEND_TERMINAL_WS_ENDPOINT || `${backendWsBaseUrl}/ws/terminal`,
    fileExplorerWsEndpoint: process.env.BACKEND_FILE_EXPLORER_WS_ENDPOINT || `${backendWsBaseUrl}/ws/file-explorer`
  };
} else {
  defaultNodeBaseUrl = backendNodeBaseUrlFromEnv;
  // Read from our custom-named environment variables to prevent automatic overrides.
  serverUrls = {
    graphqlBaseUrl: process.env.BACKEND_GRAPHQL_BASE_URL || 'http://localhost:8000/graphql',
    restBaseUrl: process.env.BACKEND_REST_BASE_URL || 'http://localhost:8000/rest',
    agentWsEndpoint: process.env.BACKEND_AGENT_WS_ENDPOINT || 'ws://localhost:8000/ws/agent',
    teamWsEndpoint: process.env.BACKEND_TEAM_WS_ENDPOINT || 'ws://localhost:8000/ws/agent-team',
    graphqlWsEndpoint: process.env.BACKEND_GRAPHQL_WS_ENDPOINT || 'ws://localhost:8000/graphql',
    transcriptionWsEndpoint: process.env.BACKEND_TRANSCRIPTION_WS_ENDPOINT || 'ws://localhost:8000/ws/transcribe',
    terminalWsEndpoint: process.env.BACKEND_TERMINAL_WS_ENDPOINT || 'ws://localhost:8000/ws/terminal',
    fileExplorerWsEndpoint: process.env.BACKEND_FILE_EXPLORER_WS_ENDPOINT || 'ws://localhost:8000/ws/file-explorer'
  };
}

const baseConfig: NuxtConfig = {
  ssr: false,

  // Disable Nuxt DevTools floating icon
  devtools: {
    enabled: false
  },

  css: [
    '@fortawesome/fontawesome-svg-core/styles.css'
  ],

  plugins: [
    '~/plugins/fontawesome.ts'
  ],
  
  modules: [
    '@pinia/nuxt',
    ...(isTest ? ['@nuxt/test-utils/module'] : [])
  ],

  // Nuxt app-manifest can schedule delayed fetches that outlive Vitest teardown.
  // Keep it disabled in tests to avoid cross-test unhandled timer noise.
  experimental: {
    appManifest: !isTest
  },

  // In development, HTTP requests are proxied via vite.server.proxy.
  // Static output is only needed for production/electron builds.
  ...(isDevelopment ? {} : {
    nitro: {
      preset: 'static',
      output: {
        dir: 'dist',
        publicDir: 'dist/public'
      }
    }
  }),

  vite: {
    server: {
      watch: {
        // Avoid watching packaged outputs with huge embedded node_modules trees.
        ignored: [
          '**/.git/**',
          '**/.nuxt/**',
          '**/.output/**',
          '**/dist/**',
          '**/electron-dist/**',
          '**/resources/**',
          '**/node_modules/**'
        ]
      },
      proxy: isDevelopment ? {
        '/graphql': {
          target: backendProxyUrl,
          changeOrigin: true,
        },
        '/rest': {
          target: backendProxyUrl,
          changeOrigin: true,
        }
      } : undefined,
    },
    assetsInclude: ['**/*.jpeg', '**/*.jpg', '**/*.png', '**/*.svg'],
    worker: {
      format: 'es',
      plugins: () => [],
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: 'workers/[name].js'
        }
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    },
    build: {
      target: 'es2022',
    },
  },

  runtimeConfig: {
    // backendUrl is no longer needed as we use Vite's dev proxy
    public: {
      graphqlBaseUrl: serverUrls.graphqlBaseUrl,
      restBaseUrl: serverUrls.restBaseUrl,
      defaultNodeBaseUrl,
      agentWsEndpoint: serverUrls.agentWsEndpoint,
      teamWsEndpoint: serverUrls.teamWsEndpoint,
      graphqlWsEndpoint: serverUrls.graphqlWsEndpoint,
      terminalWsEndpoint: serverUrls.terminalWsEndpoint,
      fileExplorerWsEndpoint: serverUrls.fileExplorerWsEndpoint,
      mobileRemoteAccessBuild: isMobileWebBuild,
      showDebugErrorPanel: process.env.SHOW_DEBUG_ERROR_PANEL === 'true',

      audio: {
        transcriptionWsEndpoint: serverUrls.transcriptionWsEndpoint,
      }
    }
  },

  ...(!isTest ? {
    hooks: {
      'build:before': () => {
        ensureClientPrecomputedFile(join(process.cwd(), '.nuxt', 'dist', 'server'))
      },
      'nitro:init': (nitro: any) => {
        const outputDir = resolve(nitro.options.output.dir)
        ensureClientPrecomputedFile(join(outputDir, 'server'))
      },
      // Nitro resolves #build/* from Nuxt's .nuxt build output.
      'nitro:build:before': () => {
        ensureClientPrecomputedFile(join(process.cwd(), '.nuxt', 'dist', 'server'))
      }
    }
  } : {}),

  postcss: {
    plugins: {
      'postcss-import': {},
      'tailwindcss/nesting': {},
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  compatibilityDate: '2024-07-22',

  build: {
    transpile: [
      '@xenova/transformers',
    ],
  },

  // The app's type project (.nuxt/tsconfig.json, checked by `pnpm typecheck`). Electron main and the build
  // scripts have their own projects; the three tests that import server code are left out (FU-003 of autobyteus-294).
  // Paths are relative to .nuxt/; Nuxt appends them to its generated excludes.
  typescript: {
    tsConfig: {
      exclude: [
        '../electron/**',
        '../build/**',
        '../components/conversation/__tests__/UserMessageStoredUploadNames.spec.ts',
        '../services/runHydration/__tests__/acceptedInputIdentity.spec.ts',
        '../tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts',
        // Build outputs inside the package, not app source; they stay after a desktop or mobile build (and the release
        // job reruns the chain), and would otherwise enter the project (allowJs): prepare-server's bundled server,
        // electron-builder's packages, the mobile web build and `nuxt generate`'s output.
        '../resources/**',
        '../electron-dist/**',
        '../dist-mobile/**',
        '../.output/**',
      ],
    },
  },

  // Keep Nuxt's source scanning focused on app source folders, and the dev watcher out of the bundled server
  // dependencies (large trees that can exhaust Linux inotify limits).
  ignore: [
    '**/electron-dist/**',
    '**/resources/**'
  ]
}

export default defineNuxtConfig(applyElectronConfig(baseConfig))
