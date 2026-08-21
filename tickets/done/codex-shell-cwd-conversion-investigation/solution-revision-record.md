# Solution Revision Record

The latest requirements, investigation notes, design spec, and evidence supplement remain authoritative. This record is a concise round and rationale index.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer / initial approved solution baseline | N/A | Initial Baseline | Ready for architecture review |

## Revision Entries

### SR-001 — Stable Codex CWD projection baseline

- Triggering role, report path, and round: Solution designer; initial solution round after user approval on 2026-08-21.
- Triggering finding IDs: N/A.
- Prior authoritative result: N/A.
- Current authoritative result: Approved requirements and an implementation-ready local design that promotes stable app-server `cwd` through the shared canonical `run_bash` argument parser, with no execution reroute or historical trace backfill.
- Why this baseline or revision entry is recorded: Establish the initial complete solution package before architecture review.
- Resolution: Treat the issue as a local parser defect. Change one production owner, cover live start/completion, command approval, request forwarding, missing-CWD, and native-history behavior, and reuse existing persistence unchanged.
- Approved behavior or requirement IDs affected: BEH-001–BEH-004; REQ-001–REQ-005; AC-001–AC-006.
- Canonical artifacts and sections updated: `requirements.md` approval status; `investigation-notes.md` status/reviewer note; initial `design-spec.md` in full.
- Supplemental artifacts updated, added, or removed: Existing `codex-cwd-probe-evidence.md` retained unchanged as evidence-only support.
- Downstream and architecture-review impact: Architecture reviewer should validate the shared-parser ownership, source precedence, no-backfill decision, and focused test allocation. Implementation is blocked until the design passes architecture review.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: No known requirement gap. Ordinary upstream app-server protocol evolution remains a dependency risk; old application-owned traces intentionally remain unenriched.
