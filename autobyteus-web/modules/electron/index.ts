import { type AddressInfo } from 'net'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { precomputeDependencies } from 'vue-bundle-renderer'
import { defineNuxtModule } from '@nuxt/kit'
import type {
  ResolvedConfig,
  ViteDevServer,
} from 'vite'
import {
  build,
  startup,
} from 'vite-plugin-electron'
import type { NuxtModule, Nuxt } from '@nuxt/schema'

const logger = {
  info: (...args: any[]) => console.log('[Electron Module]', ...args),
  warn: (...args: any[]) => console.warn('[Electron Module]', ...args),
  error: (...args: any[]) => console.error('[Electron Module]', ...args),
  debug: (...args: any[]) => console.debug('[Electron Module]', ...args)
}

export interface ElectronOptions {
  build: import('vite-plugin-electron').ElectronOptions[],
  renderer?: Parameters<typeof import('vite-plugin-electron-renderer').default>[0]
  disableDefaultOptions?: boolean
}

let options: ElectronOptions
let nuxt: Nuxt
let viteConfigResolve: (config: ResolvedConfig) => void
const viteConfigPromise = new Promise<ResolvedConfig>(resolve => viteConfigResolve = resolve)
let viteServerResolve: (server: ViteDevServer) => void
const viteServerPromise = new Promise<ViteDevServer>(resolve => viteServerResolve = resolve)

// Early check for BUILD_TARGET
const isElectronBuild = process.env.BUILD_TARGET === 'electron'

console.log("isElectronBuild", isElectronBuild)

