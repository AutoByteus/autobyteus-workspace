# Future-State Runtime Call Stack Review

## Review Meta

- Scope Classification: `Large`
- Current Round: `16`
- Current Review Type: `Deep Review`
- Clean-Review Streak Before This Round: `0`
- Clean-Review Streak After This Round: `2`
- Round State: `Go`

## Review Basis

- Requirements: `tickets/in-progress/android-pty-investigation/requirements.md` (`Refined`)
- Proposed Design: `tickets/in-progress/android-pty-investigation/proposed-design.md` (`v7`)
- Runtime Call Stack: `tickets/in-progress/android-pty-investigation/future-state-runtime-call-stack.md` (`v7`)

## Round History

| Round | Requirements Status | Design Version | Call Stack Version | Findings Requiring Write-Back | Write-Backs Completed | Clean Streak After Round | Round State | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Design-ready | v1 | v1 | No | N/A | 1 | Candidate Go | No-Go |
| 2 | Design-ready | v1 | v1 | No | N/A | 2 | Go Confirmed | Go |
| 3 | Refined | v1 | v1 | Yes | Yes | 0 | No-Go | No-Go |
| 4 | Refined | v2 | v2 | No | N/A | 1 | Candidate Go | No-Go |
| 5 | Refined | v2 | v2 | No | N/A | 2 | Go Confirmed | Go |
| 6 | Refined | v2 | v2 | Yes | Yes | 0 | No-Go | No-Go |
| 7 | Refined | v3 | v3 | No | N/A | 1 | Candidate Go | No-Go |
| 8 | Refined | v3 | v3 | No | N/A | 2 | Go Confirmed | Go |
| 9 | Refined | v3 | v3 | Yes | Yes | 0 | No-Go | No-Go |
| 10 | Refined | v4 | v4 | No | N/A | 1 | Candidate Go | No-Go |
| 11 | Refined | v4 | v4 | No | N/A | 2 | Go Confirmed | Go |
| 12 | Refined | v4 | v4 | Yes | Yes | 0 | No-Go | No-Go |
| 13 | Refined | v5 | v5 | No | N/A | 1 | Candidate Go | No-Go |
| 14 | Refined | v5 | v5 | No | N/A | 2 | Go Confirmed | Go |
| 15 | Refined | v6 | v6 | Yes | Yes | 0 | No-Go | No-Go |
| 16 | Refined | v7 | v7 | No | N/A | 2 | Go Confirmed | Go |

## Round Write-Back Log

| Round | Findings Requiring Updates | Updated Files | Version Changes | Changed Sections | Resolved Findings |
| --- | --- | --- | --- | --- | --- |
| 1 | No | None | None | None | N/A |
| 2 | No | None | None | None | N/A |
| 3 | Yes | `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `investigation-notes.md` | requirements `Design-ready -> Refined`, design `v1 -> v2`, call stack `v1 -> v2` | shell policy wording; stateful behavior resolution; open-question closure | removed `bash -lc`/`sh -c` mismatch and aligned artifacts to persistent interactive shell behavior |
| 4 | No | None | None | None | N/A |
| 5 | No | None | None | None | N/A |
| 6 | Yes | `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `investigation-notes.md` | design `v2 -> v3`, call stack `v2 -> v3` | strict Android packaging exclusion; no-PTY-fallback clarity; scripted packaging gate | enforced explicit requirement that Android profile must not resolve/link/import `node-pty` and added machine-checkable verification path |
| 7 | No | None | None | None | N/A |
| 8 | No | None | None | None | N/A |
| 9 | Yes | `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `scripts/verify-android-profile.sh` | design `v3 -> v4`, call stack `v3 -> v4` | enforceable wording for pnpm behavior (resolved/linked/importable), verifier probes clarified | aligned requirement language with technically enforceable verification semantics while preserving strict no-`node-pty` Android intent |
| 10 | No | None | None | None | N/A |
| 11 | No | None | None | None | N/A |
| 12 | Yes | `proposed-design.md`, `future-state-runtime-call-stack.md`, `implementation-progress.md`, `investigation-notes.md`, core/server terminal files | design `v4 -> v5`, call stack `v4 -> v5` | separation-of-concern re-review; shared contract boundary; executable shell probing | removed duplicate terminal session contracts and `any`-typed boundaries; preserved Windows policy path; hardened shell binary detection |
| 13 | No | None | None | None | N/A |
| 14 | No | None | None | None | N/A |
| 15 | Yes | `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `implementation-plan.md` | design `v5 -> v6`, call stack `v5 -> v6` | add `UC-008` Android file-persistence runtime path and align review/plan artifacts | removed doc drift where requirements/code included Android file-persistence policy but runtime-call-stack artifacts stopped at `UC-007` |
| 16 | No | None | None | None | N/A |

## Per-Use-Case Review

| Use Case | Terminology Naturalness | Naming Clarity | Name-to-Responsibility Alignment | Future-State Alignment | Coverage Completeness | Layer SoC | Redundancy Check | Simplification Check | Legacy/Compat Branch Check | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-002 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-003 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-004 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-005 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-006 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-007 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-008 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Findings

- Round 3 finding (resolved): call-stack/design/requirements text used `bash -lc`/`sh -c`, but implementation uses persistent interactive shell session.
- Round 6 finding (resolved): requirements/design did not explicitly enforce zero resolved/linked/importable `node-pty` on Android profile.
- Round 9 finding (resolved): package-level wording needed to match technically enforceable pnpm semantics; switched to dependency-graph + runtime-import verification wording.
- Round 12 finding (resolved): terminal session contracts were duplicated between core and server and core managers used `any` session typing, weakening SoC boundaries; replaced with one shared contract and typed manager boundaries.
- Round 15 finding (resolved): requirements/design/code contained Android file-persistence policy, but runtime-call-stack artifacts did not include `UC-008` / persistence startup path.

## Gate Decision

- Implementation can start: `Yes`
- Clean-review streak: `2`
- Gate result: `Go`

## Speak Log

- Round 1 started spoken: `Yes`
- Round 1 completion spoken: `Yes`
- Round 2 started spoken: `Yes`
- Round 2 completion spoken: `Yes`
- Round 3 started spoken: `Yes`
- Round 3 completion spoken: `Yes`
- Round 4 started spoken: `Yes`
- Round 4 completion spoken: `Yes`
- Round 5 started spoken: `Yes`
- Round 5 completion spoken: `Yes`
- Round 6 started spoken: `Yes`
- Round 6 completion spoken: `Yes`
- Round 7 started spoken: `Yes`
- Round 7 completion spoken: `Yes`
- Round 8 started spoken: `Yes`
- Round 8 completion spoken: `Yes`
- Round 9 started spoken: `Yes`
- Round 9 completion spoken: `Yes`
- Round 10 started spoken: `Yes`
- Round 10 completion spoken: `Yes`
- Round 11 started spoken: `Yes`
- Round 11 completion spoken: `Yes`
- Round 12 started spoken: `Yes`
- Round 12 completion spoken: `Yes`
- Round 13 started spoken: `Yes`
- Round 13 completion spoken: `Yes`
- Round 14 started spoken: `Yes`
- Round 14 completion spoken: `Yes`
- Round 15 started spoken: `Yes`
- Round 15 completion spoken: `Yes`
- Round 16 started spoken: `Yes`
- Round 16 completion spoken: `Yes`
