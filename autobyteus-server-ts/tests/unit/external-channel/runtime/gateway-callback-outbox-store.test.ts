import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FileGatewayCallbackOutboxStore,
  type GatewayCallbackOutboxRecord,
} from "../../../../src/external-channel/runtime/gateway-callback-outbox-store.js";

const createEnvelope = () => ({
  provider: "WHATSAPP",
  transport: "PERSONAL_SESSION",
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  correlationMessageId: "message-1",
  callbackIdempotencyKey: "cb-1",
  replyText: "hello",
  attachments: [],
  chunks: [],
  metadata: {},
});

const tempDirs: string[] = [];

describe("FileGatewayCallbackOutboxStore", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) =>
        fs.rm(dir, { recursive: true, force: true }),
      ),
    );
  });

  it("deduplicates callback keys and retries leased work after the next attempt time", async () => {
    const store = new FileGatewayCallbackOutboxStore(await createStorePath());

    const first = await store.enqueueOrGet({
      callbackIdempotencyKey: "cb-1",
      payload: createEnvelope() as any,
      createdAt: "2026-03-10T10:00:00.000Z",
    });
    const duplicate = await store.enqueueOrGet({
      callbackIdempotencyKey: "cb-1",
      payload: createEnvelope() as any,
      createdAt: "2026-03-10T10:00:01.000Z",
    });

    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.record.id).toBe(first.record.id);

    const [leased] = await store.leaseBatch({
      limit: 1,
      nowIso: "2026-03-10T10:00:02.000Z",
      leaseDurationMs: 10_000,
    });

    expect(leased?.status).toBe("DISPATCHING");

    const retried = await store.markRetry(leased.id, requireLeaseToken(leased), {
      nextAttemptAt: "2026-03-10T10:00:05.000Z",
      lastError: "gateway unavailable",
      updatedAt: "2026-03-10T10:00:03.000Z",
    });

    expect(retried.status).toBe("FAILED_RETRY");
    expect(retried.attemptCount).toBe(1);

    const tooSoon = await store.leaseBatch({
      limit: 1,
      nowIso: "2026-03-10T10:00:04.000Z",
      leaseDurationMs: 10_000,
    });
    expect(tooSoon).toEqual([]);

    const retriedLease = await store.leaseBatch({
      limit: 1,
      nowIso: "2026-03-10T10:00:06.000Z",
      leaseDurationMs: 10_000,
    });
    expect(retriedLease).toHaveLength(1);
    expect(retriedLease[0]?.id).toBe(first.record.id);
    expect(retriedLease[0]?.status).toBe("DISPATCHING");
  });

  it("releases expired leases back to dispatchable state", async () => {
    const store = new FileGatewayCallbackOutboxStore(await createStorePath());
    await store.enqueueOrGet({
      callbackIdempotencyKey: "cb-1",
      payload: createEnvelope() as any,
      createdAt: "2026-03-10T10:00:00.000Z",
    });

    const [leased] = await store.leaseBatch({
      limit: 1,
      nowIso: "2026-03-10T10:00:01.000Z",
      leaseDurationMs: 1_000,
    });
    expect(leased?.status).toBe("DISPATCHING");

    const recovered = await store.leaseBatch({
      limit: 1,
      nowIso: "2026-03-10T10:00:03.000Z",
      leaseDurationMs: 1_000,
    });
    expect(recovered).toHaveLength(1);
    expect(recovered[0]?.id).toBe(leased.id);
  });
});

const createStorePath = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-callback-outbox-"));
  tempDirs.push(dir);
  return path.join(dir, "gateway-callback-outbox.json");
};

const requireLeaseToken = (record: GatewayCallbackOutboxRecord): string => {
  if (!record.leaseToken) {
    throw new Error("expected leased record to contain a lease token");
  }
  return record.leaseToken;
};
