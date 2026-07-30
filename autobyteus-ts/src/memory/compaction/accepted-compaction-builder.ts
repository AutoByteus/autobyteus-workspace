import { createHash } from 'node:crypto';

import { MessageRole } from '../../llm/utils/messages.js';
import type { CompactionLineageScope } from '../lineage/compaction-lineage-scope.js';
import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import { CompactedMemoryMessageBuilder } from '../projection/compacted-memory-message-builder.js';
import type { MemoryStore } from '../store/base-store.js';
import {
  createCompactedMemoryUserMessage,
  WorkingContextFinalizer,
} from '../working-context-finalizer.js';
import type { WorkingContext } from '../working-context.js';
import type {
  AcceptedWorkingContextCompaction,
  WorkingContextCompactionProposal,
} from './working-context-compaction-proposal.js';

export type AcceptedCompactionBuildInput = {
  compactionId: string;
  expectedPreviousCompactionId: string | null;
  baseline: WorkingContext;
  proposal: WorkingContextCompactionProposal;
};

export const workingContextFingerprint = (context: WorkingContext): string =>
  createHash('sha256')
    .update(JSON.stringify(context.buildMessages().map((message) => message.toDict())), 'utf8')
    .digest('hex');

const artifactId = (prefix: 'ep' | 'sem', compactionId: string, ordinal: number): string =>
  `${prefix}_${createHash('sha256').update(compactionId).digest('hex').slice(0, 24)}_${ordinal + 1}`;

const requiredExecutionText = (value: string | null | undefined, name: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Accepted compaction requires ${name}.`);
  return normalized;
};

export class AcceptedCompactionBuilder {
  constructor(
    private readonly store: MemoryStore,
    private readonly scope: CompactionLineageScope,
    private readonly memoryMessageBuilder = new CompactedMemoryMessageBuilder(),
    private readonly finalizer = new WorkingContextFinalizer(),
  ) {}

  build(input: AcceptedCompactionBuildInput): AcceptedWorkingContextCompaction {
    const { compactionId, proposal } = input;
    if (!compactionId.trim()) throw new Error('Compaction ID must be non-empty.');
    if (proposal.output.episodes.length < 1 || proposal.output.episodes.length > 3) {
      throw new Error('Accepted compaction requires one through three episodes.');
    }
    if (proposal.output.semanticEntries.length > 20) {
      throw new Error('Accepted compaction allows at most twenty semantic facts.');
    }
    const selected = proposal.selectedNewRawTraceIds.map((id) => id.trim()).filter(Boolean);
    if (!selected.length || new Set(selected).size !== selected.length) {
      throw new Error('Accepted compaction requires unique selected new raw-trace IDs.');
    }

    const now = new Date();
    const ts = now.getTime() / 1000;
    const episodicItems = proposal.output.episodes.map((episode, index) => new EpisodicItem({
      id: artifactId('ep', compactionId, index),
      ts,
      summary: episode.summary,
    }));
    const semanticItems = proposal.output.semanticEntries.map((entry, index) => new SemanticItem({
      id: artifactId('sem', compactionId, index),
      ts,
      category: entry.category,
      fact: entry.fact,
      salience: entry.salience,
    }));
    if (this.store.hasMemoryArtifactIds({
      episodeIds: episodicItems.map(({ id }) => id),
      semanticIds: semanticItems.map(({ id }) => id),
    })) {
      throw new Error('Deterministic compaction artifact IDs already exist.');
    }
    const bundle = {
      episodes: episodicItems,
      semantics: semanticItems,
    };
    const memoryContent = this.memoryMessageBuilder.build(bundle);
    if (!memoryContent) throw new Error('Accepted compaction rendered no memory content.');
    const finalizedContext = this.finalizer.finalize({
      messages: [
        ...input.baseline.buildMessages().filter(
        (message) => message.role === MessageRole.SYSTEM,
        ),
        createCompactedMemoryUserMessage(memoryContent),
        ...this.finalizer.markNaturalUserMessagesRetained(proposal.retainedMessages),
      ],
    });
    const derivedAt = now.toISOString();
    return {
      compactionId,
      baselineFingerprint: workingContextFingerprint(input.baseline),
      expectedPreviousCompactionId: input.expectedPreviousCompactionId,
      selectedNewRawTraceIds: selected,
      episodicItems,
      semanticItems,
      lineageDraft: {
        schemaVersion: 1,
        scope: this.scope,
        compactionId,
        previousCompactionId: input.expectedPreviousCompactionId,
        episodeIds: episodicItems.map(({ id }) => id),
        semanticIds: semanticItems.map(({ id }) => id),
        derivedAt,
        execution: {
          runtimeKind: requiredExecutionText(proposal.execution.runtimeKind, 'runtime kind'),
          provider: requiredExecutionText(proposal.execution.provider, 'provider'),
          model: requiredExecutionText(proposal.execution.modelIdentifier, 'model identifier'),
          selectionPolicyVersion: 1,
          promptContractVersion: 1,
          ...(proposal.execution.renderedInputSha256
            ? { renderedInputSha256: proposal.execution.renderedInputSha256 }
            : {}),
        },
      },
      finalizedContext,
    };
  }
}
