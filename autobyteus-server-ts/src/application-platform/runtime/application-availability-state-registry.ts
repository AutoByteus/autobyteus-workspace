import type {
  ApplicationAvailabilityRecord,
  ApplicationAvailabilityState,
} from "../../application-orchestration/services/application-availability-service.js";

export type ApplicationAvailabilityReader = {
  getAvailability: (applicationId: string) => ApplicationAvailabilityRecord | null;
  isApplicationActive: (applicationId: string) => boolean;
};

export type ApplicationAvailabilityWriter = {
  setAvailability: (
    applicationId: string,
    state: ApplicationAvailabilityState,
    detail: string | null,
    updatedAt?: string,
  ) => ApplicationAvailabilityRecord;
  replaceAll: (records: Iterable<ApplicationAvailabilityRecord>) => void;
};

export class ApplicationAvailabilityStateRegistry {
  private readonly records = new Map<string, ApplicationAvailabilityRecord>();

  readonly reader: ApplicationAvailabilityReader = Object.freeze({
    getAvailability: (applicationId: string) => this.getAvailability(applicationId),
    isApplicationActive: (applicationId: string) =>
      this.records.get(applicationId)?.state === "ACTIVE",
  });

  readonly writer: ApplicationAvailabilityWriter = Object.freeze({
    setAvailability: (
      applicationId: string,
      state: ApplicationAvailabilityState,
      detail: string | null,
      updatedAt?: string,
    ) => this.setAvailability(applicationId, state, detail, updatedAt),
    replaceAll: (records: Iterable<ApplicationAvailabilityRecord>) =>
      this.replaceAll(records),
  });

  getAvailability(applicationId: string): ApplicationAvailabilityRecord | null {
    const record = this.records.get(applicationId);
    return record ? { ...record } : null;
  }

  entries(): Array<[string, ApplicationAvailabilityRecord]> {
    return Array.from(this.records.entries(), ([applicationId, record]) => [
      applicationId,
      { ...record },
    ]);
  }

  setAvailability(
    applicationId: string,
    state: ApplicationAvailabilityState,
    detail: string | null,
    updatedAt = new Date().toISOString(),
  ): ApplicationAvailabilityRecord {
    const record = { applicationId, state, detail, updatedAt };
    this.records.set(applicationId, record);
    return { ...record };
  }

  replaceAll(records: Iterable<ApplicationAvailabilityRecord>): void {
    this.records.clear();
    for (const record of records) {
      this.records.set(record.applicationId, { ...record });
    }
  }
}
