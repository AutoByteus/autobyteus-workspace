# IR009 implementation evidence — SR035 integration

Scope: implementation local checks only. No API/E2E, live provider campaign, Electron build or Delivery signoff.
Current code and ../../implementation-handoff.md are authoritative; initial/failed logs remain immutable evidence of the iterations.

## Final local checks
| Check (log/exit stem) | Command / scope | Outcome |
|---|---|---|
| contract-build | pnpm -C autobyteus-collaboration-stream-contracts build; pnpm -C autobyteus-team-stream-contracts build | exit0; source-driven, non-clean contract emit |
| server-typecheck-final | pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json | exit0 |
| core-typecheck-final | pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json | exit0; no core emit/cleanup this round |
| server-target-final | server Vitest: agent-run-collaboration-root, team-root-collaborators, root-recovery-command | 3 files /15 Pass; snapshot tests use configured-handle doubles, root recovery has existing real native fixture |
| server-overlap-final | exact29-file command in server-overlap-final.sh / server-overlap-command.json | 28 files Pass /1 skipped;251 Pass /2 skipped; opt-in AGY tests skipped, not Pass |
| core-target-final | core Vitest memory-ingest-input-processor, direct-llm-compression-strategy, pending-compaction-executor, accepted-compaction-committer | 4 files /52 Pass |
| contracts-target-final | node --test presentation collaborator-mention-note, Team team-collaborators, collaboration agent-run-collaboration-dtos + compaction-input-state |14 Pass |
| contract-final | pnpm -C autobyteus-collaboration-stream-contracts test | exit1;9 Pass /7 Fail; unchanged baseline root-execution-view-dtos cases, not waived |
| web-target-final | pnpm -C autobyteus-web test:nuxt agentRootCompactionIntegration + agentRunCollaborationContext + agentRunCollaborationStreamingService + useAgentRunCollaborationSync --run |4 files /38 Pass (22+12+3+1) |
| web-overlap-final | exact34-file command in web-overlap-final.sh / web-overlap-command.json |34 files /408 Pass |
| web-fixture-final | test:nuxt rootExecutionViewState + agentRunCollaborationStreamingService --run after final fixture/type/name corrections |2 files /17 Pass |
| web-initial | test:nuxt agentRunStore, agentRunCollaborationStore, agentRunCollaborationContext, nativeCompactionTermination --run |4 files /52 Pass; before added tests, not final aggregate |
| web-tsc-8gb-final2 | NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec tsc --noEmit | exit2 /7078 diagnostics; zero diagnostics in exact IR009 changed web paths; NOT vue-tsc, NOT full typecheck Pass |
| owned-diff-check | git diff --check | exit0 (IR009 unstaged delta) |
| full-staged-diff-check | git diff --cached --check | exit2 from preserved incoming historical evidence whitespace; no log rewriting |

Counts overlap between groups; do NOT sum into a unique-suite or API confidence score. Full suite not run.

## Iterations preserved
- server-initial/target2: existing recovery fixture lacked teamScoped/current rootTeam collaborators.
- server-target3: new hosted-Team snapshot test initially assigned a mock before lazy Team wake; corrected fixture ordering. Final dedup supplies repeated exact leaf snapshots and asserts one result.
- server-overlap: three Org tests used an incomplete configured-handle mock lacking required live-input getter; now explicit empty array.
- contract-test: Agent required input/status and Org collaborators fixture omissions corrected. Seven older root DTO schema/version/settledAt cases left non-green.
- web-overlap:13 setup failures from missing required Org input/status fields corrected, existing14 tests preserved.
- web-target2: one incorrect test assumption that Pinia action wrappers preserve returned Promise identity; replaced with actual query-coalescing assertion. Production unchanged.
- web-tsc initial7091 -> final7082 -> final2 7078 after narrow fixture type corrections. Same count as historical IR007 is not proof of identical causes or a baseline waiver.
- All corrected behavior has a final selected rerun. No test assertions weakened to hide a production failure.

## Source / ownership
source-inventory.json pins31 paths (12 production,13 tests/fixtures,6 generated outputs); source-delta.patch is the exact IR009 entry-to-current delta. source-before preserves touched existing bytes; entry-* preserves reports, index and worktree patches. Untracked new source/test paths are part of the candidate, not staged. Incoming audit records676 /69. audit.py is read-only outside this evidence directory.
final-audit.json verifies HEAD/MERGE_HEAD, index672 staged, zero unmerged, stash, API12 and two safety archives. No source/durable-test edit outside indexed changes. No core dist emit this round.

## Rendered feedback
renderer-preview is synthetic actual-component presentation only; renderer-interactions.json and renderer-stopped-highlight-narrow.png accompany rendered-result-check.md. Own tab/server stopped; no full app or native cold-history claim.

## Remaining gates
Independent source review -> API/E2E -> successful-test review -> Delivery semantic docs and isolated Electron/user verification. Retain F005 accepted known/nonfixed/nonPass Qwen STOP, F004 unknown, SR022 exhausted/v6 unapproved, CG033 preparatory timeout unproved/not pump Pass,14 wider and7 baseline residuals. Historical ARCH004/IR007/CRR011/API008/CRR013 results remain pre-integration only.
