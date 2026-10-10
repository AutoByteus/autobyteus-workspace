import { createHash } from 'node:crypto';
import { MessageRole } from '../../llm/utils/messages.js';
import { messageWithoutPrefixBoundReasoning } from '../../llm/provider-native/provider-native-history.js';
import { createCompactedMemoryUserMessage, WorkingContextFinalizer } from '../working-context-finalizer.js';
import type { WorkingContext } from '../working-context.js';
import type { AcceptedWorkingContextCompaction, WorkingContextCompactionProposal } from './working-context-compaction-proposal.js';
import { estimateMessagesTokens } from './message-budget-strategy.js';

export const workingContextFingerprint = (context: WorkingContext): string =>
  createHash('sha256').update(JSON.stringify(context.buildMessages().map((message) => message.toDict())), 'utf8').digest('hex');

export class AcceptedCompactionBuilder {
  constructor(private readonly finalizer = new WorkingContextFinalizer()) {}

  build(input: { compactionId: string; baseline: WorkingContext; proposal: WorkingContextCompactionProposal }): AcceptedWorkingContextCompaction {
    const { compactionId, proposal } = input;
    if (!compactionId.trim() || !proposal.summary.trim()) throw new Error('Compaction ID and summary must be non-empty.');
    const selected = proposal.selectedNewRawTraceIds;
    if (!selected.length || selected.some((id) => !id.trim() || id !== id.trim()) || new Set(selected).size !== selected.length) {
      throw new Error('Accepted compaction requires unique non-empty selected raw-trace IDs.');
    }
    const finalizedContext = this.finalizer.finalize({ messages: [
      ...input.baseline.buildMessages().filter((message) => message.role === MessageRole.SYSTEM),
      createCompactedMemoryUserMessage(proposal.summary),
      ...this.finalizer.markNaturalUserMessagesRetained(proposal.retainedMessages).map(messageWithoutPrefixBoundReasoning),
    ] });
    return {
      compactionId, baselineFingerprint: workingContextFingerprint(input.baseline),
      selectedNewRawTraceIds: [...selected], finalizedContext,
      budgetAssessment: { ...proposal.budgetAssessment,
        estimatedFinalizedContextTokens: estimateMessagesTokens(finalizedContext.buildMessages()) },
    };
  }
}
