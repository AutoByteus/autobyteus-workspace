#!/usr/bin/env node
// The starter's host command (C2, frozen): a client of the starter socket, run inside the container
// with `docker exec <container> node /opt/autobyteus/starter/cli.mjs <command>`.
//
//   status   prints the starter's status as one JSON line
//
// The socket is STARTER_PATHS.socket, or AUTOBYTEUS_STARTER_SOCKET when set (as for the server).
// Output is one JSON line: the starter's answer, or { "message": … } when it cannot be reached.
// Exit code: 0 ok, 2 refused (the code is in the JSON), 1 error.
import http from 'node:http'
import { STARTER_PATHS } from './starter-paths.mjs'

const socketPath = process.env.AUTOBYTEUS_STARTER_SOCKET || STARTER_PATHS.socket

function print(body, exitCode) {
  process.stdout.write(`${JSON.stringify(body)}\n`)
  process.exit(exitCode)
}

function request(method, requestPath) {
  return new Promise((resolve, reject) => {
    const outgoing = http.request({ socketPath, method, path: requestPath, timeout: 10_000 }, (response) => {
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
    outgoing.on('timeout', () => outgoing.destroy(new Error('the starter did not answer within 10 s')))
    outgoing.on('error', reject)
    outgoing.end()
  })
}

const [command, ...rest] = process.argv.slice(2)
if (command !== 'status' || rest.length > 0) print({ message: 'Usage: cli.mjs status' }, 1)
try {
  const { statusCode, body } = await request('GET', '/status')
  print(body, statusCode === 200 ? 0 : 1)
} catch (error) {
  print({ message: `Cannot reach the starter at ${socketPath}: ${error.message}` }, 1)
}
