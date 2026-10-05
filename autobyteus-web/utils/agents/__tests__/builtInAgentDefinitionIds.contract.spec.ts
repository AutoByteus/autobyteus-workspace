import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_AGENT_DEFINITION_IDS } from '../builtInAgentDefinitionIds'

/**
 * DI-002 contract pin: the web keeps a hand mirror of the server's built-in agent ids (built-ins
 * are never offered as `@` collaborators). This fails as soon as the server registry drifts.
 */
const REGISTRY_PATH = resolve(process.cwd(), '../autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts')

const readRegistry = () => {
  const source = readFileSync(REGISTRY_PATH, 'utf-8')
  const constants = new Map<string, string>()
  for (const match of source.matchAll(/export const (\w+_AGENT_DEFINITION_ID)\s*=\s*["']([^"']+)["']/g)) {
    constants.set(match[1]!, match[2]!)
  }
  const list = source.slice(source.indexOf('export const BUILT_IN_AGENT_DEFINITIONS'))
  const listedIds = [...list.matchAll(/\bid:\s*([A-Z_]+|["'][^"']+["'])/g)].map(([, ref]) =>
    /^["']/.test(ref!) ? ref!.slice(1, -1) : constants.get(ref!) ?? `<unresolved ${ref}>`)
  return { constants, listedIds }
}

describe('built-in agent ids mirror the server registry (DI-002)', () => {
  it('every server `*_AGENT_DEFINITION_ID` built-in is in the web mirror, and nothing else', () => {
    const { constants, listedIds } = readRegistry()
    expect(constants.size).toBeGreaterThan(0)
    expect(listedIds.length).toBeGreaterThan(0)
    // Each registered built-in uses one of the exported id constants.
    expect(listedIds.sort()).toEqual([...constants.values()].sort())
    expect([...BUILT_IN_AGENT_DEFINITION_IDS].sort()).toEqual([...constants.values()].sort())
  })
})
