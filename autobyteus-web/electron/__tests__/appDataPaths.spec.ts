import { describe, expect, it } from 'vitest'
import {
  getCanonicalBaseDataPath,
  getCanonicalExtensionsPath,
  getCanonicalLogsPath,
  getCanonicalServerDataPath,
} from '../appDataPaths'

describe('appDataPaths', () => {
  it('derives canonical sibling paths from the AutoByteus base data root', () => {
    const basePath = getCanonicalBaseDataPath('/Users/tester')

    expect(basePath).toBe('/Users/tester/.autobyteus')
    expect(getCanonicalServerDataPath(basePath)).toBe('/Users/tester/.autobyteus/server-data')
    expect(getCanonicalExtensionsPath(basePath)).toBe('/Users/tester/.autobyteus/extensions')
    expect(getCanonicalLogsPath(basePath)).toBe('/Users/tester/.autobyteus/logs')
  })
})
