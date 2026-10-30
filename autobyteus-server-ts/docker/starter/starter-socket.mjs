// The starter's local HTTP API (C2) on a unix socket readable by root only. A thin transport: each
// route hands its request to its owner. GET /status[?target=<version>] → UpdateStatus.status.
import { chmodSync, mkdirSync, rmSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { InvalidVersionError } from './update-status.mjs'

function send(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

export class StarterSocket {
  #socketPath
  #updateStatus
  #server = null

  constructor({ socketPath, updateStatus }) {
    this.#socketPath = socketPath
    this.#updateStatus = updateStatus
  }

  #handle(request, response) {
    const url = new URL(request.url, 'http://starter')
    if (request.method === 'GET' && url.pathname === '/status') {
      try {
        return send(response, 200, this.#updateStatus.status(url.searchParams.get('target')))
      } catch (error) {
        if (error instanceof InvalidVersionError) return send(response, 400, { code: error.code, message: error.message })
        throw error
      }
    }
    return send(response, 404, { message: `No route ${request.method} ${url.pathname}` })
  }

  async listen() {
    mkdirSync(path.dirname(this.#socketPath), { recursive: true, mode: 0o700 })
    rmSync(this.#socketPath, { force: true })
    this.#server = http.createServer((request, response) => this.#handle(request, response))
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
