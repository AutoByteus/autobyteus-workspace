# Implementation Handoff — agpl-dual-licensing, Slice 1 (licence text)

> Not legal advice. The licence wording, the AGPL §7 additional permission and the commercial terms must be reviewed by a lawyer before publishing (REQ-011).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route (Small/Low). Independent architecture review was skipped; the design was not skipped. Solution Designer `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" and routed to implementation_engineer.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/design-spec.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/solution-handoff.md`
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

Slice 1 is implemented exactly per the design spec's Final File Responsibility Mapping, in one commit: `e1ee19dd3` on `codex/agpl-dual-licensing` (base `origin/personal` @ `a0ded874b`, ticket artifacts at `8a60a0d8e`).

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md § "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 26 files changed, all licence text, Markdown or a single `license` key in JSON. No code, test, build, CI or packaging config changed. The escalation trigger was checked and did not fire. `git grep` for readers of the `license` field or `LICENSE` files (`.license`, `"LICENSE"`, `licenseFile`, build/CI/Docker configs) finds only the existing `files: [..., "LICENSE"]` packing entries. The one other match is the noVNC test, which reads noVNC's own third-party `LICENSE.txt`/pako `LICENSE` from its package directory and is unaffected. electron-builder has no licence configuration; it passes the `package.json` `license` value through as metadata, which is now `AGPL-3.0-only`.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`. Each LICENSING.md point (1–9) was checked against the design content spec. NOTICE matches the spec verbatim. The README section covers every spec sentence and the old "Commercial use and modification are allowed" is gone. No CLA is mentioned. Nothing was appended to any `LICENSE` file. The `package.json` edits are a single key each with no reformatting, and the devkit template is untouched.
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Verbatim AGPL v3 at root and in the 4 AGPL package dirs | `LICENSE`, `autobyteus-ts/LICENSE`, `autobyteus-web/LICENSE` (replaced); `autobyteus-server-ts/LICENSE`, `autobyteus-message-gateway/LICENSE` (added) | All 5 have sha256 `0d96a4ff…abcb0`, identical to gnu.org (downloaded 2026-10-08, re-verified). GitHub detection is checked after merge (delivery) |
| BEH-002 | Mapped `license` per component | 5 changed to `AGPL-3.0-only` (root, ts, server-ts, web, gateway). 2 inserted `AGPL-3.0-only` (`autobyteus-web/modules/electron`, `wechaty-sidecar`). 2 inserted `Apache-2.0` (`applications/brief-studio`, `applications/socratic-math-teacher`). 7 Apache component manifests already `Apache-2.0`, unchanged. Devkit `templates/basic` unchanged | jq over 16 first-party manifests: all match, none missing |
| BEH-003 | Dual-licence statement and `LICENSING.md` | `LICENSING.md` (new), `NOTICE` (rewritten per spec), `README.md` § License (l.677+) | README and NOTICE only point to `LICENSING.md`; neither restates the component map or §7 |
| BEH-006 | Apache-2.0 kept, with the official full text in 9 dirs | 3 contracts stubs replaced; 4 SDK/devkit dirs and 2 `applications/*` dirs added | All 9 have sha256 `cfc7749b…3d30` (official apache.org text). The pack dry-run lists `LICENSE` |
| BEH-007 | §7 additional permission for `@anthropic-ai/claude-agent-sdk` | `LICENSING.md` § "Additional permission under AGPL-3.0 section 7" | Text matches the design spec verbatim |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- AGPL text (5): `LICENSE`, `autobyteus-ts/LICENSE`, `autobyteus-web/LICENSE`, `autobyteus-server-ts/LICENSE`, `autobyteus-message-gateway/LICENSE`
- Apache text (9): `autobyteus-agent-presentation-contracts/LICENSE`, `autobyteus-collaboration-stream-contracts/LICENSE`, `autobyteus-team-stream-contracts/LICENSE`, `autobyteus-application-backend-sdk/LICENSE`, `autobyteus-application-frontend-sdk/LICENSE`, `autobyteus-application-sdk-contracts/LICENSE`, `autobyteus-application-devkit/LICENSE`, `applications/brief-studio/LICENSE`, `applications/socratic-math-teacher/LICENSE`
- Manifests (9): `package.json`, `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, `autobyteus-web/package.json`, `autobyteus-message-gateway/package.json`, `autobyteus-web/modules/electron/package.json`, `autobyteus-message-gateway/tools/wechaty-sidecar/package.json`, `applications/brief-studio/package.json`, `applications/socratic-math-teacher/package.json`
- Documents (3): `LICENSING.md` (new), `NOTICE`, `README.md`

## Important Assumptions

- Holder `Yu Zheng (AutoByteus)` and contact `ryan.zheng.work@gmail.com` follow DEC-003/DEC-004. Each is a single string in `LICENSING.md`, `NOTICE` and `README.md` (the contact is not in NOTICE), so the user can correct them at verification.
- Copyright year `2026` follows the design spec.

## Known Risks

- Lawyer review of the wording, the §7 permission and the commercial terms is outstanding (REQ-011).
- Slice 2 is not implemented: licence copies in binaries and Docker, the About line, the CLA, and the automated checker. Until then, binaries carry no licence text, as today.
- The `autobyteus-web/package.json` `author.email` `team@autobyteus.com` is out of scope, as noted by the Solution Designer.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (contract/licence)
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: No code reads these files or fields (see Routing Classification evidence).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The Apache claims for AGPL components were removed outright. The only historical reference is the earlier-release sentence (≤ v1.4.97).
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`. The Apache texts were replaced, the stubs replaced, and the old README sentence and NOTICE wording removed.
- Shared structures remain tight: `Yes` (N/A, no code structures)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (no source implementation files changed)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md § "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree has no `node_modules`, and per the design `pnpm install` was not run. As a result, `pnpm -C autobyteus-application-backend-sdk pack --dry-run` fails with `ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`, because it must resolve `workspace:*` deps. This is an environment limitation, not a change effect. `pnpm -C autobyteus-ts pack --dry-run` (no workspace deps) works and lists `LICENSE`. For the workspace-dependent packages, `npm pack --dry-run --ignore-scripts --json` was used to list tarball files. The design's verification command therefore needs installed deps for the SDK packages, which is a small discrepancy recorded for downstream.
- No lockfile change.

