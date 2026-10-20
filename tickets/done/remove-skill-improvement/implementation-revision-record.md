# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation baseline and later rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer, ARCH-REV-002 (pass) | N/A | `Initial Baseline` | SR-001..SR-004; ARCH-REV-001..ARCH-REV-002; CRR N/A; API-REV N/A; DR N/A | Feature removed (server, web, docs, tests); migration `20261020_remove_skill_improvement_data` (M1..M6) and settings retirement implemented; ready for code review |
| IR-002 | delivery_engineer, `release-deployment-report.md`, DR-001 (INT-001) | INT-001 | `Local Fix` | SR-004; ARCH-REV-002; CRR-001..CRR-002; API-REV-001; DR-001 | origin/personal @ 3b2c86ca9e merged; three conflicts resolved for Update Notifications; Secret Gate false positive allowlisted; back to code review |

## Revision Entries

### IR-001 — Remove Skill Improvement and delete its data once (initial baseline)

- **Triggering role, report path, and round:** architecture_reviewer, `tickets/in-progress/remove-skill-improvement/design-review-report.md`, ARCH-REV-002 (pass).
- **Triggering finding IDs:** N/A. The review's residual risks R-2..R-4 are addressed in `implementation-handoff.md`.
- **Classification:** `Initial Baseline`.
- **Prior authoritative result:** N/A.
- **Current authoritative result:** implementation complete against SR-004. Checks IMP-01..IMP-13 pass (`evidence/IMP-00-summary.txt`).
- **Related solution revision IDs:** SR-001..SR-004.
- **Related architecture-review revision IDs:** ARCH-REV-001, ARCH-REV-002.
- **Related code-review revision IDs:** N/A.
- **Related API/E2E revision IDs:** N/A.
- **Related delivery revision IDs:** N/A.
- **Why this baseline is recorded:** it is the first implementation handoff.
- **Approved behavior or requirement IDs affected:** BEH-001..BEH-005; REQ-001..REQ-005; AC-001..AC-004. REQ-006 / AC-005 (release notes) are the design's supplement and are unchanged.
- **Implementation delta, in commits on `codex/remove-skill-improvement` from `04aac13a77`:**
  - `1f12b46b8b` server:
    - feature, GraphQL API, built-in improver, settings, grants, `launchPurpose` removed;
    - settings retired;
    - the new migration, with its tests and fixtures;
    - shared tests and docs updated.
  - `fc46a7b5fc` web: the card, CTA, stores, GraphQL documents and types removed; generated types trimmed; i18n, specs, probes and docs updated.
  - `a71e93a7f2` two registry-order tests updated for the new last migration.
  - Plus this handoff commit (documents and evidence).
- **Changed files or areas:** see `implementation-handoff.md`, Key Files Or Areas.
- **Local validation and result:** IMP-01..IMP-13, all passing; see `implementation-handoff.md`, Checks Run.
- **Next recipient or routing:** `/software_engineering_team/code_reviewer` (Large / High).
- **Remaining limitations or risks:** see `implementation-handoff.md`, Known Risks; follow-ups FU-001 (designer), FU-002 (generated GraphQL drift and the web typecheck tooling).

### IR-002 — Merge origin/personal (INT-001) and pass the Secret Gate

- **Triggering role, report path, and round:** delivery_engineer, `tickets/in-progress/remove-skill-improvement/release-deployment-report.md`, DR-001 (latest-base integration refresh blocked by INT-001).
- **Triggering finding IDs:** INT-001.
- **Classification:** `Local Fix`.
- **Prior authoritative result:** IR-001. CRR-001/CRR-002 and API-REV-001 passed; delivery was blocked by merge conflicts with `origin/personal` @ `3b2c86ca9e` (20 commits).
- **Current authoritative result:** merge commit `5cfccd66c7` and Secret Gate allowlist commit `bda3731947`. Classification is unchanged: Large / High.
- **Related solution revision IDs:** SR-004.
- **Related architecture-review revision IDs:** ARCH-REV-002.
- **Related code-review revision IDs:** CRR-001, CRR-002.
- **Related API/E2E revision IDs:** API-REV-001.
- **Related delivery revision IDs:** DR-001.
- **Why this implementation revision is recorded:** the merge resolution changes product code, and a repository config file changed to pass the Secret Gate.
- **Approved behavior or requirement IDs affected:** REQ-001 (no feature code returns). Behavior is unchanged.
- **Implementation delta:**
  - **Conflicts.** Base (settings-update-notifications, `36da7e2e56`) added Update Notifications lines next to the Skill Improvement lines this ticket removes. The resolutions keep base and drop the feature:
    - `autobyteus-server-ts/src/api/graphql/schema.ts`: `UpdateNotificationResolver` kept, `SkillImprovementResolver` not restored;
    - `autobyteus-server-ts/src/services/server-settings-service.ts`: base's `UPDATE_CHECKS_SETTING_KEY` predefined setting kept; the two Skill Improvement settings not restored (their import was already gone);
    - `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue`: `UpdateChecksCard` import kept, the toggle-card import not restored. The template has `UpdateChecksCard` and no Skill Improvement card.
  - **Auto-merged files, checked:**
    - server `docs/modules/README.md`: base's Update Notifications row;
    - web `package.json`: version and base's scripts, alongside API/E2E's `test:e2e:skill-improvement-removal`;
    - `ServerSettingsCompactionFailure.spec.ts`: base's `UpdateChecksCard` stub;
    - web `docs/settings.md`: base's Update checks paragraph. I added one sentence so this ticket's "today that is Applications" agrees with it ("Update checks uses the same store factory with its own card").

    Base adds no app-data migration, so `20261020_remove_skill_improvement_data` is still registered last.
  - **Secret Gate (RELEASE.md).** The first run on the merged state found 2 matches of the broad `generic-api-key` rule in two unpushed API/E2E commits (`d21842c77b` `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs:20`; `4b12567b9a` `api-e2e-coverage-investigation.md:156`). The captured text is the retired setting `ENABLE_SKILL_IMPROVEMENT=true` after the word "keys": a setting name with a boolean, not a credential. The text was identified by its reported entropy (4.142295), never un-redacted. Per RELEASE.md's false-positive rule, `.gitleaks.toml` gains the narrowest entry: that exact text, `generic-api-key` only, with the reason.
  - **Sweep script.** The AC-001 sweep now classifies the API/E2E removal probe (`skill-improvement-removal-cases.mjs`, its registration in `delegated-launch-defaults-probe.mjs`, its `package.json` script) as tests of the removal.
- **Changed files or areas:** the three resolved files, `autobyteus-web/docs/settings.md`, `.gitleaks.toml`.
- **Local validation and result:** all checks pass on `5cfccd66c7` (`evidence/IMP-00-summary.txt`, "integration round"):
  - IMP-14 typecheck;
  - IMP-15 server unit: 6314;
  - IMP-16 integration: 421;
  - IMP-17 build and built-in smoke;
  - IMP-18 startup e2e for the removal migration and the work-trace e2e: 4;
  - IMP-19 web unit: 4617;
  - IMP-20 guards;
  - IMP-21 AC-001 sweep;
  - IMP-22 browser probe SIR-001/SIR-002: 2 Pass.

  IMP-23 Secret Gate passes on `bda3731947` (13 commits scanned).
- **Next recipient or routing:** `/software_engineering_team/code_reviewer`, review of the merge resolution and the `.gitleaks.toml` entry.
- **Remaining limitations or risks:** unchanged from IR-001. Nothing is pushed; the gate passes for the first push.
