// The starter's local HTTP API (C2, frozen) on a unix socket readable by root only. A thin transport:
// both routes hand their request to UpdateService, the one entry for status and update requests.
//   GET  /status[?target=<version>]                    → 200 status | 400 { code: INVALID_VERSION }
//   POST /updates { version | track, requestedFrom }   → 202 { accepted, version } | 409 { refused, message }
import { chmodSync, mkdirSync, rmSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { InvalidVersionError } from './update-status.mjs'

const MAX_BODY_BYTES = 4096

function send(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    let text = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      text += chunk
      if (text.length > MAX_BODY_BYTES) request.destroy()
    })
    request.on('end', () => {
      try {
        const body = JSON.parse(text)
        resolve(body && typeof body === 'object' && !Array.isArray(body) ? body : null)
      } catch {
        resolve(null)
      }
    })
  })
}

export class StarterSocket {
  #socketPath
  #updateService
  #server = null

  constructor({ socketPath, updateService }) {
    this.#socketPath = socketPath
    this.#updateService = updateService
  }

  async #handle(request, response) {
    const url = new URL(request.url, 'http://starter')
    if (request.method === 'GET' && url.pathname === '/status') {
      try {
        return send(response, 200, this.#updateService.status(url.searchParams.get('target')))
      } catch (error) {
        if (error instanceof InvalidVersionError) return send(response, 400, { code: error.code, message: error.message })
        throw error
      }
    }
    if (request.method === 'POST' && url.pathname === '/updates') {
      const body = await readJsonBody(request)
      if (!body || typeof body.requestedFrom !== 'string' || !body.requestedFrom) {
        return send(response, 400, { message: 'The body must be JSON { version | track, requestedFrom }.' })
      }
      const answer = await this.#updateService.request({ version: body.version, track: body.track, requestedFrom: body.requestedFrom })
      return send(response, answer.accepted ? 202 : 409, answer)
    }
    return send(response, 404, { message: `No route ${request.method} ${url.pathname}` })
  }

  async listen() {
    mkdirSync(path.dirname(this.#socketPath), { recursive: true, mode: 0o700 })
    rmSync(this.#socketPath, { force: true })
    this.#server = http.createServer((request, response) => {
      this.#handle(request, response).catch((error) => send(response, 500, { message: error.message }))
    })
    await new Promise((resolve, reject) => {
      this.#server.once('error', reject)
      this.#server.listen(this.#socketPath, resolve)
    })
    chmodSync(this.#socketPath, 0o600)
  }

  async close() {
    if (!this.#server) return
    await new Promise((resolve) => this.#server.close(resolve))
    rmSync(this.#socketPath, { force: true })
  }
}
