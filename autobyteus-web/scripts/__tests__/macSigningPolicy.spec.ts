import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  classifyMacSigningSubject,
  mandatoryUpdaterPaths,
  resolveEntitlementsFile,
} from '../../build/scripts/macSigningPolicy'

const appRoot = path.join('/tmp', 'AutoByteus.app')

function classify(relativePath: string) {
  return classifyMacSigningSubject(appRoot, path.join(appRoot, relativePath))
}

describe('macSigningPolicy', () => {
  it('allows app entitlements only on the root app bundle and root main executable', () => {
    const rootBundle = classifyMacSigningSubject(appRoot, appRoot)
    const rootExecutable = classify('Contents/MacOS/AutoByteus')

    expect(rootBundle.entitlementProfile).toBe('root-app')
    expect(rootBundle.mayHaveEntitlementKeys).toBe(true)
    expect(rootExecutable.entitlementProfile).toBe('root-app')
    expect(rootExecutable.mayHaveEntitlementKeys).toBe(true)
    const rootEntitlements = fs.readFileSync(resolveEntitlementsFile('root-app')!, 'utf8')
    expect(rootEntitlements).toContain('com.apple.security.device.audio-input')
  })

  it('selects narrow helper profiles for Electron helper apps and their main executables', () => {
    const rendererBundle = classify('Contents/Frameworks/AutoByteus Helper (Renderer).app')
    const rendererExecutable = classify('Contents/Frameworks/AutoByteus Helper (Renderer).app/Contents/MacOS/AutoByteus Helper (Renderer)')
    const gpuExecutable = classify('Contents/Frameworks/AutoByteus Helper (GPU).app/Contents/MacOS/AutoByteus Helper (GPU)')
    const pluginExecutable = classify('Contents/Frameworks/AutoByteus Helper (Plugin).app/Contents/MacOS/AutoByteus Helper (Plugin)')
    const genericExecutable = classify('Contents/Frameworks/AutoByteus Helper.app/Contents/MacOS/AutoByteus Helper')

    expect(rendererBundle.entitlementProfile).toBe('helper-renderer')
    expect(rendererExecutable.entitlementProfile).toBe('helper-renderer')
    expect(gpuExecutable.entitlementProfile).toBe('helper-gpu')
    expect(pluginExecutable.entitlementProfile).toBe('helper-plugin')
    expect(genericExecutable.entitlementProfile).toBe('helper-generic')
  })

  it('requires no entitlement profile for Squirrel, ShipIt, frameworks, dylibs, and native modules', () => {
    const subjects = [
      classify('Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel'),
      classify('Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt'),
      classify('Contents/Frameworks/Electron Framework.framework'),
      classify('Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework'),
      classify('Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libEGL.dylib'),
      classify('Contents/Resources/server/node_modules/node-pty/build/Release/pty.node'),
    ]

    for (const subject of subjects) {
      expect(subject.entitlementProfile).toBe('none')
      expect(subject.mayHaveEntitlementKeys).toBe(false)
    }
  })

  it('keeps Squirrel and ShipIt as mandatory updater checks', () => {
    expect(mandatoryUpdaterPaths(appRoot).map((entry) => entry.name)).toEqual(['Squirrel', 'ShipIt'])
  })
})
