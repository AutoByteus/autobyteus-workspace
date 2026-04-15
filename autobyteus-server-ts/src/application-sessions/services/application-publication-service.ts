import { randomUUID } from "node:crypto";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import {
  getApplicationSessionStreamService,
  type ApplicationSessionStreamService,
} from "../streaming/application-session-stream-service.js";
import type {
  ApplicationNormalizedPublicationPayload,
  ApplicationProducerProvenance,
  ApplicationSessionSnapshot,
  PublishArtifactInputV1,
} from "../domain/models.js";
import { ApplicationPublicationProjector } from "./application-publication-projector.js";
import { normalizeArtifactPublication } from "./application-publication-validator.js";
import { deriveApplicationProducerProvenance } from "../utils/application-producer-provenance.js";
import { ApplicationSessionStateStore } from "../stores/application-session-state-store.js";
import { ApplicationPublicationJournalStore } from "../stores/application-publication-journal-store.js";
import {
  ApplicationPublicationDispatchService,
  getApplicationPublicationDispatchService,
} from "./application-publication-dispatch-service.js";

const PLATFORM_SESSION_PRODUCER = {
  memberRouteKey: "__autobyteus_session__",
  memberName: "AutoByteus Platform",
  role: "platform",
} as const;

const toNormalizedProducer = (producer: ApplicationProducerProvenance) => ({
  memberRouteKey: producer.memberRouteKey,
  memberName: producer.displayName,
  role: producer.runtimeKind,
});

export class ApplicationPublicationService {
  constructor(
    private readonly dependencies: {
      sessionStateStore?: ApplicationSessionStateStore;
      platformStateStore?: ApplicationPlatformStateStore;
      journalStore?: ApplicationPublicationJournalStore;
      dispatchService?: ApplicationPublicationDispatchService;
      streamService?: ApplicationSessionStreamService;
      projector?: ApplicationPublicationProjector;
    } = {},
  ) {}

  private get sessionStateStore(): ApplicationSessionStateStore {
    return this.dependencies.sessionStateStore ?? new ApplicationSessionStateStore();
  }

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore ?? new ApplicationPlatformStateStore();
  }

  private get journalStore(): ApplicationPublicationJournalStore {
    return this.dependencies.journalStore ?? new ApplicationPublicationJournalStore();
  }

  private get dispatchService(): ApplicationPublicationDispatchService {
    return this.dependencies.dispatchService ?? getApplicationPublicationDispatchService();
  }

  private get streamService(): ApplicationSessionStreamService {
    return this.dependencies.streamService ?? getApplicationSessionStreamService();
  }

  private get projector(): ApplicationPublicationProjector {
    return this.dependencies.projector ?? new ApplicationPublicationProjector();
  }

  async appendRuntimePublication(input: {
    runId: string;
    customData?: Record<string, unknown> | null;
    publication: unknown;
  }): Promise<ApplicationSessionSnapshot> {
    const { applicationSessionId, applicationId, producer } = deriveApplicationProducerProvenance({
      runId: input.runId,
      customData: input.customData ?? {},
    });
    const publication = await normalizeArtifactPublication({
      publication: input.publication,
      applicationId,
    });

    return this.appendPromotedPublication({
      applicationId,
      applicationSessionId,
      publication,
      producer,
    });
  }

  async recordSessionStarted(snapshot: ApplicationSessionSnapshot): Promise<void> {
    await this.appendLifecycleEvent(snapshot, "SESSION_STARTED", {
      session: {
        createdAt: snapshot.createdAt,
        runtime: snapshot.runtime,
      },
    });
  }

  async recordSessionTerminated(snapshot: ApplicationSessionSnapshot): Promise<void> {
    if (!snapshot.terminatedAt) {
      return;
    }
    await this.appendLifecycleEvent(snapshot, "SESSION_TERMINATED", {
      session: {
        terminatedAt: snapshot.terminatedAt,
        runtime: snapshot.runtime,
      },
    });
  }

  private async appendPromotedPublication(input: {
    applicationId: string;
    applicationSessionId: string;
    publication: PublishArtifactInputV1;
    producer: ApplicationProducerProvenance;
  }): Promise<ApplicationSessionSnapshot> {
    const publishedAt = new Date().toISOString();
    const nextSnapshot = await this.platformStateStore.withTransaction(input.applicationId, (db) => {
      const currentSnapshot = this.sessionStateStore.readSessionSnapshot(db, input.applicationSessionId);
      if (!currentSnapshot || currentSnapshot.terminatedAt !== null) {
        throw new Error(`Application session '${input.applicationSessionId}' is not live.`);
      }
      const projectedSnapshot = this.projector.project(
        currentSnapshot,
        input.publication,
        input.producer,
        publishedAt,
      );
      this.sessionStateStore.writeSessionSnapshot(db, projectedSnapshot, "live", 1);
      this.journalStore.appendNormalizedEvent(db, {
        eventId: randomUUID(),
        applicationId: input.applicationId,
        applicationSessionId: input.applicationSessionId,
        family: "ARTIFACT",
        publishedAt,
        producer: toNormalizedProducer(input.producer),
        payload: input.publication,
      });
      return projectedSnapshot;
    });

    this.streamService.publish(nextSnapshot);
    this.dispatchService.schedule(input.applicationId);
    return structuredClone(nextSnapshot);
  }

  private async appendLifecycleEvent(
    snapshot: ApplicationSessionSnapshot,
    family: "SESSION_STARTED" | "SESSION_TERMINATED",
    payload: ApplicationNormalizedPublicationPayload,
  ): Promise<void> {
    await this.platformStateStore.withTransaction(snapshot.application.applicationId, (db) => {
      this.journalStore.appendNormalizedEvent(db, {
        eventId: randomUUID(),
        applicationId: snapshot.application.applicationId,
        applicationSessionId: snapshot.applicationSessionId,
        family,
        publishedAt: new Date().toISOString(),
        producer: PLATFORM_SESSION_PRODUCER,
        payload,
      });
    });
    this.dispatchService.schedule(snapshot.application.applicationId);
  }
}
