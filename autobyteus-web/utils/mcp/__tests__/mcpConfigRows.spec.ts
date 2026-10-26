/**
 * The web side of the MCP secret suggestion rule and the form's row model. The matcher is checked against the
 * shared vectors (`test-support/fixtures/mcp-secret-suggestion-vectors.json`), given the same rule the server
 * publishes, so the web pre-locks exactly what the server would treat as secret. Dummy values only.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  fieldsNeedingSecret,
  matchMcpSecret,
  rowsFromEntries,
  rowsFromJson,
  rowsToInput,
  rowsToJson,
  tokenFromJson,
  tokenToInput,
  type McpSecretSuggestionRule,
} from '../mcpConfigRows'

type Vector = { field: string; value: string; expected: string | null }
const { rule, vectors } = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), '../test-support/fixtures/mcp-secret-suggestion-vectors.json'), 'utf8'),
) as { rule: McpSecretSuggestionRule; vectors: Vector[] }

describe('matchMcpSecret (shared vectors)', () => {
  it.each(vectors.map(vector => [vector.field, vector.value, vector.expected] as const))('%s = %j → %s', (field, value, expected) => {
    expect(matchMcpSecret(rule, field, value)).toBe(expected)
  })

  it('suggests nothing before the rule is read', () => {
    expect(matchMcpSecret(null, 'env:API_KEY', 'sk-test-dummy')).toBeNull()
  })
})

describe('MCP config rows', () => {
  it('round-trips stored values through the JSON View, with keep markers for values the server does not return', () => {
    const rows = rowsFromEntries([
      { name: 'Authorization', value: null, state: 'PLAIN' },
      { name: 'X-Api-Key', value: null, state: 'CONFIGURED' },
      { name: 'X-Toolsets', value: 'repos', state: 'PLAIN' },
    ], 'header', rule)

    const json = rowsToJson(rows)
    expect(json).toEqual({ Authorization: { stored: 'plain' }, 'X-Api-Key': { stored: 'vault' }, 'X-Toolsets': 'repos' })

    const back = rowsFromJson(json, 'header', rows, rule)
    expect(back.needsReview).toBe(false)
    expect(rowsToInput(back.rows, 'header', rule)).toEqual([
      { name: 'Authorization', secret: true, value: null },
      { name: 'X-Api-Key', secret: true, value: null },
      { name: 'X-Toolsets', secret: false, value: 'repos' },
    ])
  })

  it('locks a new JSON value the rule matches and asks for a review; an always-secret one needs none', () => {
    expect(rowsFromJson({ GITHUB_TOKEN: 'test-dummy' }, 'env', [], rule)).toMatchObject({ needsReview: true, rows: [{ locked: true }] })
    expect(rowsFromJson({ Authorization: 'Bearer test-dummy' }, 'header', [], rule)).toMatchObject({ needsReview: false, rows: [{ locked: true }] })
    expect(rowsFromJson({ LOG_LEVEL: 'debug' }, 'env', [], rule)).toMatchObject({ needsReview: false, rows: [{ locked: false }] })
  })

  it('refuses a keep marker without a stored value, and a value that is neither a string nor a marker', () => {
    expect(() => rowsFromJson({ API_KEY: { stored: 'vault' } }, 'env', [], rule)).toThrow('env:API_KEY has no stored value to keep.')
    expect(() => rowsFromJson({ PORT: 8080 }, 'env', [], rule)).toThrow("'env.PORT' must be a string or a keep marker.")
  })

  it('needs a value for a new locked row', () => {
    const [row] = rowsFromJson({ API_KEY: '' }, 'env', [], rule).rows
    expect(() => rowsToInput([{ ...row!, locked: true }], 'env', rule)).toThrow('Enter a value for env:API_KEY.')
  })

  it('keeps, replaces or removes the token', () => {
    const stored = { stored: 'CONFIGURED' as const, value: '', remove: false }
    expect(tokenToInput(stored)).toEqual({ keep: true })
    expect(tokenToInput({ ...stored, value: 'test-dummy' })).toEqual({ value: 'test-dummy' })
    expect(tokenToInput({ ...stored, remove: true })).toBeNull()
    expect(tokenFromJson(undefined, stored)).toMatchObject({ remove: true })
    expect(tokenFromJson({ stored: 'vault' }, stored)).toMatchObject({ remove: false, value: '' })
    expect(() => tokenFromJson({ stored: 'vault' }, { stored: null, value: '', remove: false })).toThrow('token has no stored value to keep.')
  })

  it('lists the fields that need a secret', () => {
    expect(fieldsNeedingSecret({
      env: [{ name: 'A', value: null, state: 'MISSING' }, { name: 'B', value: 'x', state: 'PLAIN' }],
      headers: [{ name: 'X-Key', value: null, state: 'VAULT_UNAVAILABLE' }],
      tokenState: 'MISSING',
    })).toEqual(['env:A', 'header:X-Key', 'token'])
  })
})
