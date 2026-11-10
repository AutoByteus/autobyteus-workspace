import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COLLABORATION_INELIGIBLE_AGENT_DEFINITION_IDS } from '../collaborationIneligibleAgentDefinitionIds'

/**
 * DI-002 contract pin: the web keeps a hand mirror of the server's built-in agents that are never
 * collaborators (`collaborationEligible: false`). This fails as soon as the server registry drifts.
 */
// Relative to this spec (autobyteus-web/utils/collaborators/__tests__), not to the working directory.
const REGISTRY_PATH = resolve(dirname(fileURLToPath(import.meta.url)),
  '../../../../autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts')

const readRegistry = () => {
  const source = readFileSync(REGISTRY_PATH, 'utf-8')
  const constants = new Map<string, string>()
  for (const match of source.matchAll(/export const (\w+_AGENT_DEFINITION_ID)\s*=\s*["']([^"']+)["']/g)) {
    constants.set(match[1]!, match[2]!)
  }
  const list = source.slice(source.indexOf('export const BUILT_IN_AGENT_DEFINITIONS'))
  const entries = [...list.matchAll(/\{([^{}]*)\}/g)].map(([, body]) => {
    const ref = /\bid:\s*([A-Z_]+|["'][^"']+["'])/.exec(body!)?.[1]
    const eligible = /\bcollaborationEligible:\s*(true|false)\b/.exec(body!)?.[1]
    return {
      id: !ref ? '<no id>' : /^["']/.test(ref) ? ref.slice(1, -1) : constants.get(ref) ?? `<unresolved ${ref}>`,
      collaborationEligible: eligible === undefined ? '<missing>' : eligible === 'true',
    }
  })
  return { constants, entries }
}

describe('collaboration-ineligible agent ids mirror the server registry (DI-002)', () => {
  it('every registry entry declares collaborationEligible and uses an exported id constant', () => {
    const { constants, entries } = readRegistry()
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.map((entry) => entry.id).sort()).toEqual([...constants.values()].sort())
    expect(entries.filter((entry) => typeof entry.collaborationEligible !== 'boolean')).toEqual([])
  })

  it('the web set is exactly the entries marked `collaborationEligible: false`', () => {
    const ineligible = readRegistry().entries.filter((entry) => entry.collaborationEligible === false).map((entry) => entry.id)
    expect(ineligible.length).toBeGreaterThan(0)
    expect([...COLLABORATION_INELIGIBLE_AGENT_DEFINITION_IDS].sort()).toEqual(ineligible.sort())
  })
})
