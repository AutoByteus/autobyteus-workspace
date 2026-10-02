# CRR014 independent integrated source review evidence
Canonical code-review-report.md and code-review-revision-record.md govern. This directory is reviewer-owned.

## Executed checks
Commands run from the task worktree, always one-shot:
- web-target: pnpm -C autobyteus-web test:nuxt stores/__tests__/agentRootCompactionIntegration.spec.ts services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts services/agentCollaboration/__tests__/agentRunCollaborationStreamingService.spec.ts composables/agentCollaboration/__tests__/useAgentRunCollaborationSync.spec.ts --run
- server-target: pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-run-collaboration/agent-run-collaboration-root.test.ts tests/unit/agent-team-execution/team-root-collaborators.test.ts tests/unit/agent-execution/root-recovery-command.test.ts --no-watch
- server-overlap / web-overlap: exact commands in implementation-evidence/ir-009/{server,web}-overlap-final.sh. **Reviewer mistakenly ran scripts with owner-output redirects; see evidence-write-incident.json.** Copied final outputs here are CRR014, not recovered originals. Script exit alone is not test proof; actual copied final logs and .exit confirm both0.
- core-target: pnpm -C autobyteus-ts exec vitest run tests/unit/agent/input-processor/memory-ingest-input-processor.test.ts tests/unit/memory/direct-llm-compression-strategy.test.ts tests/unit/memory/pending-compaction-executor.test.ts tests/unit/memory/accepted-compaction-committer.test.ts --no-watch
- contract-target: node --test autobyteus-agent-presentation-contracts/tests/collaborator-mention-note.test.mjs autobyteus-team-stream-contracts/tests/team-collaborators.test.mjs autobyteus-collaboration-stream-contracts/tests/agent-run-collaboration-dtos.test.mjs autobyteus-collaboration-stream-contracts/tests/compaction-input-state.test.mjs
- core/server-typecheck: pnpm -C <autobyteus-ts|autobyteus-server-ts> exec tsc --noEmit -p tsconfig.build.json
- git diff --check for owned unstaged code. Staged historical evidence whitespace is inherited, not rewritten.

All result groups overlap. No grand total/API confidence. No app, provider, Electron, full suite, full web typing or emitted build.
Entry-audit.json pins3659 inputs, refs/index/status/stash. Source/incoming hash crosschecks verify31/676 inventories;232 source size scan excludes tests/generated; shared-owner-moves.diff compares the three exact old HEAD owners to current shared replacements.
No production/durable-test changes by reviewer. Two original IR009 raw logs were overwritten by mistake and cannot be recovered; both original SHA pins, explicit ownership and implementation owner's recovery response are preserved in incident documentation. Do not assert all evidence untouched.

Audit note: entry Git strings excluded their terminal newline. The first final-audit comparison did not normalize that serialization difference and reported false mismatches; exact comparison after removing one trailing newline confirmed unchanged refs/index/stash. Original diagnostic audit retained as audit-initial-format-mismatch.json. No Git change occurred.
