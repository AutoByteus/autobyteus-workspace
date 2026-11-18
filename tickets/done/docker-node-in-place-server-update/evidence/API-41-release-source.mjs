// API-4x release source (based on IMP3-proof-release-source.mjs): GitHub's layout under one prefix per variant,
//   /<variant>/releases/download/v<version>/<asset>  from <dir>/<variant>/v<version>/<asset>
//   /<variant>/releases/latest -> 302 /releases/tag/v<stable>;  /<variant>/releases.atom
// Archives of the variants named in SLOW are sent at RATE bytes/s, so a 2 s poll sees the download.
// Usage: node release-source.mjs <dir> <port> <stable> <slow variants comma-separated> <rate bytes/s>
import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
const [dir, port, stable, slow = '', rate = '4000000'] = process.argv.slice(2)
const slowVariants = new Set(slow.split(',').filter(Boolean))
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://source')
  const m = /^\/([a-z0-9]+)\/releases(.*)$/.exec(url.pathname)
  console.log(new Date().toISOString(), request.method, url.pathname)
  if (!m) { response.writeHead(404); return response.end() }
  const [, variant, rest] = m
  if (rest === '/latest') { response.writeHead(302, { location: `http://source/releases/tag/v${stable}` }); return response.end() }
  if (rest === '.atom') { response.writeHead(200); return response.end(`<link href="https://github.com/o/r/releases/tag/v${stable}"/>`) }
  const file = path.join(dir, variant, decodeURIComponent(rest.replace(/^\/download\//, '')))
  let size
  try { size = statSync(file).size } catch { response.writeHead(404); return response.end('Not Found') }
  response.writeHead(200, { 'content-length': size })
  const stream = createReadStream(file, { highWaterMark: 256 * 1024 })
  if (!slowVariants.has(variant) || !file.endsWith('.tar.gz')) return stream.pipe(response)
  const delay = Math.round((256 * 1024 / Number(rate)) * 1000)
  stream.on('data', (chunk) => { stream.pause(); response.write(chunk); setTimeout(() => stream.resume(), delay) })
  stream.on('end', () => response.end())
}).listen(Number(port), '127.0.0.1', () => console.log(`release source on 127.0.0.1:${port} serving ${dir}`))
