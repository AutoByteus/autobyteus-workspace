import * as path from 'path'
import * as fs from 'fs'
import { logger } from '../../logger'

/**
 * Service responsible for managing application data directories and initialization.
 * Handles first-run setup, directory creation, and environment validation.
 */
export class AppDataService {
  private appDataDir: string
  private firstRun: boolean
  private requiredDataDirs = ['db', 'logs', 'download']

  constructor(baseDataPath: string) {
    this.appDataDir = path.join(baseDataPath, 'server-data')
    const dataDirExists = fs.existsSync(this.appDataDir)
    const hasEnvFile = dataDirExists && fs.existsSync(path.join(this.appDataDir, '.env'))
    this.firstRun = !dataDirExists || !hasEnvFile
    if (dataDirExists && !hasEnvFile) {
      logger.warn('App data directory is missing .env. Reinitializing first-run data.')
    }
  }

  /**
   * Get the application data directory path.
   */
  getAppDataDir(): string {
    return this.appDataDir
  }

  /**
   * Check if this is the first run of the application.
   */
  isFirstRun(): boolean {
    return this.firstRun
  }

  /**
   * Initialize the application data directory.
   * Creates the directory if it doesn't exist.
   */
  initialize(): void {
    if (!fs.existsSync(this.appDataDir)) {
      try {
        fs.mkdirSync(this.appDataDir, { recursive: true })
        logger.info(`Created app data directory: ${this.appDataDir}`)
      } catch (error) {
        logger.error('Failed to create app data directory:', error)
        throw new Error(`Failed to create app data directory at ${this.appDataDir}: ${error}`)
      }
    }
    this.ensureDataDirs()
  }

