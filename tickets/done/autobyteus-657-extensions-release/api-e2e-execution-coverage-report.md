# API/E2E Execution Coverage Report — autobyteus-657: the catalog public key built into the app

## Round

- Coverage investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record and current revision ID: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-001`
- Test progress log: not used (short cases).
- Round and trigger: round 1, implementation handoff IR-001 (direct route).
- Prior round reviewed: none.
- Deviations from the investigation's plan: none.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-657-extensions-release/tickets/in-progress/autobyteus-657-extensions-release/evidence/` (implementation `IMP-*`, API/E2E `api-e2e/API-*`).

## Routing Classification

- Task size: `Small`; architectural risk: `Low` (confirmed: one constant, one test and fixture, documents).
- Input route: `Direct Low-Risk`; successful-output route: `Delivery`.
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | 45645fb079 (code a80cd0218f) | macOS 26 arm64 | Node 22.23.1 | worktree as handed over |
| ENV-2 | same | macOS arm64 + network | Node's `crypto`, `tar`, `gh` | downloads into an empty `/tmp/657-api-downloads` (removed); public URLs, no login |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | R-3 | server typecheck, build, extensions/architecture/node-access tests (incl. the new offline test) | Reused IMP-01 | — | Pass (reused) | `IMP-01-server-gates.log` | "[typecheck] PASS"; "Tests  142 passed (142)" | a80cd0218f; HEAD adds documents only |
| API-R2 | R-5 | real chain with the built-in key, no overrides | Reused IMP-02 | — | Pass (reused) | `IMP-02-real-chain.log` | "installed and ready in 112 s"; "Tests  1 passed (1)" | same commit |
| API-R3 | R-5 | packaged app on an isolated instance | Reused IMP-03 | — | Pass (reused) | `IMP-03-desktop-isolated.log`, `IMP-03-D1…D5-*.png` | `"catalogNotes":0`; "installed after 68 s … ready after 91 s"; dictation `"origin":"file://","status":200,"ms":380` with the exact sentence; `"dataRootRemoved":true` | same commit; never `~/.autobyteus` |
| API-01 | R-3 | web typecheck (compiles server source through the cross-package tests) | `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `api-e2e/API-01-web-typecheck.log` | "production errors: 0; test-file errors: 85 in 35 files (baseline 85 in 35 files)"; "[typecheck] PASS" | TESTING.md: both typechecks; IMP-01 ran only the server's |
| API-02 | R-3, R-4, R-6 | the built-in key against what the repository publishes now | `node probes/api-e2e/chain-check.mjs <worktree> <empty dir>` (Node's `crypto`, not the app's verifier) | ENV-2 | Pass | `api-e2e/API-02-chain-check.log` | `"keyEqualsRepositoryBytes": true`; `"keyType": "ed25519"`; `"fingerprint": "75d4d2f8…ad4c"`; `"signatureVerifiesWithBuiltInKey": true`; `"fixtureEqualsPublished": {"catalog": true, "sig": true}`; `"tamperedVerifies": false`; entry voice-input 1.0.0 `desktop-node`; package `"sha256Matches": true`, `"extensionJsonEqualsEntry": true`, `"pinnedRuntime": "0.3.2"` | RELEASE.md's check re-run at this time (R-6) |
| API-03 | R-1, R-2 | private key hygiene; repository state | `scripts/check_secrets.sh origin/personal..HEAD`; private-key markers in the branch's changed files, the ticket folder and every commit of a full clone of `AutoByteus/autobyteus-extensions`; `gh repo view`; `gh secret list` (names) | ENV-2 | Pass | `api-e2e/API-03-key-hygiene.log` | "secret gate: PASS"; markers 0 / 0 / 0 (5 commits); `"visibility":"PUBLIC"`; secret name `EXTENSIONS_CATALOG_SIGNING_KEY` | The local private key file was not opened or listed |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only / Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| R-1 (no private key outside the secret and the founder's backup) | Yes | API-03 | Proven (no key in the branch, the ticket folder or any commit of the public repository; the secret exists) | The founder's backup is his to confirm |
| R-2 (public repository, key pushed) | Yes | API-03, API-02 | Proven | — |
| R-3 (app carries the same public key, tested) | Yes | API-02, API-R1, API-01 | Proven (merge is delivery's) | — |
| R-4 (voice-input 1.0.0 released, catalog lists it) | Yes | API-02 | Proven | — |
| R-5 (whole chain on an isolated instance) | Yes | API-R2, API-R3 | Proven | — |
| R-6 (RELEASE.md check passes) | Yes | API-02 | Proven (re-run now) | Rerun before every tag (RELEASE.md) |
| D-5 wording | No | diff read against requirements-doc.md D-5 | Proven (verbatim) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | every R above | — | — |
| Changed-boundary execution directness | 95% | 98% | API-02 checks the constant against the live publication with independent crypto; IMP-02/03 run the app's own path | — | — |
| Cross-boundary integration realism and mock gap | 95% | 97% | real GitHub releases, real runtime, packaged app (IMP-02/03) | — | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 96% | packaged build of this commit; fixture equals the published bytes | other OS packaging unchanged by this change | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 96% | one-byte change → unverified (unit and API-02); overrides still win (unit) | — | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | IMP-03 screenshots: verified list, install, On, Memory microphone | microphone capture in the packaged app emulated in 516, not re-run (unchanged) | — |
| Durable regression coverage quality and relevance | 95% | 96% | the offline test pins the key to the real signature and keeps a negative case | — | — |

- Overall post-repository confidence: 95%; overall final confidence: 96% (simple average).
- Every critical criterion directly proven: `Yes`. Any category below 90%: `No`. Target met: `Yes`.
- Confidence-limiting residual risks: none material.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` beyond the reused real-chain runs.
- The real changed boundary (the built-in key against the published catalog, the install and dictation through a packaged app) is already exercised by IMP-02 and IMP-03 on this commit; API-02 re-checks the publication now with independent crypto. No browser- or shell-specific code changed.

## Persisted-Data Transition Checks

Not Affected (an existing constant is filled).

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`; observed: `No`; durable coverage for compatibility: `No`.

## Durable Coverage Changed In The Codebase

- This round: `No` (the implementation added the offline test; reviewed as Still Valid).

## Dependencies Mocked Or Emulated

None in API/E2E's cases (live public URLs). The implementation's offline test uses a stub `fetch` over the published bytes by design; API-02 shows those bytes equal the live publication.

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/657-api-downloads`, `/tmp/657-api-scripts` | Yes | `rm -rf` | removed (script copy kept in `probes/api-e2e/`) |
| full clones of `autobyteus-extensions` (temp dirs) | Yes | `rm -rf` | removed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only / accepted risk: None (the founder's own backup of the private key is his to confirm; nothing here needs it).
- Evidence decisions requested: None.
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (Small / Low, direct route; test-code review not required by policy).
- Notes: GitHub's `releases/latest` is `voice-input-v1.0.0`; nodes read the fixed `catalog` tag URL, so it plays no part (as IMP-04 notes).
