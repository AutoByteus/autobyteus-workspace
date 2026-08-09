import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export type MediaOperationLeaseState = 'active' | 'revoked' | 'published' | 'abandoned';

export class MediaOperationLease {
  readonly token = crypto.randomUUID();
  readonly stagingPath: string;
  state: MediaOperationLeaseState = 'active';

  constructor(
    readonly turnId: string | null,
    readonly toolInvocationId: string | null,
    readonly finalPath: string,
    readonly deadlineAt: number,
  ) {
    this.stagingPath = path.join(
      path.dirname(finalPath),
      `.${path.basename(finalPath)}.${this.token}.staging`,
    );
  }

  revoke(): void {
    if (this.state === 'active') this.state = 'revoked';
  }

  canPublish(currentOwner: MediaOperationLease | undefined): boolean {
    return this.state === 'active' && currentOwner?.token === this.token;
  }

  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.stagingPath, { force: true });
    } catch {
      this.state = 'abandoned';
    }
  }
}
