import fs from 'node:fs/promises';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadApplicationDevkitConfig } from '../config/load-application-devkit-config.js';
import { resolveApplicationProjectPaths } from '../paths/application-project-paths.js';
import { readApplicationSourceManifest } from '../package/package-assembler.js';
import { buildFrontendAssets } from '../package/frontend-builder.js';
import { createDevBootstrapSession, renderDevHostPage, type DevBootstrapSession } from './dev-host-page.js';
import { handleMockBackendRoute } from './mock-backend-routes.js';

export type StartDevBootstrapServerOptions = {
  projectRoot: string;
  port?: number | null;
  applicationId?: string | null;
  backendBaseUrl?: string | null;
  backendNotificationsUrl?: string | null;
  mockBackend?: boolean | null;
};

export type DevBootstrapServerHandle = {
  url: string;
  session: DevBootstrapSession;
  close: () => Promise<void>;
};

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
};


const assertDevTransportOptionsValid = (options: StartDevBootstrapServerOptions): void => {
  const realBackendBaseUrl = normalizeOptionalString(options.backendBaseUrl);
  const realNotificationsUrl = normalizeOptionalString(options.backendNotificationsUrl);
  if (realNotificationsUrl && !realBackendBaseUrl) {
    throw new Error('--backend-notifications-url requires --backend-base-url.');
  }
  if (realBackendBaseUrl && options.mockBackend) {
    throw new Error('--mock-backend cannot be combined with --backend-base-url.');
  }
  if (realBackendBaseUrl && !normalizeOptionalString(options.applicationId)) {
    throw new Error('Real-backend dev mode requires explicit --application-id.');
  }
};

const resolveDevTransport = (input: {
  hostOrigin: string;
  localApplicationId: string;
  applicationId?: string | null;
  backendBaseUrl?: string | null;
  backendNotificationsUrl?: string | null;
  mockBackend?: boolean | null;
}): { applicationId: string; backendBaseUrl: string; backendNotificationsUrl: string | null } => {
  const realBackendBaseUrl = normalizeOptionalString(input.backendBaseUrl);
  const realNotificationsUrl = normalizeOptionalString(input.backendNotificationsUrl);
  if (realNotificationsUrl && !realBackendBaseUrl) {
    throw new Error('--backend-notifications-url requires --backend-base-url.');
  }
  if (realBackendBaseUrl && input.mockBackend) {
    throw new Error('--mock-backend cannot be combined with --backend-base-url.');
  }
  if (realBackendBaseUrl) {
    const applicationId = normalizeOptionalString(input.applicationId);
    if (!applicationId) {
      throw new Error('Real-backend dev mode requires explicit --application-id.');
    }
    return {
      applicationId,
      backendBaseUrl: realBackendBaseUrl,
      backendNotificationsUrl: realNotificationsUrl,
    };
  }
  const applicationId = normalizeOptionalString(input.applicationId) ?? `dev:${input.localApplicationId}`;
  return {
    applicationId,
    backendBaseUrl: `${input.hostOrigin}/mock-backend`,
    backendNotificationsUrl: null,
  };
};

const isPathInside = (rootPath: string, targetPath: string): boolean => {
  const root = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  return target === root || target.startsWith(`${root}${path.sep}`);
};

const serveStaticFile = async (input: {
  response: ServerResponse;
  uiRoot: string;
  requestPath: string;
}): Promise<void> => {
  const relativePath = decodeURIComponent(input.requestPath.replace(/^\/ui\/?/, '')) || 'index.html';
  const filePath = path.resolve(input.uiRoot, relativePath);
  if (!isPathInside(input.uiRoot, filePath)) {
    input.response.writeHead(403);
    input.response.end('Forbidden');
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    input.response.writeHead(200, {
      'content-type': CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    input.response.end(content);
  } catch {
    input.response.writeHead(404);
    input.response.end('Not found');
  }
};

const listen = async (server: http.Server, port: number): Promise<number> => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine dev server address.');
  }
  return address.port;
};

const closeServer = async (server: http.Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
};

export const startDevBootstrapServer = async (
  options: StartDevBootstrapServerOptions,
): Promise<DevBootstrapServerHandle> => {
  assertDevTransportOptionsValid(options);
  const projectRoot = path.resolve(options.projectRoot);
  const loadedConfig = await loadApplicationDevkitConfig(projectRoot);
  const manifest = await readApplicationSourceManifest(projectRoot);
  const paths = resolveApplicationProjectPaths({ projectRoot, config: loadedConfig.config, localApplicationId: manifest.id });
  await buildFrontendAssets({ paths, uiRoot: paths.devUiRoot });

  let session: DevBootstrapSession | null = null;
  const server = http.createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      const requestUrl = new URL(request.url ?? '/', session?.hostOrigin ?? 'http://127.0.0.1');
      if (await handleMockBackendRoute({ request, response, url: requestUrl })) {
        return;
      }
      if (requestUrl.pathname === '/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        response.end(renderDevHostPage(session!));
        return;
      }
      if (requestUrl.pathname.startsWith('/ui/')) {
        await serveStaticFile({ response, uiRoot: paths.devUiRoot, requestPath: requestUrl.pathname });
        return;
      }
      response.writeHead(404);
      response.end('Not found');
    })().catch((error) => {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(error instanceof Error ? error.message : String(error));
    });
  });

  const actualPort = await listen(server, options.port ?? loadedConfig.config.dev.port);
  const hostOrigin = `http://127.0.0.1:${actualPort}`;
  const transport = resolveDevTransport({
    hostOrigin,
    localApplicationId: manifest.id,
    applicationId: options.applicationId,
    backendBaseUrl: options.backendBaseUrl,
    backendNotificationsUrl: options.backendNotificationsUrl,
    mockBackend: options.mockBackend,
  });
  session = createDevBootstrapSession({
    hostOrigin,
    iframeLaunchId: `${transport.applicationId}::${randomUUID()}`,
    localApplicationId: manifest.id,
    applicationId: transport.applicationId,
    applicationName: manifest.name,
    backendBaseUrl: transport.backendBaseUrl,
    backendNotificationsUrl: transport.backendNotificationsUrl,
    entryHtml: loadedConfig.config.frontend.entryHtml,
  });

  return {
    url: `${hostOrigin}/`,
    session,
    close: () => closeServer(server),
  };
};