export default defineNuxtModule<ElectronOptions>({
  meta: {
    name: 'electron',
    configKey: 'electron',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {} as ElectronOptions,
  hooks: isElectronBuild ? {
    async 'vite:extendConfig'(viteInlineConfig) {
      logger.info('Extending Vite config')
      try {
        viteInlineConfig.plugins ??= []
        viteInlineConfig.plugins.push({
          name: 'get-vite-config',
          configResolved(config) {
            logger.debug('Vite config resolved:', {
              mode: config.mode,
              base: config.base,
              buildTarget: process.env.BUILD_TARGET
            })
            viteConfigResolve(config)
          },
        })

        if (options?.renderer) {
          logger.info('Configuring electron renderer')
          viteInlineConfig.plugins.push((await import('vite-plugin-electron-renderer')).default(options.renderer))
        }
      } catch (error) {
        logger.error('Error extending Vite config:', error)
        throw error
      }
    },
    'vite:serverCreated'(server) {
      logger.info('Vite server created')
      viteServerResolve(server)
    },
    listen(server, listener) {
      logger.info('Starting development server')
      ;(async function _listen() {
        try {
          const addressInfo = server.address() as AddressInfo
          const devServerUrl = `http://localhost:${addressInfo.port}`
          logger.info('Dev server URL:', devServerUrl)
          
          Object.assign(process.env, {
            VITE_DEV_SERVER_URL: devServerUrl,
          })

          const viteConfig = await viteConfigPromise
          logger.debug('Current Vite config:', {
            mode: viteConfig.mode,
            base: viteConfig.base,
            outDir: viteConfig.build?.outDir
          })

          if (!options?.build) return

          for (const config of options.build) {
            logger.info('Processing build config for entry:', config.entry)
            config.vite ??= {}
            config.vite.mode ??= viteConfig.mode
            config.vite.build ??= {}
            config.vite.build.watch ??= {}
            config.vite.plugins ??= []

            logger.debug('Build config details:', {
              entry: config.entry,
              outDir: config.vite.build.outDir,
              mode: config.vite.mode
            })

            config.vite.plugins.push({
              name: 'electron:startup',
              closeBundle() {
                logger.info('Bundle closed, checking onstart handler')
                if (config.onstart) {
                  logger.debug('Executing onstart handler')
                  config.onstart.call(this, {
                    startup,
                    reload() {
                      logger.info('Triggering hot reload')
                      viteServerPromise.then(server => server.hot.send({ type: 'full-reload' }))
                    },
                  })
                } else {
                  logger.info('No onstart handler, running default startup')
                  startup()
                }
              },
            })

            logger.info('Starting build process for:', config.entry)
            await build(config)
          }
        } catch (error) {
          logger.error('Error in development server setup:', error)
          throw error
        }
      }())
    },
    async 'build:done'() {
      logger.info('Build process completed')
      if (!nuxt.options.dev) {
        logger.info('Running production build steps')
        try {
          const viteConfig = await viteConfigPromise
          if (!options?.build) return

          for (const config of options.build) {
            logger.info('Building entry:', config.entry)
            config.vite ??= {}
            config.vite.mode ??= viteConfig.mode
            
            logger.debug('Build config:', {
              entry: config.entry,
              mode: config.vite.mode,
              outDir: config.vite.build?.outDir
            })
            
            await build(config)
          }
          logger.info('Production build completed successfully')
        } catch (error) {
          logger.error('Error in production build:', error)
          throw error
        }
      }
    },
    async 'build:manifest'(manifest) {
      logger.info('Processing build manifest')
      try {
        for (const key in manifest) {
          logger.debug('Processing manifest entry:', key)
          manifest[key].dynamicImports = []
        }
      } catch (error) {
        logger.error('Error processing manifest:', error)
        throw error
      }
      try {
        if (!nuxt) return
        const serverDist = join(nuxt.options.buildDir, 'dist/server')
        const precomputedPath = join(serverDist, 'client.precomputed.mjs')
        await access(precomputedPath)
      } catch {
        try {
          if (!nuxt) return
          const serverDist = join(nuxt.options.buildDir, 'dist/server')
          const precomputedPath = join(serverDist, 'client.precomputed.mjs')
          await mkdir(serverDist, { recursive: true })
          const precomputed = precomputeDependencies(manifest)
          await writeFile(precomputedPath, `export default ${JSON.stringify(precomputed)}`, 'utf8')
          logger.warn('client.precomputed.mjs was missing; wrote computed fallback to keep prerenderer stable')
        } catch (error) {
          logger.warn('Failed to write fallback client.precomputed.mjs', error)
        }
      }
    },
  } : {}, // Empty hooks object when not an electron build
  async setup(_options, _nuxt) {
    if (!isElectronBuild) {
      logger.info('Skipping electron module setup: BUILD_TARGET is not electron')
      return
    }

    if (!_options || !_options.build || _options.build.length === 0) {
      logger.info('Skipping electron module setup: No electron build options provided')
      return
    }

    logger.info('Initializing electron module')
    options = _options
    nuxt = _nuxt

    logger.debug('Electron options:', {
      buildEntries: options.build.map(b => b.entry),
      rendererConfig: !!options.renderer,
      disableDefaultOptions: options.disableDefaultOptions
    })

    if (!options.disableDefaultOptions) {
      logger.info('Applying default Electron configurations')
      try {
        // A Desktop App should be SPA
        nuxt.options.ssr = false
        logger.debug('SSR disabled')
        
        logger.info('Configuring for Electron build target')
        nuxt.options.app.baseURL = './'
        nuxt.options.app.buildAssetsDir = '/'
        nuxt.options.router.options.hashMode = true
        
        logger.debug('Electron build config applied:', {
          baseURL: nuxt.options.app.baseURL,
          buildAssetsDir: nuxt.options.app.buildAssetsDir,
          hashMode: nuxt.options.router.options.hashMode
        })

        if (!nuxt.options.dev) {
          logger.info('Configuring production settings')
          nuxt.options.nitro.runtimeConfig ??= {}
          nuxt.options.nitro.runtimeConfig.app ??= {}
          nuxt.options.nitro.runtimeConfig.app.baseURL = './'
          
          logger.debug('Production config applied:', {
            baseURL: nuxt.options.nitro.runtimeConfig.app.baseURL
          })
        }
      } catch (error) {
        logger.error('Error applying default configurations:', error)
        throw error
      }
    }

    logger.info('Electron module initialization completed')
  }
})
