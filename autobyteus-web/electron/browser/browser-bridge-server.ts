import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import type { AddressInfo } from 'net'
import {
  CaptureBrowserScreenshotRequest,
  CloseBrowserRequest,
  ExecuteBrowserJavascriptRequest,
  NavigateBrowserRequest,
  OpenBrowserRequest,
  BrowserDomSnapshotRequest,
  BrowserTabError,
  BrowserTabManager,
  ReadBrowserPageRequest,
} from './browser-tab-manager'
import { logger } from '../logger'
import { BrowserBridgeAuthRegistry } from './browser-bridge-auth-registry'

export const BROWSER_BRIDGE_BASE_URL_ENV = 'AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL'
export const BROWSER_BRIDGE_TOKEN_ENV = 'AUTOBYTEUS_BROWSER_BRIDGE_TOKEN'

export type BrowserBridgeRuntimeEnv = {
  [BROWSER_BRIDGE_BASE_URL_ENV]: string
  [BROWSER_BRIDGE_TOKEN_ENV]: string
}

type BrowserBridgeSuccessResponse = {
  ok: true
  result: unknown
}

type BrowserBridgeErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
  }
}

const MAX_BODY_BYTES = 1024 * 1024
export class BrowserBridgeServer {
  private server: Server | null = null
  private runtimeEnv: BrowserBridgeRuntimeEnv | null = null
  private port: number | null = null

  constructor(
    private readonly browserSessionManager: BrowserTabManager,
    private readonly authRegistry: BrowserBridgeAuthRegistry,
    private readonly bindHost: string = '127.0.0.1',
  ) {}

  async start(): Promise<BrowserBridgeRuntimeEnv> {
    if (this.runtimeEnv) {
      return this.runtimeEnv
    }

    const server = createServer((request, response) => {
      void this.handleRequest(request, response)
    })

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, this.bindHost, () => resolve())
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
      server.close()
      throw new Error('Browser bridge did not expose an address.')
    }

    this.server = server
    this.port = (address as AddressInfo).port
    const authToken = this.authRegistry.issueEmbeddedToken()
    this.runtimeEnv = {
      [BROWSER_BRIDGE_BASE_URL_ENV]: `http://127.0.0.1:${this.port}`,
      [BROWSER_BRIDGE_TOKEN_ENV]: authToken,
    }
    logger.info(`Browser bridge started on ${this.runtimeEnv[BROWSER_BRIDGE_BASE_URL_ENV]}`)
    return this.runtimeEnv
  }

  getRemoteBridgeBaseUrl(advertisedHost: string): string {
    if (!this.port) {
      throw new Error('Browser bridge is not started.')
    }
    return `http://${advertisedHost}:${this.port}`
  }

  isRemoteSharingActive(): boolean {
    return this.bindHost !== '127.0.0.1'
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = null
    this.runtimeEnv = null
    this.port = null
    this.authRegistry.clear()

    if (!server) {
      return
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (!this.isAuthorized(request)) {
        this.writeJson(response, 401, {
          ok: false,
          error: {
            code: 'browser_bridge_unavailable',
            message: 'Browser bridge authorization failed.',
          },
        })
        return
      }

      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (request.method === 'GET' && requestUrl.pathname === '/health') {
        this.writeJson(response, 200, { ok: true, result: { status: 'ok' } })
        return
      }

      if (request.method !== 'POST') {
        this.writeJson(response, 405, {
          ok: false,
          error: {
            code: 'browser_bridge_unavailable',
            message: `Unsupported browser bridge method '${request.method ?? 'UNKNOWN'}'.`,
          },
        })
        return
      }

      const body = await this.readJsonBody(request)

      switch (requestUrl.pathname) {
        case '/browser/open':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.browserSessionManager.openSession(body as OpenBrowserRequest),
          })
          return
        case '/browser/navigate':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.browserSessionManager.navigateSession(body as NavigateBrowserRequest),
          })
          return
        case '/browser/screenshot':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.browserSessionManager.captureScreenshot(
              body as CaptureBrowserScreenshotRequest,
            ),
          })
          return
        case '/browser/list':
          this.writeJson(response, 200, {
            ok: true,
            result: this.browserSessionManager.listSessions(),
          })
          return
        case '/browser/read-page':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.browserSessionManager.readPage(body as ReadBrowserPageRequest),
          })
          return
        case '/browser/javascript':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.browserSessionManager.executeJavascript(
              body as ExecuteBrowserJavascriptRequest,
            ),
          })
          return
        case '/browser/dom-snapshot':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.browserSessionManager.domSnapshot(
              body as BrowserDomSnapshotRequest,
            ),
          })
          return
        case '/browser/close':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.browserSessionManager.closeSession(body as CloseBrowserRequest),
          })
          return
        default:
          this.writeJson(response, 404, {
            ok: false,
            error: {
              code: 'browser_bridge_unavailable',
              message: `Unknown browser bridge route '${requestUrl.pathname}'.`,
            },
          })
      }
    } catch (error) {
      const browserError =
        error instanceof BrowserTabError
          ? error
          : new BrowserTabError(
              'browser_navigation_failed',
              error instanceof Error ? error.message : String(error),
            )

      this.writeJson(response, 400, {
        ok: false,
        error: {
          code: browserError.code,
          message: browserError.message,
        },
      })
    }
  }

  private isAuthorized(request: IncomingMessage): boolean {
    return this.authRegistry.isAuthorized(request.headers)
  }

  private async readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = []
    let totalBytes = 0

    for await (const chunk of request) {
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      totalBytes += bufferChunk.length
      if (totalBytes > MAX_BODY_BYTES) {
        throw new Error('Browser bridge request body exceeded the maximum allowed size.')
      }
      chunks.push(bufferChunk)
    }

    if (chunks.length === 0) {
      return {}
    }

    const rawBody = Buffer.concat(chunks).toString('utf8')
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Browser bridge request body must be a JSON object.')
    }
    return parsed as Record<string, unknown>
  }

  private writeJson(
    response: ServerResponse,
    statusCode: number,
    payload: BrowserBridgeSuccessResponse | BrowserBridgeErrorResponse,
  ): void {
    response.statusCode = statusCode
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(payload))
  }
}