  /**
   * Perform first-run initialization by copying required files and creating directories.
   */
  initializeFirstRun(serverDir: string): void {
    logger.info('Performing first-run initialization...')

    try {
      // Check for required files in the server directory before proceeding
      const requiredServerFiles = ['.env', 'package.json']
      for (const file of requiredServerFiles) {
        const filePath = path.join(serverDir, file)
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required server file not found: ${filePath}`)
        }
      }

      // Check for required directories in the server directory
      const requiredServerDirs = ['dist', 'prisma', 'node_modules']
      for (const dir of requiredServerDirs) {
        const dirPath = path.join(serverDir, dir)
        if (!fs.existsSync(dirPath)) {
          throw new Error(`Required server directory not found: ${dirPath}`)
        }
      }
      const serverEntry = path.join(serverDir, 'dist', 'app.js')
      if (!fs.existsSync(serverEntry)) {
        throw new Error(`Required server entrypoint not found: ${serverEntry}`)
      }
      const prismaSchema = path.join(serverDir, 'prisma', 'schema.prisma')
      if (!fs.existsSync(prismaSchema)) {
        throw new Error(`Required Prisma schema not found: ${prismaSchema}`)
      }

      // Create the app data directory if it doesn't exist
      if (!fs.existsSync(this.appDataDir)) {
        fs.mkdirSync(this.appDataDir, { recursive: true })
      }

      // Create required subdirectories in the app data directory
      for (const dir of this.requiredDataDirs) {
        const dirPath = path.join(this.appDataDir, dir)
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true })
          logger.info(`Created directory: ${dirPath}`)
        }
      }

      // Copy .env file on first run (but don't update it later)
      const envFileSrc = path.join(serverDir, '.env')
      const envFileDest = path.join(this.appDataDir, '.env')
      fs.copyFileSync(envFileSrc, envFileDest)
      logger.info(`Copied .env file to: ${envFileDest}`)

      this.migrateLegacyDatabaseIfNeeded(serverDir)

      // Copy download directory if it exists in the server directory
      const downloadSrcDir = path.join(serverDir, 'download')
      const downloadDestDir = path.join(this.appDataDir, 'download')
      if (fs.existsSync(downloadSrcDir)) {
        try {
          this.copyDirectory(downloadSrcDir, downloadDestDir)
          logger.info(`Copied download directory contents to: ${downloadDestDir}`)
        } catch (copyError) {
          logger.warn(`Warning: Failed to copy download directory contents: ${copyError}`)
        }
      }

      logger.info('First-run initialization completed successfully')
      this.firstRun = false
    } catch (error) {
      logger.error('Error during first-run initialization:', error)
      throw new Error(`Failed to initialize app data: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Validate that all required files and directories exist.
   * Returns an array of error messages for any missing items.
   */
  validateEnvironment(serverDir: string): string[] {
    const errors: string[] = []

    const requiredServerFiles = ['.env', 'package.json']
    for (const file of requiredServerFiles) {
      const filePath = path.join(serverDir, file)
      if (!fs.existsSync(filePath)) {
        errors.push(`Required server file not found: ${filePath}`)
      }
    }

    const requiredServerDirs = ['dist', 'prisma', 'node_modules']
    for (const dir of requiredServerDirs) {
      const dirPath = path.join(serverDir, dir)
      if (!fs.existsSync(dirPath)) {
        errors.push(`Required server directory not found: ${dirPath}`)
      }
    }

    const serverEntry = path.join(serverDir, 'dist', 'app.js')
    if (!fs.existsSync(serverEntry)) {
      errors.push(`Required server entrypoint not found: ${serverEntry}`)
    }

    const prismaSchema = path.join(serverDir, 'prisma', 'schema.prisma')
    if (!fs.existsSync(prismaSchema)) {
      errors.push(`Required Prisma schema not found: ${prismaSchema}`)
    }

    const requiredDataDirs = ['logs', 'db', 'download']
    for (const dir of requiredDataDirs) {
      const dirPath = path.join(this.appDataDir, dir)
      if (!fs.existsSync(dirPath)) {
        errors.push(`Required data directory not found: ${dirPath}`)
      }
    }

    const envFilePath = path.join(this.appDataDir, '.env')
    if (!fs.existsSync(envFilePath)) {
      errors.push(`Required config file not found: ${envFilePath}`)
    }

    return errors
  }

  private migrateLegacyDatabaseIfNeeded(serverDir: string): void {
    const legacyDbPath = path.join(serverDir, 'db', 'production.db')
    const targetDbPath = path.join(this.appDataDir, 'db', 'production.db')
    if (!fs.existsSync(targetDbPath) && fs.existsSync(legacyDbPath)) {
      fs.copyFileSync(legacyDbPath, targetDbPath)
      logger.info(`Migrated legacy database to: ${targetDbPath}`)
    }
  }

  /**
   * Recursively copy a directory.
   */
  copyDirectory(sourceDir: string, destDir: string): void {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name)
      const destPath = path.join(destDir, entry.name)
      if (entry.isDirectory()) {
        this.copyDirectory(sourcePath, destPath)
      } else {
        fs.copyFileSync(sourcePath, destPath)
      }
    }
  }

  /**
   * Reset the app data directory to a clean state.
   */
  async resetAppDataDir(): Promise<void> {
    try {
      if (fs.existsSync(this.appDataDir)) {
        await this.removeDirWithRetries(this.appDataDir)
      }
      this.firstRun = true
      this.initialize()
    } catch (error) {
      logger.error('Failed to reset app data directory:', error)
      throw error
    }
  }

  private ensureDataDirs(): void {
    for (const dir of this.requiredDataDirs) {
      const dirPath = path.join(this.appDataDir, dir)
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
        logger.info(`Created missing data directory: ${dirPath}`)
      }
    }
  }

  private async removeDirWithRetries(dirPath: string, retries: number = 5, delayMs: number = 300): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await fs.promises.rm(dirPath, { recursive: true, force: true })
        return
      } catch (error) {
        const err = error as NodeJS.ErrnoException
        const shouldRetry = err?.code === 'EBUSY' || err?.code === 'EPERM' || err?.code === 'EACCES'
        if (!shouldRetry || attempt === retries) {
          throw error
        }
        const backoffMs = delayMs * (attempt + 1)
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
      }
    }
  }
}
