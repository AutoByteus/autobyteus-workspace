# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial implementation baseline and any later implementation-owned revisions.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| `IR-001` | `architecture_reviewer` / `design-review-report.md` / Round 1 (`ARCH-REV-001`) | `N/A` | `Initial Baseline` | `SR-001`, `SR-002`; `ARCH-REV-001`; `CRR/API-REV/DR: N/A` | `Canonical Fast capability discovery complete; ready for code review` |

## Revision Entries

### IR-001 — Discover Codex Fast from canonical structured service tiers

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/design-review-report.md`; Round 1 / `ARCH-REV-001` Pass.
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: the Codex model adapter now derives Fast capability only from canonical structured `serviceTiers` entries with normalized ID `priority`; deprecated discovery was removed and focused unit coverage was aligned. Source and unit changes are committed at `811180684b9b1e2b1c1294fb87f2623b561dee07`; ready for code review.
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: establishes the initial implementation handoff for the approved clean-cut capability-discovery cleanup after architecture review passed without findings.
- Approved behavior or requirement IDs affected: preserve `BEH-001`; implement `BEH-004`; preserve `BEH-005`; `REQ-001`–`REQ-007`; `AC-001`–`AC-011`.
- Implementation delta: replaced `toAdditionalSpeedTiers()` and the deprecated camel/snake reads with one private fail-closed structured-tier predicate; retained the unchanged product schema value `fast`; replaced deprecated positive unit cases with canonical positive/normalization cases and explicit non-priority, malformed, missing, and deprecated-only negatives. No fallback, alias, public interface, runtime, frontend, transport, persistence, or migration change was added.
- Changed files or areas: `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts`; `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts`; canonical implementation artifacts in this ticket folder.
- Local validation and result: focused normalizer unit suite Pass (`1` file / `10` tests); source-only production TypeScript Pass; full server production build and sanitized bootstrap smoke Pass; diff/reference/size audit Pass. Generic package typecheck remains unusable because the repository config combines `rootDir: src` with `include: tests`, yielding repository-wide `TS6059` errors unrelated to this change.
- Next recipient or routing: `/code_reviewer`
- Remaining limitations or risks: API/E2E coverage investigation must classify the stale live catalog parity projection and update it if retained; a future provider-ID contract change intentionally fails closed; downstream executable validation remains required.
