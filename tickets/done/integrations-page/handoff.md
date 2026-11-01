# Handoff — autobyteus-337: Integrations page

- From: Solution Designer (run `solution_designer_9a83b5676cdb4488a7e25094626f527c`)
- To: Architecture Reviewer
- Date: 2026-11-01
- Task: `autobyteus-337`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. It depends on autobyteus-311 step 1 (`v1.5.11-beta.4`).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page`, branch `codex/integrations-page`, base `origin/personal` @ `e4bebdc858`. Nothing is committed yet; the ticket documents are untracked in `tickets/in-progress/integrations-page/`.

## What is asked

Re-review of `design-spec.md` at **SR-009**, which addresses ARCH-REV-001 (AR-001…AR-006; see SR-009 in the revision record). Earlier ask: independent architecture review of SR-008. Classification **Large / High**: the access rule of the credential proxy changes, content from user-chosen sources reaches the UI, two named extensions go into `SkillSourceService`, and there is a GraphQL clean cut and a new web page.

## Approval basis

- **Requirements:** approved at SR-006. The user decided DEC-001 (the app keeps the token rule), DEC-002 ("all installed skills" agents get access: it's a normal skill), DEC-011 and DEC-012 (import as a skill source, shown as integrations), import from a link, and local folders too. DEC-013…DEC-016 are the Solution Designer's, with the user informed.
- **The design:** the user approved it on 2026-11-01: "if you think it's reasonable, then I would already approve … if you think all of the things are consistent now, and I would also approve". He was told it is consistent, with DEC-016 added.
- **UI/UX:** r2 is approved, at `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page-r2/ui-ux-spec.md`, with VIS-001…VIS-035 and the first design's VIS-019.

## Points to check especially

1. **The access rule (DS-004):** a full check at run start (effective skills; the resolved skill's `rootPath` is the integration's folder) and a cheap check per call (the definition's scope and names, not disabled, the run's source still registered, the token). Is the per-call form a faithful enough guard for REQ-005, given that the catalog is rebuilt from disk on every lookup?
2. **The `SkillSourceService` extensions:** the `requireIntegrationFolder` import option (checked before publication or registration) and one change observer: `sourceRemoving` before removal, `sourceChanging` before an update's publication. A failed disconnect refuses the removal or update (DEC-015, DEC-016). This covers removal from both pages and automatic updates.
3. **Repository content in the UI:** text only, the icon only as an `<img>` data URL, and a link in `token.help` opens in the system browser.
4. **The GraphQL clean cut:** the GitHub-specific API and the ticks are removed.
5. **Persisted data:** `connections.json` is directly usable (`agentDefinitionIds` ignored). The beta.4 token stays.
6. **AC-008 and AC-009:** these came from the Task comment that moved integrations-1's AC-009 here: the teammate-way live check (list issues and comment, through the page) and the README rewrite in the integrations repository.

## Documents

- `requirements-doc.md`: SR-006, plus the UI section at SR-008
- `investigation-notes.md`
- `design-spec.md`: SR-008
- `solution-revision-record.md`
- The product designs (externally owned): the r2 spec and references above

## Constraints

- The token never appears in a shell, output or log.
- Tests use isolated instances and the test vault.
- DESIGN.md vocabulary applies.
- Don't put "the user has verified" in Done-when.
- No release unless the user asks.
