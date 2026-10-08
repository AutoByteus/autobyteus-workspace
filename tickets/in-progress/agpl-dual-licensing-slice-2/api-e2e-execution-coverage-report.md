# API/E2E Execution Coverage Report — agpl-dual-licensing, Slice 2

> Not legal advice. `CLA.md` and the licence wording need lawyer review (REQ-011).

## Execution Round Meta

- Package (this folder):
  - requirements-doc.md
  - investigation-notes.md
  - solution-revision-record.md
  - design-spec.md
  - solution-handoff.md
  - implementation-handoff.md
  - implementation-revision-record.md
  - api-e2e-coverage-investigation.md
  - api-e2e-revision-record.md
- Design review, architecture review, code review: `N/A — not applicable`
- API/E2E revision `API-REV-001`, round 1. Commit validated: `411bac9c9`. Worktree clean.
- Routing: Medium / Low, direct route → Delivery. Test-code review: `Not Required — direct low-risk route`
- Platform: macOS (Darwin 25.5, arm64), Python 3, pnpm 10.28.2, Docker Desktop, actionlint (Homebrew)

## Evidence Matrix

| Case | AC / REQ | Execution | Result |
| --- | --- | --- | --- |
| C-01 | AC-005 desktop, REQ-007 | Packaged `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (built from this change by the implementation engineer, unsigned/adhoc):<br>• `Contents/Resources/{LICENSE,LICENSING.md,NOTICE}` are `cmp`-identical to `autobyteus-web/LICENSE`, root `LICENSING.md` (incl. the new Contributions section) and `NOTICE`; LICENSE sha256 `0d96a4ff…`.<br>• `PlistBuddy NSHumanReadableCopyright` equals `PRODUCT_COPYRIGHT` exactly.<br>• `git grep` finds no `setAboutPanelOptions`/about-role menu override, so the default macOS About panel shows this string | Pass |
| C-02 | AC-005 desktop, AC-010 | `pnpm -C autobyteus-web test:nuxt` with product-license-packaging, isolated-launch-marker and novnc-package-contract: 3 files, **12/12 passed** (packaged-output assertions active). `npx tsc -p build/tsconfig.json --noEmit` exit 0 | Pass |
| C-03 | AC-005 Docker, REQ-007 | Image `autobyteus-agpl-slice2:monorepo` (released `Dockerfile.monorepo`):<br>• `/app/{LICENSE,LICENSING.md,NOTICE}` sha256 equal the repo files.<br>• Label `org.opencontainers.image.licenses=AGPL-3.0-only`.<br>• `release-server-docker.yml` `build-push-action` passes no `labels:`, so the Dockerfile label is published as is (both default and zh variants use this Dockerfile).<br>• Runtime-stage review of all 4 Dockerfiles: no later COPY overwrites `/app/LICENSE*`, and `.dockerignore` does not exclude the files.<br>• `docker build --check`: no warnings on all 4 | Pass |
| C-04 | AC-005 gateway | `node --check build-runtime-package.mjs` OK. `copyProductLicenseFilesToStage()` runs after deploy and `verifyLicenseFiles()` before archiving; `workspaceRoot` resolves to repo root. A real build is impossible on base (UD-001, confirmed: not in `pnpm-workspace.yaml`, no release workflow since `40f769e0d`) | Pass (review-level; not shipped) |
| C-05 | AC-009, REQ-010 | `python3 scripts/check_licensing.py` → `Licensing is consistent.` (6395 files), exit 0, both on the worktree and on a fresh `git clone` at `411bac9c9` (CI-equivalent). `test_check_licensing.py` **12/12**. Probe: in a temp clone I made 5 deliberate violations (modified AGPL LICENSE; new package.json with no licence; `MIT` licence; Apache component removed from LICENSING.md; Apache sentence in the server README). Exit 1, and all 5 were reported in grouped messages that say what to fix | Pass |
| C-06 | AC-009 gate placement | All 4 workflows run the gate immediately after checking out the **release ref** in the job that precedes the build (desktop/android/ios `prepare-release`, server-docker `build-and-push`). The iOS placement after "Checkout release ref" (IMPL-NOTE-001) is correct; the earlier checkout is of the default ref. `actionlint` exit 0 on all 4 | Pass |
| C-07 | AC-007, REQ-008 | Content review: `CLA.md` §1–10 match the spec (holder Yu Zheng (AutoByteus); copyright + patent licence with right to relicense incl. commercial; defensive termination; exact acceptance sentence; lawyer note; no "Apache"). `CONTRIBUTING.md` links the CLA without copying terms; owner/agents exempt. PR template matches spec verbatim. LICENSING.md/README pointers present. Manual acceptance per SR-004, so there is no bot to exercise | Pass |
| C-08 | AC-010, REQ-012 | `test_release_channel_workflow_steps` 13/13, `test_docker_build_context_sources` 2/2, `check_repository_artifact_hygiene.py` exit 0, `ios-release-contract-check.py` passed | Pass |
| C-09 | AC-011 | Not-legal-advice / lawyer-review notes present in CLA.md, LICENSING.md and all ticket results | Pass |

## Validation Confidence Scorecard

| Category | Score | Basis / Residual |
| --- | --- | --- |
| Requirement and AC proof | 95% | AC-005 is proven on the real desktop app and the released image; AC-007/009/010/011 are proven directly. The gateway and the allinone/remote-server runtime stages are review-level only, because those artifacts are unbuildable or not shipped on base (UD-001/002). Their edits are identical to the proven monorepo edit |
| Changed-boundary directness | 95% | Real packaged artifacts and the real checker, with no mocks |
| Integration realism / mock gap | 95% | The gate ran on a CI-equivalent fresh clone; workflows are actionlint-clean. It has not run on GitHub runners, which needs a release (forbidden in this ticket) |
| Environment / fixture fidelity | 95% | The local build is unsigned. Signing/notarization is unexercised, but the files sit in `Contents/Resources` through the same `extraResources` path as the already-signed noVNC notice |
| Failure / edge cases | 95% | Deliberate-violation probe (5 rules), preflight existence checks, label override check, overwrite/.dockerignore check |
| User surface / desktop shell | 95% | `Info.plist` copyright verified and no About-panel override in code. The About window was not opened (optional per design). Windows `LegalCopyright` was not built here; it uses the same key |
| Durable regression coverage | 95% | 12 checker unittests, packaging integration test with packaged-output assertions, and the release gate itself |

- Overall: **95%** (simple average). No category is below 90%, every critical AC is proven directly, and the target is met.
- Broader validation: **Not Required**. Real artifacts were inspected directly. The remaining items need a real release, which this ticket forbids.

## Durable Coverage Changed By API/E2E

- None. The implementation-added tests (`scripts/tests/test_check_licensing.py`, `autobyteus-web/tests/integration/product-license-packaging.integration.test.ts`) were executed and judged adequate.

## Compatibility / Persisted Data

- No compatibility mechanism or legacy retention. Persisted data: `Not Affected`.

## Upstream Notes (pre-existing, not failures of this change)

- **UD-001:** the gateway is no longer in the workspace and has had no release workflow since `40f769e0d`. REQ-007 still lists the gateway runtime package and image as shipped. The Solution Designer may want to reconcile REQ-007.
- **UD-002:** `docker/Dockerfile.remote-server` and `docker/Dockerfile.allinone` do not copy `agent-presentation-contracts`/`collaboration-stream-contracts`, which the server depends on, so their builder stage fails on base. Confirmed by grep (0 references vs 12 in `Dockerfile.monorepo`). Needs a follow-up ticket.

## Cleanup

- The temp clone and logs under `/tmp/agpl-s2-val` were removed. Reused artifacts (`electron-dist/`, image `autobyteus-agpl-slice2:monorepo`) belong to the implementation run and were left for delivery; no tracked file was modified.

## Residual Risks For Delivery

- The first signed release proves signing/notarization, Windows `LegalCopyright` and the gate on GitHub runners. **Do not cut a release in this ticket.**
- UD-001/UD-002 follow-ups. Lawyer review of CLA and licence wording (REQ-011).

## Latest Authoritative Result

- Result: **Pass**. Final confidence 95%, target met, no category below 90%. Broader validation: Not Required.
- Next recipient: per `get_handoff_rules`
