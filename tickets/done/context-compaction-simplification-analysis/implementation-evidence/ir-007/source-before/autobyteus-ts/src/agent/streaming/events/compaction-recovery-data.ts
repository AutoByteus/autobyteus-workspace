import type { CompactionRecoveryBlock, CompactionRecoveryIdentity } from '../../../memory/compaction/compaction-recovery.js';
import { BaseStreamPayload } from './stream-event-payload-utils.js';
export type CompactionRecoveryDataInput = { block: CompactionRecoveryIdentity; recovery: CompactionRecoveryBlock | null };
export class CompactionRecoveryData extends BaseStreamPayload {
  block: CompactionRecoveryIdentity;
  recovery: CompactionRecoveryBlock | null;
  constructor(data: CompactionRecoveryDataInput) {
    super(data); this.block = { ...data.block };
    this.recovery = data.recovery ? { ...data.recovery, position: { ...data.recovery.position } } : null;
  }
}
