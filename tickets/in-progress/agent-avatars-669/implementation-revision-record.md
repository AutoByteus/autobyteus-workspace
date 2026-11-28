# Implementation Revision Record — agent-avatars-669 (autobyteus-669)

## IR-001 (2026-11-28) — initial implementation

- Trigger: ARCH-REV-002 Pass, SR-002, from `/architecture_reviewer`. The request: "Build what design-spec.md describes,
  data contract first".
- Scope: S-1…S-4 and W-1…W-6 as designed; the docs (REQ-008); the probe.
- Commits:
  - `785fa286a9`: contracts;
  - `4654dacd68`: server;
  - `30132f3351`: the watcher allow-list;
  - `ebba269dbc`: web;
  - `5a2ff965e6`: docs;
  - `bc14dfc507`: the probe and ticket files;
  - `8a185cc850`: a test's temp-file cleanup.
- Deviations and choices: see `implementation-handoff.md` "Deviations And Implementation Choices":
  - the route serves `packageAvatar.folder`;
  - the watcher allow-list;
  - the preview after an unsaved Remove;
  - `data-test` on the avatar root;
  - AC-005 through twenty copies of one team.
- Evidence:
  - `evidence/implementation/IMP-001-red-on-base.md`;
  - `IMP-002-checks.md`;
  - `IMP-003-probe.md`, with `IMP-003-probe-evidence.json` and 12 screenshots.
- Classification unchanged: Large / High. No Design Impact. Next: `/code_reviewer`.
