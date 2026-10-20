# Handoff Summary — dependency-security-and-unused-cleanup

## Ticket

- Package: `dependency-security-and-unused-cleanup`; Project Task `autobyteus-229`
- Classification: `task_size=Medium`, `architectural_risk=High`; route: reviewed (architecture review, source review, API/E2E, test-code review)
- Revisions: SR-001…SR-005 (DEC-001…DEC-008); ARCH-REV-005 Pass; IR-003; CRR-001 Pass (no findings); API-REV-001 Pass (95.0%); CRR-002 Not Applicable (no durable test changed during API/E2E); DR-001
- Archived ticket folder: `tickets/done/dependency-security-and-unused-cleanup/` on `personal`

## What Changed

- **Security updates (manifests and lockfile, no override mechanism):**
  - `autobyteus-web`: `electron` 42.4.1 → 42.11.16 (exact); `tar` `^7.5.22`.
  - `autobyteus-ts`: `undici` `^7.30.1`.
  - `axios` `^1.20.0` (web, `autobyteus-ts`); `markdown-it` 14.3.3.
  - Every in-range transitive or parent update, including `protobufjs`, `mermaid` 11.17.2, `electron-updater` 6.8.9, `nuxt` 3.21.11, `postcss`, `ws` and `vitest`.
  - `pnpm dedupe --check` now exits 0 (base: exit 1).
- **17 unused dependencies removed:**
  - web: `chart.js`, `vue-chartjs`, `diff-match-patch`, `html2canvas`, `jsonrepair`, `markdown-it-katex`, `markdown-it-prism`, and the devDependencies `nuxt-electron`, `@vitejs/plugin-vue`, `concurrently`, `xmldom`;
  - `autobyteus-ts`: `dotenv`, `ts-node`;
  - `@types/node` in the frontend SDK and the 3 contract packages.
  - The doubtful `@nuxtjs/apollo` and `monaco-editor` are kept and reported (REQ-004).
- **DEC-007:** a one-line, type-only adaptation for axios 1.20.0 in `autobyteus-ts/src/tools/multimedia/download-media-tool.ts` (`String(contentType).split(';')`), with 2 new tests.
- **DEC-008:** `dompurify` held exactly at 3.4.7. 3.4.8+ breaks headings under happy-dom, the web test DOM. The advisories still open at 3.4.7 are moderate or low and need APIs our only call doesn't use (FU-009).
- **Still open, as explained in the findings table:** the Fastify 4 chain via `mercurius` (FU-001, urgent) and `xlsx` (FU-002, urgent, no npm fix).
- **Docs (delivery):**
  - `autobyteus-web/docs/electron_packaging.md`: the Electron baseline.
  - `autobyteus-web/docs/content_rendering.md`: the DOMPurify pin and its reason.

## Integration

- `origin/personal` had moved from `3b2c86ca9e` to `3b9014215e`. That includes autobyteus-205 (Skill Improvement removal: 93 server files, 49 web files) and the `v1.5.8-beta.4` release commit.
- Integration method: `git merge --no-ff origin/personal` → `1c0a0e4355`. It merged without conflicts; `autobyteus-web/package.json` changed on both sides, in separate hunks. The base did not change the lockfile.
- The base then moved to `f11773d62c` (2 commits of another ticket's delivery docs), merged as `aaa5c4d1b1`.
- Post-integration checks on `1c0a0e4355`; details in `release-deployment-report.md`:
  - DEL-01: frozen install up to date; `dedupe --check` exit 0.
  - DEL-02: import providers identical to the base record, including autobyteus-205's new code.
  - DEL-03: every build passes. The full suites hit 5 load timeouts at 5 s: 1 server, 4 web.
  - DEL-05: all 5 pass alone 3/3. On the base (`tar` 7.5.9) the same cases take about the same time, and the timed-out AGY case has no changed dependency on its path.
  - DEL-04: a fresh audit gives the same explained set, with no new advisory.

## Verification

- Judged from the evidence: sufficient; no user check needed. Details are in `release-deployment-report.md`.

## Release

- `No release` in this delivery. The Task makes a beta the user's decision ("A beta is the user's decision; recommend one in the report").
- Recommendation: **a beta is warranted**. The change fixes security issues in code that ships and runs: the Electron runtime (5 high advisories), `tar` (voice-input extraction), `undici` (local model connections), `axios` (media downloads) and `protobufjs`. A beta puts those fixes in front of beta-channel users before the next stable.
- Curated notes for a later stable release: `release-notes.md`.

## Residual Risks And Follow-ups

- Packaged Linux and Windows desktop builds were not run locally; CI runs them at release.
- Pre-existing test defects seen during validation: FU-011 (server timing test under load), FU-012 (LM Studio test cases that return early), FU-013 (packaged harness scripts' default build step fails on macOS). FU-008 and FU-010 did not recur.
- Open for the Solution Designer, not blocking:
  - TESTING.md Rule 9 conflicts with this ticket's Non-Goals (CRR-001).
  - API-21: setting the `#/chat?id=` hash directly did not open a run, while a sidebar click did. No follow-up was recorded; the route code is unchanged by this ticket.
- Follow-ups FU-001…FU-014 are in `follow-ups.md`. FU-014 (stale `npx ts-node` build commands in `electron_packaging.md`) was added by delivery. The Solution Designer sends them.
