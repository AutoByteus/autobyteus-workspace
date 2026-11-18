#!/usr/bin/env node
// The starter's host command (C2, frozen): a client of the starter socket, run inside the container
// with `docker exec <container> node /opt/autobyteus/starter/cli.mjs <command>`.
//
//   status                                   the starter's status
//   update --version <X.Y.Z[-beta.N]>        start an in-place update to that version
//   update --track stable|beta               start an in-place update to the newest release of a track
//
// An update request is logged as coming from `host command`. The command returns when the starter
// accepted or refused the request; `status` then shows the update's progress and result.
// The socket is STARTER_PATHS.socket, or AUTOBYTEUS_STARTER_SOCKET when set (as for the server).
// Output is one JSON line: the starter's answer, or { "message": … } when it cannot be reached.
// Exit code: 0 ok or accepted, 2 refused (the code is in the JSON), 1 error.
import http from 'node:http'
import { STARTER_PATHS } from './starter-paths.mjs'

const socketPath = process.env.AUTOBYTEUS_STARTER_SOCKET || STARTER_PATHS.socket
const USAGE = 'Usage: cli.mjs status | cli.mjs update (--version <X.Y.Z[-beta.N]> | --track stable|beta)'

function print(body, exitCode) {
  process.stdout.write(`${JSON.stringify(body)}\n`)
  process.exit(exitCode)
}

function request(method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body)
    const outgoing = http.request({
      socketPath, method, path: requestPath, timeout: 60_000,
      headers: payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {},
    }, (response) => {
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk })
      response.on('end', () => {
        try {
          resolve({ statusCode: response.statusCode, body: JSON.parse(text) })
        } catch {
          reject(new Error(`the starter answered ${response.statusCode} without JSON`))
        }
      })
    })
    outgoing.on('timeout', () => outgoing.destroy(new Error('the starter did not answer within 60 s')))
    outgoing.on('error', reject)
    outgoing.end(payload)
  })
}

function parse(args) {
  const [command, ...rest] = args
  if (command === 'status' && rest.length === 0) return { method: 'GET', path: '/status' }
  if (command === 'update' && rest.length === 2 && rest[1]) {
    if (rest[0] === '--version') return { method: 'POST', path: '/updates', body: { version: rest[1], requestedFrom: 'host command' } }
    if (rest[0] === '--track') return { method: 'POST', path: '/updates', body: { track: rest[1], requestedFrom: 'host command' } }
  }
  return null
}

const call = parse(process.argv.slice(2))
if (!call) print({ message: USAGE }, 1)
try {
  const { statusCode, body } = await request(call.method, call.path, call.body)
  print(body, statusCode === 200 || statusCode === 202 ? 0 : statusCode === 409 ? 2 : 1)
} catch (error) {
  print({ message: `Cannot reach the starter at ${socketPath}: ${error.message}` }, 1)
}
