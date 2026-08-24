import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  css: ['@fortawesome/fontawesome-svg-core/styles.css'],
  modules: ['@pinia/nuxt'],
  plugins: ['~/plugins/fontawesome.ts'],
  experimental: { appManifest: false },
  runtimeConfig: {
    public: {
      graphqlBaseUrl: 'prototype://local/graphql',
      restBaseUrl: 'prototype://local/rest',
      defaultNodeBaseUrl: 'prototype://local',
      agentWsEndpoint: 'prototype://local/agent',
      teamWsEndpoint: 'prototype://local/team',
      graphqlWsEndpoint: 'prototype://local/graphql-ws',
      terminalWsEndpoint: 'prototype://local/terminal',
      fileExplorerWsEndpoint: 'prototype://local/files',
      mobileRemoteAccessBuild: false,
      showDebugErrorPanel: false,
      audio: {
        targetSampleRate: 16000,
        chunkDuration: 5,
        overlapDuration: 0.2,
        channels: 1,
        transcriptionWsEndpoint: 'prototype://local/transcription',
        constraints: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      },
    },
  },
  vite: {
    assetsInclude: ['**/*.jpeg', '**/*.jpg', '**/*.png', '**/*.svg'],
    worker: { format: 'es' },
    build: { target: 'es2022' },
  },
  postcss: { plugins: { tailwindcss: {}, autoprefixer: {} } },
  compatibilityDate: '2024-07-22',
  typescript: { typeCheck: false },
  ignore: ['**/__tests__/**', '**/*.spec.*', '**/*.test.*', 'evidence/**'],
})
