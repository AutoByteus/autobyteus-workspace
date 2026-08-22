import type { ApplicationEngineController } from "../../application-engine/services/application-engine-controller.js";
import type { ApplicationEngineLauncher } from "../../application-engine/services/application-engine-launcher.js";
import type {
  ApplicationPublishedArtifactDeliveryLease,
  ApplicationPublishedArtifactDeliveryQueue,
} from "./application-published-artifact-delivery-queue.js";

export class ApplicationPublishedArtifactDeliveryService {
  private readonly consumerPromise: Promise<void>;

  constructor(private readonly dependencies: {
    queue: ApplicationPublishedArtifactDeliveryQueue;
    launcher: Pick<ApplicationEngineLauncher, "ensureReady">;
    controller: Pick<ApplicationEngineController, "invokeApplicationArtifactHandler">;
  }) {
    this.consumerPromise = this.consume();
  }

  stopAccepting(): void {
    this.dependencies.queue.stopAccepting();
  }

  async awaitDrained(): Promise<void> {
    await this.dependencies.queue.awaitDrained();
    await this.consumerPromise;
  }

  private async consume(): Promise<void> {
    while (true) {
      const lease = await this.dependencies.queue.take();
      if (!lease) {
        return;
      }
      void this.deliver(lease);
    }
  }

  private async deliver(
    lease: ApplicationPublishedArtifactDeliveryLease,
  ): Promise<void> {
    try {
      await this.dependencies.launcher.ensureReady(lease.command.applicationId);
      await this.dependencies.controller.invokeApplicationArtifactHandler(
        lease.command.applicationId,
        { event: lease.command.event },
      );
      lease.complete();
    } catch (error) {
      lease.fail(error);
    }
  }
}
