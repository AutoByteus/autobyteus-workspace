import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { randomBytes } from 'crypto'
import type { AddressInfo } from 'net'
import {
  CapturePreviewScreenshotRequest,
  ClosePreviewRequest,
  ExecutePreviewJavascriptRequest,
  GetPreviewConsoleLogsRequest,
  NavigatePreviewRequest,
  OpenPreviewDevToolsRequest,
  OpenPreviewRequest,
  PreviewSessionError,
  PreviewSessionManager,
} from './preview-session-manager'
import { logger } from '../logger'

export const PREVIEW_BRIDGE_BASE_URL_ENV = 'AUTOBYTEUS_PREVIEW_BRIDGE_BASE_URL'
export const PREVIEW_BRIDGE_TOKEN_ENV = 'AUTOBYTEUS_PREVIEW_BRIDGE_TOKEN'

export type PreviewBridgeRuntimeEnv = {
  [PREVIEW_BRIDGE_BASE_URL_ENV]: string
  [PREVIEW_BRIDGE_TOKEN_ENV]: string
}

type PreviewBridgeSuccessResponse = {
  ok: true
  result: unknown
}

type PreviewBridgeErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
  }
}

const MAX_BODY_BYTES = 1024 * 1024
const AUTH_HEADER_NAME = 'x-autobyteus-preview-token'

export class PreviewBridgeServer {
  private server: Server | null = null
  private runtimeEnv: PreviewBridgeRuntimeEnv | null = null
  private authToken: string | null = null

  constructor(private readonly previewSessionManager: PreviewSessionManager) {}

  async start(): Promise<PreviewBridgeRuntimeEnv> {
    if (this.runtimeEnv) {
      return this.runtimeEnv
    }

    const token = randomBytes(24).toString('hex')
    const server = createServer((request, response) => {
      void this.handleRequest(request, response)
    })

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
      server.close()
      throw new Error('Preview bridge did not expose an address.')
    }

    this.server = server
    this.authToken = token
    this.runtimeEnv = {
      [PREVIEW_BRIDGE_BASE_URL_ENV]: `http://127.0.0.1:${(address as AddressInfo).port}`,
      [PREVIEW_BRIDGE_TOKEN_ENV]: token,
    }
    logger.info(`Preview bridge started on ${this.runtimeEnv[PREVIEW_BRIDGE_BASE_URL_ENV]}`)
    return this.runtimeEnv
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = null
    this.runtimeEnv = null
    this.authToken = null

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
            code: 'preview_bridge_unavailable',
            message: 'Preview bridge authorization failed.',
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
            code: 'preview_bridge_unavailable',
            message: `Unsupported preview bridge method '${request.method ?? 'UNKNOWN'}'.`,
          },
        })
        return
      }

      const body = await this.readJsonBody(request)

      switch (requestUrl.pathname) {
        case '/preview/open':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.previewSessionManager.openSession(body as OpenPreviewRequest),
          })
          return
        case '/preview/navigate':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.previewSessionManager.navigateSession(body as NavigatePreviewRequest),
          })
          return
        case '/preview/screenshot':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.previewSessionManager.captureScreenshot(
              body as CapturePreviewScreenshotRequest,
            ),
          })
          return
        case '/preview/console-logs':
          this.writeJson(response, 200, {
            ok: true,
            result: this.previewSessionManager.getConsoleLogs(body as GetPreviewConsoleLogsRequest),
          })
          return
        case '/preview/javascript':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.previewSessionManager.executeJavascript(
              body as ExecutePreviewJavascriptRequest,
            ),
          })
          return
        case '/preview/devtools':
          this.writeJson(response, 200, {
            ok: true,
            result: this.previewSessionManager.openDevTools(body as OpenPreviewDevToolsRequest),
          })
          return
        case '/preview/close':
          this.writeJson(response, 200, {
            ok: true,
            result: await this.previewSessionManager.closeSession(body as ClosePreviewRequest),
          })
          return
        default:
          this.writeJson(response, 404, {
            ok: false,
            error: {
              code: 'preview_bridge_unavailable',
              message: `Unknown preview bridge route '${requestUrl.pathname}'.`,
            },
          })
      }
    } catch (error) {
      const previewError =
        error instanceof PreviewSessionError
          ? error
          : new PreviewSessionError(
              'preview_navigation_failed',
              error instanceof Error ? error.message : String(error),
            )

      this.writeJson(response, 400, {
        ok: false,
        error: {
          code: previewError.code,
          message: previewError.message,
        },
      })
    }
  }

  private isAuthorized(request: IncomingMessage): boolean {
    const expectedToken = this.authToken
    if (!expectedToken) {
      return false
    }

    const providedToken = request.headers[AUTH_HEADER_NAME]
    return typeof providedToken === 'string' && providedToken === expectedToken
  }

  private async readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = []
    let totalBytes = 0

    for await (const chunk of request) {
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      totalBytes += bufferChunk.length
      if (totalBytes > MAX_BODY_BYTES) {
        throw new Error('Preview bridge request body exceeded the maximum allowed size.')
      }
      chunks.push(bufferChunk)
    }

    if (chunks.length === 0) {
      return {}
    }

    const rawBody = Buffer.concat(chunks).toString('utf8')
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Preview bridge request body must be a JSON object.')
    }
    return parsed as Record<string, unknown>
  }

  private writeJson(
    response: ServerResponse,
    statusCode: number,
    payload: PreviewBridgeSuccessResponse | PreviewBridgeErrorResponse,
  ): void {
    response.statusCode = statusCode
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(payload))
  }
}
