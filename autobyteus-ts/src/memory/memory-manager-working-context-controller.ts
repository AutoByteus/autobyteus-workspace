import { Message, MessageRole } from '../llm/utils/messages.js';
import { WorkingContextSnapshotStore } from './store/working-context-snapshot-store.js';
import { WorkingContextSnapshotSerializer } from './working-context-snapshot-serializer.js';
import {
  buildSingleMessageProvenance,
  setWorkingContextMessageProvenance,
} from './working-context-provenance.js';
import {
  createNaturalUserMessageProvenance,
  WorkingContextFinalizer,
} from './working-context-finalizer.js';
import { WorkingContext } from './working-context.js';

export type WorkingContextAppendOptions = {
  turnId?: string | null;
  rawTraceIds?: string[];
  persist?: boolean;
};

export class MemoryManagerWorkingContextController {
  private context: WorkingContext;
  private readonly finalizer = new WorkingContextFinalizer();

  constructor(private readonly options: {
    workingContext?: WorkingContext;
    snapshotStore: WorkingContextSnapshotStore | null;
    fallbackAgentId: string | null;
  }) {
    this.context = options.workingContext?.copy() ?? new WorkingContext();
  }

  getMessages(): Message[] {
    return this.context.buildMessages();
  }

  getContext(): WorkingContext {
    return this.context.copy();
  }

  replace(context: WorkingContext): void {
    this.context = context.copy();
    this.persist();
  }

  install(context: WorkingContext): void {
    this.context = context.copy();
  }

  replaceMessage(index: number, message: Message): void {
    this.context.replaceMessage(index, message);
  }

  append(message: Message, options: WorkingContextAppendOptions = {}): void {
    const copied = new WorkingContext([message]).buildMessages()[0]!;
    if (copied.role === MessageRole.USER) {
      createNaturalUserMessageProvenance(copied, {
        kind: 'current_user',
        rawTraceIds: options.rawTraceIds,
        turnId: options.turnId,
      });
    } else {
      setWorkingContextMessageProvenance(
        copied,
        buildSingleMessageProvenance(options.rawTraceIds, options.turnId ?? null),
      );
    }
    this.context.appendMessage(copied);
    this.context = this.finalizer.finalize({ messages: this.context.buildMessages() });
    if (options.persist !== false) this.persist();
  }

  persist(): void {
    const snapshotStore = this.options.snapshotStore;
    if (!snapshotStore) return;
    const agentId = snapshotStore.agentId || this.options.fallbackAgentId;
    if (!agentId) return;
    snapshotStore.write(agentId, WorkingContextSnapshotSerializer.serialize(this.context, {
      schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
      agent_id: agentId,
    }));
  }
}