## Local Implementation Checks Run

All are text and metadata checks (TESTING.md: smallest layer that proves the change; no runtime test layer applies). All passed on 2026-10-08.

1. Official texts: `curl https://www.gnu.org/licenses/agpl-3.0.txt` → sha256 `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0` (661 lines). `curl https://www.apache.org/licenses/LICENSE-2.0.txt` → `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` (202 lines). Both equal the design spec.
2. `shasum -a 256` of the 5 AGPL files: all `0d96a4ff…abcb0`. Of the 9 Apache files: all `cfc7749b…3d30` (AC-001 file part, AC-002).
3. `jq -r '.license'` over the 16 tracked first-party `package.json` files (excluding `tickets/` and the devkit template): 7 `AGPL-3.0-only` and 9 `Apache-2.0`, matching the mapping, none missing (AC-003).
4. After the commit, `git grep -I -l -E 'Apache[- ]2\.0|Apache License|apache\.org/licenses' -- . ':(exclude)tickets/**' ':(exclude)**/tickets/**'` matched only: `LICENSING.md`, `README.md`, the 9 Apache component `LICENSE` and `package.json` files, and `autobyteus-android/gradlew{,.bat}`. That is the allowlist only (AC-009 manual form). `NOTICE` does not match because "Apache\nLicense 2.0" wraps across a line, as in the spec. That is fine; it is also an allowlisted file.
5. Pack listing: `pnpm -C autobyteus-ts pack --dry-run` lists `LICENSE`. `npm pack --dry-run --ignore-scripts --json` lists `LICENSE` and `package.json` for `autobyteus-application-backend-sdk`, `autobyteus-team-stream-contracts` and `autobyteus-ts` (AC-006 spot check).
6. `git diff --stat HEAD~1`: 26 files, exactly the mapping (14 LICENSE, 9 package.json, LICENSING.md, NOTICE, README.md). Third-party notices, `gradlew*`, `tickets/**` and the devkit template are untouched.
7. All edited `package.json` files parse with jq.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. No rendered frontend or interaction change; only licence text, Markdown and a JSON metadata key.

## Downstream Coverage Hints / Suggested Scenarios

- Re-run checks 2–6 from a clean checkout of `e1ee19dd3`.
- AC-006 across all 8 publishable packages (contracts ×3, SDK ×3, devkit, `autobyteus-ts`). Use `npm pack --dry-run`, or `pnpm pack --dry-run` after `pnpm install`, and confirm both the `LICENSE` content and the `license` field in each tarball.
- AC-004/AC-011 content review of `LICENSING.md`, `NOTICE` and the README section against the design content spec.
- Optional: `diff` each `LICENSE` against freshly downloaded gnu.org/apache.org texts.
- REQ-012: no build inputs changed. A cheap sanity check is that `pnpm install --frozen-lockfile` still succeeds (lockfile unaffected).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E engineer: validate AC-001 (file part), AC-002, AC-003, AC-004, AC-006, AC-009 (manual form), AC-011, and REQ-012 (no build regressions; no build inputs changed).
- Delivery (post-merge): `gh repo view AutoByteus/autobyteus-workspace --json licenseInfo` → `agpl-3.0` (AC-001). Include the REQ-009 dependency-compatibility table from the investigation notes. Include the lawyer-review note. Obtain the user's verification of the holder name and contact.
