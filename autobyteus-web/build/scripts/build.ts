import { build, Configuration, Platform, Arch } from 'electron-builder'
import { generateIcons } from './generateIcons'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { execSync } from 'child_process'

// Load environment variables from .env.local (for Apple credentials)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Ensure we're in production mode
process.env.NODE_ENV = 'production'
if (process.env.NO_TIMESTAMP) {
  process.env.CSC_DISABLE_TIMESTAMP = 'true'
}

type PlatformType = 'LINUX' | 'WINDOWS' | 'MAC' | 'ALL'
type BuildFlavor = 'personal' | 'enterprise'

interface BuildConfig {
  config: Configuration,
  targets?: Map<Platform, Map<Arch, string[]>>,
  publish?: 'always' | 'never' | 'onTag' | 'onTagOrDraft'
}

function getPlatform(): PlatformType {
  const args: string[] = process.argv.slice(2)

  if (args.includes('--linux')) return 'LINUX'
  if (args.includes('--windows')) return 'WINDOWS'
  if (args.includes('--mac')) return 'MAC'

  const directPlatform = args[0]?.toUpperCase() as PlatformType
  if (['LINUX', 'WINDOWS', 'MAC'].includes(directPlatform)) {
    return directPlatform
  }

  return 'ALL'
}

const platform: PlatformType = getPlatform()

function normalizeBuildFlavor(value?: string): BuildFlavor | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized === 'personal' || normalized === 'autobyteuspersonal') return 'personal'
  if (normalized === 'enterprise' || normalized === 'autobyteusenterprise') return 'enterprise'

  return null
}

function resolveFlavorFromBranchName(branchName?: string): BuildFlavor | null {
  const normalized = branchName?.trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'personal') return 'personal'
  if (normalized === 'enterprise' || normalized === 'main' || normalized === 'master') return 'enterprise'
  return null
}

function resolveFlavorFromGitContext(): BuildFlavor | null {
  try {
    const currentRef = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()

    const currentRefFlavor = resolveFlavorFromBranchName(currentRef)
    if (currentRefFlavor) return currentRefFlavor

    // Detached-head fallback: inspect local/remote branches that contain HEAD.
    const branches = execSync('git branch --contains HEAD --format="%(refname:short)"', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)

    for (const candidate of branches) {
      const terminalName = candidate.split('/').pop()
      const inferred = resolveFlavorFromBranchName(terminalName)
      if (inferred === 'personal') return inferred
    }

    for (const candidate of branches) {
      const terminalName = candidate.split('/').pop()
      const inferred = resolveFlavorFromBranchName(terminalName)
      if (inferred === 'enterprise') return inferred
    }
  } catch {
    // Intentionally ignore git lookup errors and use deterministic fallback.
  }

  return null
}

function resolveBuildFlavor(): BuildFlavor {
  const explicit = process.env.AUTOBYTEUS_BUILD_FLAVOR
  if (explicit != null && explicit.trim() !== '') {
    const normalized = normalizeBuildFlavor(explicit)
    if (!normalized) {
      throw new Error(
        `Unsupported AUTOBYTEUS_BUILD_FLAVOR: "${explicit}". Use "personal" or "enterprise".`
      )
    }
    return normalized
  }

  return resolveFlavorFromGitContext() ?? 'enterprise'
}

function resolveArtifactBaseName(flavor: BuildFlavor): string {
  return flavor === 'personal' ? 'AutoByteus_personal' : 'AutoByteus_enterprise'
}

const buildFlavor: BuildFlavor = resolveBuildFlavor()
const artifactBaseName = resolveArtifactBaseName(buildFlavor)

// Log environment information
console.log('Building with environment:', process.env.NODE_ENV)
console.log('Using environment file:', process.env.NODE_ENV === 'production' ? '.env.production' : '.env')
console.log('Resolved build flavor:', buildFlavor)
console.log('Artifact base name:', artifactBaseName)

const options: Configuration = {
  appId: 'com.autobyteus.app',
  productName: 'AutoByteus',
  directories: {
    output: 'electron-dist'
  },
  // Hook to sign extra resources (server binaries) on macOS
  afterPack: './build/dist/afterPack.js',
  files: [
    "dist/**/*",
    "package.json"
  ],
  extraMetadata: {
    main: "dist/electron/main.js"
  },
  asar: true,
  asarUnpack: [
    "**/server/node_modules/**",
    "**/server/prisma/**"
  ],
  // Default icon for all platforms
  icon: 'build/icons/512x512.png',
  // Include the resources directory which contains the server
  extraResources: [
    {
      from: "resources/server",
      to: "server"
    },
    {
      from: "build/icons",
      to: "icons"
    }
  ],
  // Default artifact name pattern
  artifactName: `${artifactBaseName}_\${platform}-\${version}.\${ext}`,
  win: {
    target: ['nsis'],
    icon: 'build/icons/icon.ico',
    artifactName: `${artifactBaseName}_windows-\${version}.\${ext}`
  },
  nsis: {
    oneClick: false,                    // Allow user to customize installation
    allowToChangeInstallationDirectory: true, // Allow user to change installation directory
    perMachine: false,                  // Install for current user only by default
    installerIcon: 'build/icons/icon.ico',
    uninstallerIcon: 'build/icons/icon.ico',
    installerHeaderIcon: 'build/icons/icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'AutoByteus',
    differentialPackage: false         // Disable differential updates
  },
  mac: {
    target: ['dmg'],
    icon: 'build/icons/icon.icns',
    // Custom naming for macOS builds based on architecture
    artifactName: `${artifactBaseName}_macos-\${arch}-\${version}.\${ext}`,
    // Code signing configuration (reads from .env.local)
    identity: process.env.APPLE_SIGNING_IDENTITY || null,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    signIgnore: [
      'node-pty/prebuilds/win32-.*'
    ],
    // Notarization: set to true, it reads APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID from env
    notarize: !!process.env.APPLE_TEAM_ID,
    // Debugging: Allow disabling timestamp to isolate network issues
    timestamp: process.env.NO_TIMESTAMP ? null : undefined
  },
  dmg: {
    sign: false // DMG signing is optional and can cause issues
  },
  linux: {
    target: ['AppImage'],
    icon: 'build/icons', // Linux will use the icons directory containing multiple sizes
    artifactName: `${artifactBaseName}_linux-\${version}.\${ext}`
  }
}

