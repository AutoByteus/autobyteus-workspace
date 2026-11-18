// A local release source like GitHub's, for the step-3 proof: /releases/download/v<version>/<asset>
// from <dir>/v<version>/<asset>, /releases/latest (302 to the newest stable tag given) and
// /releases.atom. Usage: node release-source.mjs <dir> <port> <stable> <feed versions comma-separated>
import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
const [dir, port, stable, feed = ''] = process.argv.slice(2)
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://source')
  console.log(new Date().toISOString(), request.method, url.pathname)
  if (url.pathname === '/releases/latest') {
    response.writeHead(302, { location: `http://source/releases/tag/v${stable}` }); return response.end()
  }
  if (url.pathname === '/releases.atom') {
    response.writeHead(200); return response.end(feed.split(',').filter(Boolean).map((v) => `<link href="https://github.com/o/r/releases/tag/v${v}"/>`).join('\n'))
  }
  const file = path.join(dir, decodeURIComponent(url.pathname.replace(/^\/releases\/download\//, '')))
  try {
    const { size } = statSync(file)
    response.writeHead(200, { 'content-length': size })
    createReadStream(file).pipe(response)
  } catch {
    response.writeHead(404); response.end('Not Found')
  }
}).listen(Number(port), '0.0.0.0', () => console.log(`release source on ${port} serving ${dir}`))
