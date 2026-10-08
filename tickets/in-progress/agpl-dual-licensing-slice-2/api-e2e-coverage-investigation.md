# API/E2E Coverage Investigation — agpl-dual-licensing, Slice 2

> Not legal advice. `CLA.md` and the licence wording need lawyer review (REQ-011).

## Investigation Meta

- Package (this folder):
  - requirements-doc.md
  - investigation-notes.md
  - solution-revision-record.md (SR-007)
  - design-spec.md
  - solution-handoff.md
  - implementation-handoff.md
  - implementation-revision-record.md (IR-001)
- Design review, architecture review, code review: `N/A — not applicable` (direct route)
- Round 1 (initial), triggered by implementation_engineer IR-001, commit `411bac9c9` (handoff `5da3e72ce`)
- Ledger: not used. The cases are few, short and independent, with no long-running work.

## Routing Classification

- Medium / Low, direct low-risk route. On success, route to Delivery.
- Test-code review: `Not Required — direct low-risk route`

## Basis And Changed Surface

| Surface | Affected | Changed boundary | Evidence plan |
| --- | --- | --- | --- |
| Desktop packaging (electron-builder) | Yes | `copyright` → Info.plist; 3 extraResources; preflight | Packaged app inspection plus the integration test with packaged-output assertions |
| Docker runtime images | Yes | `COPY LICENSE LICENSING.md NOTICE /app/` + OCI label in 4 Dockerfiles | Built released `Dockerfile.monorepo` image: files, hashes, label. Check that the release workflow does not override labels. `docker build --check` on all 4 |
| Gateway runtime package | Yes (not shipped, UD-001) | Stage copy + verification | Review + `node --check`. A build is impossible on base |
| Release CI gate | Yes | `check_licensing.py` step after the release-ref checkout in 4 workflows | Checker on tree and on a fresh clone, unittests, deliberate-violation probe, placement review, actionlint |
| Contribution docs | Yes | CLA, CONTRIBUTING, PR template, pointers | Content review against spec |
| Backend/API/UI renderer/persisted data | No | — | — (persisted data `Not Affected`) |

- Scenarios: SCN-005 (recipient inspects binary), SCN-006 (outside contributor PR), and SCN-001 via the gate (no drift reintroducing Apache claims).
- Testing guideline: `TESTING.md` (root). Layers used: the web integration test (`test:nuxt`), the repo Python unittests (`scripts/tests`), the iOS release contract check, and direct artifact inspection. An isolated desktop instance is not needed: the About string is the `Info.plist` value, and the app sets no `setAboutPanelOptions`/custom about menu (git grep).

## Existing Durable Coverage

| Path | Decision |
| --- | --- |
| `scripts/tests/test_release_channel_workflow_steps.py`, `test_docker_build_context_sources.py`, `autobyteus-ios/scripts/ios-release-contract-check.py`, `check_repository_artifact_hygiene.py` | Still Valid (regression for touched workflows/Dockerfiles) |
| `autobyteus-web/tests/integration/{novnc-package-contract,isolated-launch-marker}.integration.test.ts` | Still Valid (sibling packaging) |
| New: `scripts/tests/test_check_licensing.py`, `autobyteus-web/tests/integration/product-license-packaging.integration.test.ts` | Implementation-added; assessed adequate (12 checker cases; packaged-output assertions) |

## Coverage Decision

- Durable coverage added/updated/removed by API/E2E: **None**. The implementation-added tests already cover the durable regression need. Extra probes are temporary only.

## Decisions

- Post-repository confidence 95%. Broader validation: `Not Required`. The real artifacts (packaged app, built image) were inspected directly.
- Remaining items that only a real release can prove, which this ticket forbids: signed/notarized build, Windows `LegalCopyright`, the gate running on GitHub runners. All use standard mechanisms already used by shipped resources (noVNC notice), so they are recorded as residual, not as blockers.
- UD-001/UD-002 are pre-existing, outside this change, and not caused by it. They are carried forward to Delivery and the Solution Designer and are not counted as failures.