const sanitizeFileEntries = <T>(value?: T[] | null): T[] | undefined => {
  if (!value) return value === null ? undefined : value
  return value.filter((item) => item != null)
}

const sanitizeConfig = (config: Configuration): Configuration => ({
  ...config,
  files: sanitizeFileEntries(config.files as string[]),
  extraFiles: sanitizeFileEntries(config.extraFiles as any[]),
  extraResources: sanitizeFileEntries(config.extraResources as any[])
})

const buildConfig: BuildConfig = {
  config: sanitizeConfig(options),
  // Publishing is handled by the GitHub Actions release-upload step.
  publish: 'never'
}

if (platform !== 'ALL') {
  buildConfig.targets = Platform[platform].createTarget()
} else {
  // When building for all platforms, create a combined target map
  buildConfig.targets = new Map([
    [Platform.LINUX, new Map([[Arch.x64, ['AppImage']]])],
    [Platform.WINDOWS, new Map([[Arch.x64, ['nsis']]])],
    [Platform.MAC, new Map([[Arch.x64, ['dmg']], [Arch.arm64, ['dmg']]])]
  ])
}

// Function to convert electron-builder arch to our naming convention
function getArchName(arch: Arch): string {
  if (arch === Arch.arm64) return 'arm64';
  if (arch === Arch.x64) return 'intel';
  return arch.toString();
}

async function main(): Promise<void> {
  try {
    // Generate icons first
    await generateIcons()

    const requiredServerFiles = [
      'package.json',
      'dist/app.js',
      'prisma/schema.prisma'
    ]
    for (const file of requiredServerFiles) {
      const filePath = `resources/server/${file}`
      if (!require('fs').existsSync(filePath)) {
        throw new Error(`Missing required server file for packaging: ${filePath}`)
      }
    }
    const optionalEnvPath = 'resources/server/.env'
    if (!require('fs').existsSync(optionalEnvPath)) {
      console.warn(`Optional server env file not found: ${optionalEnvPath}. Continuing without bundled .env.`)
    }
    const requiredServerDirs = ['dist', 'prisma', 'node_modules']
    for (const dir of requiredServerDirs) {
      const dirPath = `resources/server/${dir}`
      if (!require('fs').existsSync(dirPath)) {
        throw new Error(`Missing required server directory for packaging: ${dirPath}`)
      }
    }

    // Then proceed with electron-builder
    console.log('Starting electron-builder...')

    // Handle different platforms separately to customize naming
    if (platform === 'ALL') {
      // Custom handling for builds with specific architecture naming
      console.log('Building for all platforms with custom naming...')

      // Build for Linux
      console.log('Building for Linux...')
      await build({
        config: sanitizeConfig(options),
        publish: 'never',
        targets: new Map([[Platform.LINUX, new Map([[Arch.x64, ['AppImage']]])]])
      })

      // Build for Windows
      console.log('Building for Windows...')
      await build({
        config: sanitizeConfig(options),
        publish: 'never',
        targets: new Map([[Platform.WINDOWS, new Map([[Arch.x64, ['nsis']]])]])
      })

      // Build for macOS with both architectures
      console.log('Building for macOS...')
      for (const arch of [Arch.arm64, Arch.x64]) {
        const archName = getArchName(arch);
        console.log(`Building for macOS (${archName})...`);

        const macConfig = sanitizeConfig({
          ...options,
          mac: {
            ...options.mac,
            artifactName: `${artifactBaseName}_macos-${archName}-\${version}.\${ext}`
          }
        });

        await build({
          config: macConfig,
          publish: 'never',
          targets: new Map([[Platform.MAC, new Map([[arch, ['dmg']]])]])
        });
      }

      console.log('All platform builds completed successfully')
    } else {
      // For single platform builds, use the standard configuration
      const result = await build(buildConfig)
      console.log('Build completed:', result)
    }
  } catch (error) {
    console.error('Build process failed:', error)
    process.exit(1)
  }
}

// Run the build process
main()
