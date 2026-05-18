import type { Rectangle, WebContents } from 'electron'
import {
  BrowserTabError,
  type BrowserDeviceEmulationProfile,
  type BrowserDeviceEmulationState,
  type SetBrowserDeviceEmulationRequest,
} from './browser-tab-types'

const DEFAULT_MOBILE_PROFILE: BrowserDeviceEmulationProfile = {
  width: 390,
  height: 844,
  device_scale_factor: 3,
}

const MOBILE_PROFILE_LIMITS = {
  width: { min: 100, max: 4096 },
  height: { min: 100, max: 4096 },
  device_scale_factor: { min: 1, max: 4 },
}

export const DEFAULT_BROWSER_DEVICE_EMULATION_STATE: BrowserDeviceEmulationState = {
  mode: 'desktop',
  profile: null,
}

export type BrowserDevicePresentation = {
  hostBounds: Rectangle
  bounds: Rectangle
  scale: number
}

const clampInteger = (
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  const integer = typeof value === 'number' && Number.isInteger(value) ? value : fallback
  return Math.max(minimum, Math.min(integer, maximum))
}

const normalizeBounds = (bounds: Rectangle): Rectangle => ({
  x: Math.round(bounds.x),
  y: Math.round(bounds.y),
  width: Math.max(1, Math.round(bounds.width)),
  height: Math.max(1, Math.round(bounds.height)),
})

export const cloneBrowserDeviceEmulationState = (
  state: BrowserDeviceEmulationState,
): BrowserDeviceEmulationState =>
  state.mode === 'mobile'
    ? {
        mode: 'mobile',
        profile: { ...state.profile },
      }
    : { ...DEFAULT_BROWSER_DEVICE_EMULATION_STATE }

export class BrowserDeviceEmulationController {
  resolveState(input: SetBrowserDeviceEmulationRequest): BrowserDeviceEmulationState {
    if (input.mode === 'desktop') {
      return { ...DEFAULT_BROWSER_DEVICE_EMULATION_STATE }
    }

    if (input.mode !== 'mobile') {
      throw new BrowserTabError(
        'browser_device_emulation_failed',
        "Device emulation mode must be 'desktop' or 'mobile'.",
      )
    }

    return {
      mode: 'mobile',
      profile: {
        width: clampInteger(
          input.width,
          DEFAULT_MOBILE_PROFILE.width,
          MOBILE_PROFILE_LIMITS.width.min,
          MOBILE_PROFILE_LIMITS.width.max,
        ),
        height: clampInteger(
          input.height,
          DEFAULT_MOBILE_PROFILE.height,
          MOBILE_PROFILE_LIMITS.height.min,
          MOBILE_PROFILE_LIMITS.height.max,
        ),
        device_scale_factor: clampInteger(
          input.device_scale_factor,
          DEFAULT_MOBILE_PROFILE.device_scale_factor,
          MOBILE_PROFILE_LIMITS.device_scale_factor.min,
          MOBILE_PROFILE_LIMITS.device_scale_factor.max,
        ),
      },
    }
  }

  resolvePresentation(
    hostBounds: Rectangle,
    state: BrowserDeviceEmulationState,
  ): BrowserDevicePresentation {
    const normalizedHostBounds = normalizeBounds(hostBounds)
    if (state.mode === 'desktop') {
      return {
        hostBounds: normalizedHostBounds,
        bounds: { ...normalizedHostBounds },
        scale: 1,
      }
    }

    const presentationScale = Math.min(
      1,
      normalizedHostBounds.width / state.profile.width,
      normalizedHostBounds.height / state.profile.height,
    )
    const presentationWidth = Math.max(1, Math.round(state.profile.width * presentationScale))
    const presentationHeight = Math.max(1, Math.round(state.profile.height * presentationScale))

    return {
      hostBounds: normalizedHostBounds,
      bounds: {
        x: normalizedHostBounds.x + Math.floor((normalizedHostBounds.width - presentationWidth) / 2),
        y: normalizedHostBounds.y + Math.floor((normalizedHostBounds.height - presentationHeight) / 2),
        width: presentationWidth,
        height: presentationHeight,
      },
      scale: presentationScale,
    }
  }

  apply(webContents: WebContents, state: BrowserDeviceEmulationState, scale = 1): void {
    try {
      if (state.mode === 'desktop') {
        webContents.disableDeviceEmulation()
        return
      }

      const parameters: Parameters<WebContents['enableDeviceEmulation']>[0] = {
        screenPosition: 'mobile',
        screenSize: {
          width: state.profile.width,
          height: state.profile.height,
        },
        viewPosition: { x: 0, y: 0 },
        deviceScaleFactor: state.profile.device_scale_factor,
        viewSize: {
          width: state.profile.width,
          height: state.profile.height,
        },
        scale,
      }
      webContents.enableDeviceEmulation(parameters)
    } catch (error) {
      throw new BrowserTabError(
        'browser_device_emulation_failed',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  reapplyMobileIfNeeded(webContents: WebContents, state: BrowserDeviceEmulationState, scale = 1): void {
    if (state.mode !== 'mobile') {
      return
    }
    this.apply(webContents, state, scale)
  }
}
