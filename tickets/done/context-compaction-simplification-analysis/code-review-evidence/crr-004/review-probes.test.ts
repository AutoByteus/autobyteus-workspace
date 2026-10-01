
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { Message, MessageRole } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/llm/utils/messages.js';
import { createCompactedMemoryUserMessage } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/memory/working-context-finalizer.js';
import { WorkingContextCompactionPromptBuilder } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.js';
import { COMPACTION_SUMMARY_PROMPT } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/memory/compaction/compaction-summary-prompt.js';
import { assertNoInventedPlanChanges } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/test-support/live-e2e/compaction-quality-checks.js';

const observations = JSON.parse(readFileSync('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-002/semantic-final-observations.json', 'utf8'));
const first = observations.find((v: any) => v.event === 'semantic_first');
const repeated = observations.find((v: any) => v.event === 'semantic_repeated');
const unit = (id: string, message: Message, kind: 'message' | 'compacted_memory') => ({
  id, kind, startIndex: 0, endIndex: 0, rawTraceIds: [], messages: [message],
});
describe('CRR-004 retained-output and current renderer checks; no provider', () => {
  it('renders the actual first summary and requested correction unchanged without adding a performed action', () => {
    const rendered = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([
      unit('summary', createCompactedMemoryUserMessage(first.summary), 'compacted_memory'),
      unit('correction', new Message(MessageRole.USER, { content: repeated.correction }), 'message'),
    ]);
    expect(rendered).toContain(first.summary);
    expect(rendered).toContain(repeated.correction);
    expect(rendered).toContain('The next retained user message was:');
    expect(rendered).not.toContain('Updated plan with retention policy');
    expect(rendered).not.toContain('Checkpoint `APPROVAL-73` added to the plan');
    const approved = readFileSync('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/proposed-compaction-prompt.md', 'utf8');
    expect(COMPACTION_SUMMARY_PROMPT.trim()).toBe(approved.trim());
    expect(COMPACTION_SUMMARY_PROMPT).toContain('Do not turn proposed actions or unrun checks into completed work');
  });
  it('reproduces the fixture alarm on retained real output without altering upstream evidence', () => {
    expect(first.summary).not.toContain('APPROVAL-73');
    expect(repeated.correction).toContain('Add the owner-review checkpoint APPROVAL-73 to the plan');
    expect(repeated.summary).toContain('Updated plan with retention policy (30 days) and checkpoint `APPROVAL-73`.');
    expect(repeated.execution.completionStatus).toBe('complete');
    expect(repeated.execution.completionReason).toBe('stop');
    expect(() => assertNoInventedPlanChanges(repeated.summary)).toThrow('LIVE_E2E_QUALITY_PLANNED_WORK_REPORTED_COMPLETE');
  });
});
