import {
  getApplicationSessionStreamService,
  type ApplicationSessionStreamConnection,
  type ApplicationSessionStreamService,
} from "./application-session-stream-service.js";
import {
  getApplicationSessionService,
  type ApplicationSessionService,
} from "../services/application-session-service.js";

export class ApplicationSessionStreamHandler {
  constructor(
    private readonly dependencies: {
      streamService?: ApplicationSessionStreamService;
      sessionService?: ApplicationSessionService;
    } = {},
  ) {}

  private get streamService(): ApplicationSessionStreamService {
    return this.dependencies.streamService ?? getApplicationSessionStreamService();
  }

  private get sessionService(): ApplicationSessionService {
    return this.dependencies.sessionService ?? getApplicationSessionService();
  }

  async connect(
    connection: ApplicationSessionStreamConnection,
    applicationSessionId: string,
  ): Promise<string> {
    const snapshot = await this.sessionService.getSessionById(applicationSessionId);
    if (!snapshot) {
      connection.close(4004);
      throw new Error(`Application session '${applicationSessionId}' was not found.`);
    }
    return this.streamService.connect(applicationSessionId, connection, snapshot);
  }

  disconnect(connectionId: string): void {
    this.streamService.disconnect(connectionId);
  }
}

let cachedApplicationSessionStreamHandler: ApplicationSessionStreamHandler | null = null;

export const getApplicationSessionStreamHandler = (): ApplicationSessionStreamHandler => {
  if (!cachedApplicationSessionStreamHandler) {
    cachedApplicationSessionStreamHandler = new ApplicationSessionStreamHandler();
  }
  return cachedApplicationSessionStreamHandler;
};
