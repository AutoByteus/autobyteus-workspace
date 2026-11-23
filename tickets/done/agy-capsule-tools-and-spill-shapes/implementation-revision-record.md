# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, SR-002 design (after the implementation engineer's Design Impact on SR-001) | N/A | `Initial Baseline` | SR-001, SR-002 | Registry-names allowlist unchanged; drift warning added; checks pass |

## Revision Entries

### IR-001 — Allowlist stays the registry names; a start-time warning when one is missing from the CLI's registry

- Triggering role, report path, and round: Solution Designer, `design-spec.md` (SR-002), initial implementation round
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: commit `0f74222c52` on `codex/agy-capsule-tools-and-spill-shapes`
- Related solution revision IDs: SR-001 (found wrong by live probe before any commit: IMP-03 evidence, commit be6ce32545), SR-002
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: first implementation of the approved design
- Approved behavior or requirement IDs affected: REQ-001, REQ-002 (REQ-003 is the designer's records); AC-001, AC-002, AC-003
- Implementation delta: `agy-native-tool-policy.ts`: eight names unchanged, comment rewritten (registry names, alias rule), new `agyNativeToolsMissingFromRegistry`; `agy-agent-run-backend-factory.ts` `launch`: one `console.warn` when the init `tools` array lacks a name; module doc; tests
- Changed files or areas: see the handoff
- Local validation and result: typecheck at baseline; `pnpm test:unit` 1078 files / 8995 tests pass; live check on the real agy 1.5.15 passes
- Next recipient or routing: `/api_e2e_engineer`
- Remaining limitations or risks: an older CLI's reaction to a list of registry names is unchanged from today (the list is unchanged); the live check adds a synthetic conversation to the local agy history
