export class DeliveryStatusService {
    serverClient;
    events = [];
    constructor(serverClient) {
        this.serverClient = serverClient;
    }
    async record(event) {
        this.events.push(event);
    }
    async publishToServer(event) {
        await this.serverClient.postDeliveryEvent(event);
    }
    getRecordedEvents() {
        return [...this.events];
    }
}
//# sourceMappingURL=delivery-status-service.js.map