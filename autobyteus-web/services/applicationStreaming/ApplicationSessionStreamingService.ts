import {
  ConnectionState,
  WebSocketClient,
  type IWebSocketClient,
} from '~/services/agentStreaming/transport'
import type { ApplicationSessionSnapshot } from '~/types/application/ApplicationSession'

export type ApplicationSessionStreamMessage =
  | { type: 'connected'; applicationSessionId: string }
  | { type: 'snapshot'; session: ApplicationSessionSnapshot }

export interface ApplicationSessionStreamingServiceOptions {
  wsClient?: IWebSocketClient
}

export class ApplicationSessionStreamingService {
  private readonly wsClient: IWebSocketClient
  private listener: ((session: ApplicationSessionSnapshot) => void) | null = null

  constructor(
    private readonly wsEndpoint: string,
    options: ApplicationSessionStreamingServiceOptions = {},
  ) {
    this.wsClient = options.wsClient || new WebSocketClient()
  }

  get connectionState(): ConnectionState {
    return this.wsClient.state
  }

  connect(
    applicationSessionId: string,
    listener: (session: ApplicationSessionSnapshot) => void,
  ): void {
    this.disconnect()
    this.listener = listener
    this.wsClient.on('onMessage', this.handleMessage)
    this.wsClient.connect(`${this.wsEndpoint}/${encodeURIComponent(applicationSessionId)}`)
  }

  disconnect(): void {
    this.wsClient.off('onMessage', this.handleMessage)
    this.wsClient.disconnect()
    this.listener = null
  }

  private handleMessage = (raw: string): void => {
    if (!this.listener) {
      return
    }

    try {
      const message = JSON.parse(raw) as ApplicationSessionStreamMessage
      if (message.type === 'snapshot' && message.session) {
        this.listener(message.session)
      }
    } catch (error) {
      console.error('Failed to parse application session stream message:', error)
    }
  }
}
