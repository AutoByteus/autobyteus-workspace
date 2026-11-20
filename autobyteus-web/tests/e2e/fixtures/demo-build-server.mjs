// Serves the demo build (`build:mobile-web --demo` → dist-mobile-demo/public) for the demo probes (autobyteus-279), as the
// iOS app's scheme handler serves it: the file at the path with its MIME type, or 200.html for a path with no file (the
// SPA fallback). Loopback only; it answers nothing else (the demo has no network).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

/** Starts the server on 127.0.0.1 and an ephemeral port; returns its base URL and a close function. */
export const startDemoBuildServer = async (root) => {
  const absoluteRoot = path.resolve(root);
  const fileFor = async (pathname) => {
    const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
    const candidate = path.join(absoluteRoot, relative);
    if (!candidate.startsWith(absoluteRoot)) return null;
    try { if ((await stat(candidate)).isFile()) return candidate; } catch { /* not a file */ }
    return null;
  };
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const file = (await fileFor(url.pathname)) ?? path.join(absoluteRoot, url.pathname === '/' ? 'index.html' : '200.html');
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
};
