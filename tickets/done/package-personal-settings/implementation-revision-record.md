# Implementation Revision Record — package-personal-settings (autobyteus-95, stage 1)

The current code and `implementation-handoff.md` remain authoritative. This record
locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | SR-006, ARCH-REV-002 | Implemented; ready for code review |

## Revision Entries

### IR-001 — Stage 1: personal settings, editor marks and reset, capture at GitHub updates

- Triggering role, report path, and round: Architecture Reviewer,
  `tickets/in-progress/package-personal-settings/design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: stage 1 implemented on branch `codex/package-personal-settings`:
  `f9b3e27297` (implementation) and `2c4ba2c51e` (two fixes found in the rendered check), plus the
  baseline test fix `48f4443fe6`.
- Related solution revision IDs: SR-006.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline or implementation revision is recorded: the initial implementation of the
  approved stage 1 design.
- Approved behavior or requirement IDs affected: BEH-001..004; REQ-001..007, REQ-009;
  AC-001..008.
- Implementation delta:
  - New server area `src/personal-settings/` (domain, store, service) per
    `personal-settings-file-contract.md`.
  - The agent, Team and Org services: apply on every store-backed read, split saves,
    reset, the personal settings view; `rendersDifferently` on the three file providers.
  - GraphQL fields `personalSettings`, `personalSettingsBase` and three reset mutations.
  - GitHub updates: `installer.downloadRevision`, `PackageEditCapture` (backup and capture
    before staging).
  - One announce function in the feed composition, now given the host definition services.
  - Web: documents, generated types, store reset actions, the note and "Personal" mark
    components, the three editors, en/zh-CN texts, REQ-007 texts.
  - Docs: GLOSSARY, `personal_settings.md` (new), `agent_packages.md`,
    `agent_definition.md`, web agents/teams/orgs docs.
  - `2c4ba2c51e`, from the rendered check (IMP-09a): a Team's personal-only save no longer
    rewrites its files (the Team editor sends trimmed text; text equal to the files' up to
    surrounding whitespace keeps the files' text); the agent and Team editors refill only when
    the loaded definition's values changed, so a reset (and any announced list reload) keeps
    unsaved edits.
- Changed files or areas: see the handoff's "Key Files Or Areas".
- Local validation and result: see the handoff's "Checks Run" (IMP-01..IMP-09).
- Next recipient or routing: Code Reviewer (Large/High).
- Remaining limitations or risks: see the handoff's "Known Risks".
