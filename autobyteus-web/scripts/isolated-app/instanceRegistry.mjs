import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { notFoundError, usageError } from './isolatedAppErrors.mjs'

export const INSTANCE_RECORD_SCHEMA_VERSION = 1

export function defaultRegistryDir() {
  return path.join(os.tmpdir(), 'autobyteus-isolated-app')
}

function isInstanceRecord(value, expectedId) {
  return Boolean(value)
    && value.schemaVersion === INSTANCE_RECORD_SCHEMA_VERSION
    && typeof value.id === 'string'
    && (expectedId === undefined || value.id === expectedId)
    && Number.isInteger(value.pid)
    && Number.isInteger(value.controlPort)
    && Number.isInteger(value.serverPort)
    && typeof value.dataRoot === 'string'
}

/**
 * Instance records: one JSON file per isolated instance, so later invocations can own it.
 * Records are ephemeral (OS temp dir) and only ever describe instances this tool started.
 */
export function createInstanceRegistry({ dir = defaultRegistryDir() } = {}) {
  const ensureDir = () => fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const recordPath = (id) => path.join(dir, `${id}.json`)
  const logPath = (id) => path.join(dir, `${id}.log`)

  const read = (id) => {
    try {
      const value = JSON.parse(fs.readFileSync(recordPath(id), 'utf8'))
      return isInstanceRecord(value, id) ? value : null
    } catch {
      return null
    }
  }

  const list = () => {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => read(name.slice(0, -'.json'.length)))
      .filter(Boolean)
      .sort((left, right) => String(left.startedAt).localeCompare(String(right.startedAt)))
  }

  const write = (record) => {
    ensureDir()
    const target = recordPath(record.id)
    const temporary = `${target}.${process.pid}.tmp`
    fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 })
    fs.renameSync(temporary, target)
    return record
  }

  const remove = (id, { removeLog = false } = {}) => {
    fs.rmSync(recordPath(id), { force: true })
    if (removeLog) fs.rmSync(logPath(id), { force: true })
  }

  const generateId = (controlPort) => {
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const id = `iso-${controlPort}-${randomBytes(2).toString('hex')}`
      if (!fs.existsSync(recordPath(id)) && !fs.existsSync(logPath(id))) return id
    }
    throw new Error('Unable to allocate a unique isolated instance id')
  }

  /** The requested id, or the only recorded instance when no id is given. */
  const resolveId = (requestedId) => {
    if (requestedId) {
      if (!read(requestedId)) {
        throw notFoundError('INSTANCE_NOT_FOUND', `No isolated instance with id ${requestedId}`)
      }
      return requestedId
    }
    const ids = list().map((record) => record.id)
    if (ids.length === 1) return ids[0]
    if (ids.length === 0) {
      throw notFoundError('INSTANCE_NOT_FOUND', 'No isolated instances are recorded')
    }
    throw usageError(
      'INSTANCE_ID_REQUIRED',
      `Several isolated instances are recorded; pass one id: ${ids.join(', ')}`,
      { instanceIds: ids },
    )
  }

  const findByControlPort = (controlPort) => list().find((record) => record.controlPort === controlPort) ?? null

  return Object.freeze({
    dir,
    recordPath,
    logPath,
    read,
    list,
    write,
    remove,
    generateId,
    resolveId,
    findByControlPort,
  })
}
