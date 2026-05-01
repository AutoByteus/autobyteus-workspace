import { describe, expect, it } from 'vitest';
import { CompactionResponseParser } from '../../../src/memory/compaction/compaction-response-parser.js';

describe('CompactionResponseParser', () => {
  it('parses the facts-only compactor output contract', () => {
    const result = new CompactionResponseParser().parse(JSON.stringify({
      episodic_summary: 'Settled work was compacted.',
      critical_issues: [{ fact: 'Build is blocked by a missing dependency.' }],
      unresolved_work: [{ fact: 'Run Codex compactor E2E after code review.' }],
      durable_facts: [{ fact: 'Compactor runs are visible normal agent runs.' }],
      user_preferences: [{ fact: 'User wants compactor prompts to be independently testable.' }],
      important_artifacts: [{ fact: 'Implementation handoff is at tickets/in-progress/agent-based-compaction/implementation-handoff.md.' }],
    }));

    expect(result.episodicSummary).toBe('Settled work was compacted.');
    expect(result.criticalIssues).toEqual([{ fact: 'Build is blocked by a missing dependency.' }]);
    expect(result.unresolvedWork).toEqual([{ fact: 'Run Codex compactor E2E after code review.' }]);
    expect(result.durableFacts).toEqual([{ fact: 'Compactor runs are visible normal agent runs.' }]);
    expect(result.userPreferences).toEqual([{ fact: 'User wants compactor prompts to be independently testable.' }]);
    expect(result.importantArtifacts).toEqual([
      { fact: 'Implementation handoff is at tickets/in-progress/agent-based-compaction/implementation-handoff.md.' },
    ]);
  });

  it('tolerates stale metadata fields without carrying them into compactor results', () => {
    const result = new CompactionResponseParser().parse(JSON.stringify({
      episodic_summary: 'Settled work was compacted.',
      critical_issues: [{ fact: 'Keep the fact only.', reference: 'turn-1', tags: ['legacy'] }],
      unresolved_work: [],
      durable_facts: [],
      user_preferences: [],
      important_artifacts: [],
    }));

    expect(result.criticalIssues).toEqual([{ fact: 'Keep the fact only.' }]);
  });
});
