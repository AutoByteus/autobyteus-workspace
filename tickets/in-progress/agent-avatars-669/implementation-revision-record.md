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

## IR-002 (2026-11-28) — Local Fix CR-001

- Trigger: CRR-002 failure-origin review of API/E2E F-1 (AV-02). Origin: implementation.
- Problem: a package picture replaced by one of the same size with the same whole-second mtime kept its cached hash, so
  its address kept the old `?v=`.
- Fix (`da2500e220`): `contentByPath` reuses a hash only while `size`, `mtimeMs`, `ctimeMs` and `ino` from one `lstat`
  are unchanged. The N-3 unit case is rewritten: an untouched file is not read again; a same-size, same-mtime
  replacement is read again and gets a new hash.
- Refinement recorded: N-3's signal is size, mtime, ctime and inode.
- Evidence: `evidence/implementation/IMP-004-cr001-cache-identity.md`. The unit case and AV-02 are red on `950061c296` and
  green now (AV-02 3 of 3). Server typecheck at baseline; server unit suite 9309 passed.
- Not changed: the shared user-file ETag (FU-002, the Solution Designer's).
- Classification unchanged: Large / High. No Design Impact. Next: `/code_reviewer` (targeted delta review).
