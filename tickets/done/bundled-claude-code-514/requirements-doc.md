# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `bundled-claude-code-514`
- Request / ticket: Project Task `autobyteus-514`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the founder's words
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `User`; reference: the user's answers in the Solution Designer's conversation on 2026-11-17 ("If it's doable, then that's great." and "then lets go it agreed"), choosing option A+
- Exact approved requirements baseline: this document at SR-002 (option A+)
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: Claude runs use whatever Claude Code the user installed; the version AutoByteus ships with the SDK is never used. The Task asks whether switching to the bundled program is worth it.
- Desired outcome of this round: a measured recommendation (DO / DON'T / DO IN PART) with a size, for the founder's decision. Build only after he agrees.

## Findings That Decide It (investigation-notes.md; evidence/probes-2026-11-17.md)

1. **The bundled copy in the shipped macOS app does not work.** It crashes on every command except `--version` (`SharedArrayBuffer is not defined`) and cannot run a turn. Our packaging re-signs Anthropic's binary with AutoByteus's identity and fewer entitlements. Anthropic's own copy of the same version works. Switching today would break Claude for every macOS user, and the re-signed binary is arguably no longer Anthropic's "unmodified binary".
2. **Login still needs the installed program.** Subscription sign-in happens in the user's terminal with their own `claude` (UD-006: AutoByteus offers no claude.ai login). So "works without an install" helps API-key users only.
3. **The Settings card is built around the installed program**: installed vs latest version, `claude update`, sign-in status. With the bundled program these become meaningless or must be redesigned.
4. **What works:** Anthropic's copy reads the user's existing login (no credential handling by AutoByteus) and resumed a session the newer installed CLI created.
5. **Version gap runs the other way:** the user's install (2.1.325) is newer than ours (2.1.280); the 30-minute surprise that motivated this is already solved for both versions by autobyteus-483.
6. **Release pipeline:** the macOS x64 build is made on an Apple-silicon runner, so it probably carries the wrong platform binary; not verified.
7. **Dead weight:** every desktop build ships the unused binary (208 MB of the 1.4 GB macOS app); the SDK only looks for it when no path is passed.

## Options

| Option | What | Gain | Cost / risk | Size |
| --- | --- | --- | --- | --- |
| A. DON'T switch | Keep the installed program | Users keep newer, auto-updated Claude Code; sign-in and Settings card unchanged | Version varies per user; no Claude without an install | None |
| A+. DON'T switch, remove the dead weight | As A, and stop packaging the SDK's platform binaries in desktop builds and the Docker server package | ~208 MB smaller downloads; no broken binary shipped | Must keep passing a path (already the case); a later switch would re-add it | Small, Low risk |
| B. DO IN PART | Installed first; bundled fallback when none is found | API-key users can run Claude without installing it | Fix macOS signing (keep Anthropic's signature, check notarization); fix the x64 build; card shows "bundled, no update"; subscription users still must install to sign in; test every platform and Docker | Medium |
| C. DO | Bundled only | Same version for everyone, the one we test | Everything in B, plus redesign of the card (no update, version from the app), users lose Claude Code fixes until our next SDK bump; the founder's own runs move from 2.1.325 back to 2.1.280 | Medium–Large |

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Which option? | The gain the Task expected is mostly gone (483 fixed the limit for both versions; login still needs the installed program), while a switch needs packaging and Settings rework and today would break macOS. **Recommendation: A+** — keep the installed program, and stop shipping the unused (and on macOS broken) bundled binary. Choose B only if Claude for API-key users without an install matters to you. | User (founder) | Decided by the user: A+ (2026-11-17) |

## Requirements (apply only if A+ is chosen; rewritten for B or C)

| Requirement ID | Requirement | Source |
| --- | --- | --- |
| REQ-001 | Claude runs, catalog, usage, availability and the Settings card keep using the installed program (unchanged). | DEC-001 |
| REQ-002 | Desktop builds (macOS arm64/x64, Windows, Linux) and the Docker server package no longer contain the Agent SDK's platform binary packages (`@anthropic-ai/claude-agent-sdk-<platform>`); the SDK package itself (`@anthropic-ai/claude-agent-sdk`) stays. A build whose SDK package is missing fails. | DEC-001 |
| REQ-003 | Claude runs and model discovery work as before in a packaged build without those binaries. | DEC-001 |

## Acceptance Criteria (A+)

| AC ID | Requirement | Expected Outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-002 | No `claude-agent-sdk-<platform>` package or link in the packaged macOS app, the Linux and Windows builds and the Docker server package; `@anthropic-ai/claude-agent-sdk` present | inspect a local macOS build and a `pnpm deploy` stage; unit test on both layouts (pnpm and the Windows flat npm tree); the build-only release run for all platforms (DESIGN.md rule 12) |
| AC-002 | REQ-003 | A packaged build (isolated instance) runs a Claude turn and lists Claude models with the installed program | live check |
| AC-003 | REQ-001 | Settings card shows the installed version, sign-in and update as today | live check |

## Scope Guardrail

- In scope (A+): packaging of the SDK platform binaries; nothing in runtime behaviour.
- Out of scope: switching the binary (B/C) unless chosen; Claude login flows (UD-006); 483's limits.
- Preserved: BEH-001..BEH-004 (investigation notes).
- Prerequisites: None.

## Readiness Check

- Content ready for approval: `Yes`
- Remaining content blocker: None
- Approval recorded: `Yes` (User, 2026-11-17, option A+)
