import type { ExternalDeliveryEvent } from "autobyteus-ts/external-channel/external-delivery-event.js";
import type { AutobyteusServerClient } from "../../infrastructure/server-api/autobyteus-server-client.js";
export declare class DeliveryStatusService {
    private readonly serverClient;
    private readonly events;
    constructor(serverClient: Pick<AutobyteusServerClient, "postDeliveryEvent">);
    record(event: ExternalDeliveryEvent): Promise<void>;
    publishToServer(event: ExternalDeliveryEvent): Promise<void>;
    getRecordedEvents(): ExternalDeliveryEvent[];
}
//# sourceMappingURL=delivery-status-service.d.ts.map