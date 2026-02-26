import type { ExternalDeliveryEvent } from "autobyteus-ts/external-channel/external-delivery-event.js";
import type { AutobyteusServerClient } from "../../infrastructure/server-api/autobyteus-server-client.js";

export class DeliveryStatusService {
  private readonly serverClient: Pick<AutobyteusServerClient, "postDeliveryEvent">;
  private readonly events: ExternalDeliveryEvent[] = [];

  constructor(serverClient: Pick<AutobyteusServerClient, "postDeliveryEvent">) {
    this.serverClient = serverClient;
  }

  async record(event: ExternalDeliveryEvent): Promise<void> {
    this.events.push(event);
  }

  async publishToServer(event: ExternalDeliveryEvent): Promise<void> {
    await this.serverClient.postDeliveryEvent(event);
  }

  getRecordedEvents(): ExternalDeliveryEvent[] {
    return [...this.events];
  }
}
