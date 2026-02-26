import { defineNuxtConfig } from 'nuxt/config'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { applyElectronConfig } from './nuxt.electron.config'

// Fixed server port for internal server
const INTERNAL_SERVER_PORT = 29695
const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
const isElectronBuild = process.env.BUILD_TARGET === 'electron'
const isTest = process.env.NODE_ENV === 'test' || process.env.NUXT_TEST === 'true' || process.env.VITEST === 'true'

const ensureClientPrecomputedFile = (serverDir: string): void => {
  const precomputedPath = join(serverDir, 'client.precomputed.mjs')
  if (!existsSync(precomputedPath)) {
    mkdirSync(serverDir, { recursive: true })
    writeFileSync(precomputedPath, 'export default { \"dependencies\": {}, \"entrypoints\": [] }\n')
  }
}

// --- Server URL Configuration ---

// For local and Docker development, the Vite proxy forwards API requests to the backend server.
const backendProxyUrl = 'http://localhost:8000'
const backendNodeBaseUrlFromEnv =
  process.env.BACKEND_NODE_BASE_URL ||
  process.env.BACKEND_REST_BASE_URL?.replace(/\/rest\/?$/, '') ||
  backendProxyUrl

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
  defaultNodeBaseUrl = `http://localhost:${INTERNAL_SERVER_PORT}`;
  serverUrls = {
    graphqlBaseUrl: `http://localhost:${INTERNAL_SERVER_PORT}/graphql`,
    restBaseUrl: `http://localhost:${INTERNAL_SERVER_PORT}/rest`,
    agentWsEndpoint: `ws://localhost:${INTERNAL_SERVER_PORT}/ws/agent`,
    teamWsEndpoint: `ws://localhost:${INTERNAL_SERVER_PORT}/ws/agent-team`,
    graphqlWsEndpoint: `ws://localhost:${INTERNAL_SERVER_PORT}/graphql`,
    transcriptionWsEndpoint: `ws://localhost:${INTERNAL_SERVER_PORT}/transcribe`,
    terminalWsEndpoint: `ws://localhost:${INTERNAL_SERVER_PORT}/ws/terminal`,
    fileExplorerWsEndpoint: `ws://localhost:${INTERNAL_SERVER_PORT}/ws/file-explorer`
  };
} else if (isDevelopment) {
  defaultNodeBaseUrl = backendProxyUrl;
  serverUrls = {
    graphqlBaseUrl: '/graphql',
    restBaseUrl: '/rest',
    agentWsEndpoint: process.env.BACKEND_AGENT_WS_ENDPOINT || 'ws://localhost:8000/ws/agent',
    teamWsEndpoint: process.env.BACKEND_TEAM_WS_ENDPOINT || 'ws://localhost:8000/ws/agent-team',
    graphqlWsEndpoint: process.env.BACKEND_GRAPHQL_WS_ENDPOINT || 'ws://localhost:8000/graphql',
    transcriptionWsEndpoint: process.env.BACKEND_TRANSCRIPTION_WS_ENDPOINT || 'ws://localhost:8000/ws/transcribe',
    terminalWsEndpoint: process.env.BACKEND_TERMINAL_WS_ENDPOINT || 'ws://localhost:8000/ws/terminal',
    fileExplorerWsEndpoint: process.env.BACKEND_FILE_EXPLORER_WS_ENDPOINT || 'ws://localhost:8000/ws/file-explorer'
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

const baseConfig = {
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
    './modules/devhandler-compat',
    ...(isTest ? ['@nuxt/test-utils/module'] : [])
  ],

  routeRules: {
    '/workspace/**': { middleware: ['workspace'] },
    '/': { middleware: ['workspace'] }
  },

  // Prevent Nuxt dev watcher from traversing bundled server dependencies.
  // These trees are large and can exhaust Linux inotify limits.
  ignore: [
    'resources/server/node_modules/**',
    'electron-dist/**'
  ],

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
      messageGatewayBaseUrl: process.env.MESSAGE_GATEWAY_BASE_URL || '',
      messageGatewayAdminToken: process.env.MESSAGE_GATEWAY_ADMIN_TOKEN || '',
      agentWsEndpoint: serverUrls.agentWsEndpoint,
      teamWsEndpoint: serverUrls.teamWsEndpoint,
      graphqlWsEndpoint: serverUrls.graphqlWsEndpoint,
      terminalWsEndpoint: serverUrls.terminalWsEndpoint,
      fileExplorerWsEndpoint: serverUrls.fileExplorerWsEndpoint,
      googleSpeechApiKey: process.env.GOOGLE_SPEECH_API_KEY || '',
      showDebugErrorPanel: process.env.SHOW_DEBUG_ERROR_PANEL === 'true',
      
      audio: {
        targetSampleRate: 16000,
        chunkDuration: 5,
        overlapDuration: 0.2,
        channels: 1,
        transcriptionWsEndpoint: serverUrls.transcriptionWsEndpoint,
        constraints: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }
    }
  },

  ...(!isTest ? {
    hooks: {
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

  // Keep Nuxt's source scanning focused on app source folders.
  ignore: [
    '**/electron-dist/**',
    '**/resources/**'
  ]
}

export default defineNuxtConfig(applyElectronConfig(baseConfig))
