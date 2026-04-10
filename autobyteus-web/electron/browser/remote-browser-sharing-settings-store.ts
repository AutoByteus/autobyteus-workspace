import * as fsSync from 'fs'
import * as path from 'path'
import type { RemoteBrowserSharingSettings } from '../nodeRegistryTypes'
import { logger } from '../logger'

const REMOTE_BROWSER_SHARING_SETTINGS_FILE = 'remote-browser-sharing.v1.json'

const DEFAULT_SETTINGS: RemoteBrowserSharingSettings = {
  enabled: false,
  advertisedHost: '',
}

function getSettingsFilePath(userDataPath: string): string {
  return path.join(userDataPath, REMOTE_BROWSER_SHARING_SETTINGS_FILE)
}

function normalizeAdvertisedHost(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error('Advertised host must not include a protocol.')
  }

  let parsed: URL
  try {
    parsed = new URL(`http://${trimmed}`)
  } catch {
    throw new Error('Advertised host is invalid.')
  }

  if (parsed.port) {
    throw new Error('Advertised host must not include a port.')
  }

  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Advertised host must not include a path, query, or hash.')
  }

  return trimmed
}

function normalizeSettings(input: RemoteBrowserSharingSettings): RemoteBrowserSharingSettings {
  const advertisedHost = normalizeAdvertisedHost(input.advertisedHost)
  const enabled = Boolean(input.enabled)

  if (enabled && !advertisedHost) {
    throw new Error('Advertised host is required when remote browser sharing is enabled.')
  }

  return {
    enabled,
    advertisedHost,
  }
}

export class RemoteBrowserSharingSettingsStore {
  private snapshot: RemoteBrowserSharingSettings | null = null

  constructor(private readonly userDataPath: string) {}

  getSnapshot(): RemoteBrowserSharingSettings {
    if (!this.snapshot) {
      this.snapshot = this.load()
    }
    return { ...this.snapshot }
  }

  save(nextSettings: RemoteBrowserSharingSettings): RemoteBrowserSharingSettings {
    const normalized = normalizeSettings(nextSettings)
    this.snapshot = normalized

    try {
      fsSync.writeFileSync(
        getSettingsFilePath(this.userDataPath),
        JSON.stringify(normalized, null, 2),
        'utf8',
      )
    } catch (error) {
      logger.error('Failed to persist remote browser sharing settings:', error)
      throw error
    }

    return { ...normalized }
  }

  getListenerHost(): string {
    return this.getSnapshot().enabled ? '0.0.0.0' : '127.0.0.1'
  }

  private load(): RemoteBrowserSharingSettings {
    const filePath = getSettingsFilePath(this.userDataPath)
    if (!fsSync.existsSync(filePath)) {
      return { ...DEFAULT_SETTINGS }
    }

    try {
      const raw = fsSync.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<RemoteBrowserSharingSettings>
      return normalizeSettings({
        enabled: Boolean(parsed.enabled),
        advertisedHost: typeof parsed.advertisedHost === 'string' ? parsed.advertisedHost : '',
      })
    } catch (error) {
      logger.error('Failed to load remote browser sharing settings, using defaults:', error)
      return { ...DEFAULT_SETTINGS }
    }
  }
}
